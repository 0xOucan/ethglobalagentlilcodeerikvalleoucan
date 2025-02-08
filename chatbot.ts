import {
  AgentKit,
  CdpWalletProvider,
  wethActionProvider,
  walletActionProvider,
  erc20ActionProvider,
  cdpApiActionProvider,
  cdpWalletActionProvider,
  pythActionProvider,
} from "@coinbase/agentkit";

import { aaveProtocolActionProvider } from "./src/action-providers/Aave";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as readline from "readline";
import TelegramBot from 'node-telegram-bot-api';

dotenv.config();
/**
 * Validates that required environment variables are set
 *
 * @throws {Error} - If required environment variables are missing
 * @returns {void}
 */
function validateEnvironment(): void {
  const missingVars: string[] = [];

  // Check required variables
  const requiredVars = ["OPENAI_API_KEY", "CDP_API_KEY_NAME", "CDP_API_KEY_PRIVATE_KEY", "TELEGRAM_BOT_TOKEN"];
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  // Exit if any required variables are missing
  if (missingVars.length > 0) {
    console.error("Error: Required environment variables are not set");
    missingVars.forEach(varName => {
      console.error(`${varName}=your_${varName.toLowerCase()}_here`);
    });
    process.exit(1);
  }

  // Warn about optional NETWORK_ID
  if (!process.env.NETWORK_ID) {
    console.warn("Warning: NETWORK_ID not set, defaulting to base-sepolia testnet");
  }
}

// Add this right after imports and before any other code
validateEnvironment();

// Configure a file to persist the agent's CDP MPC Wallet Data
const WALLET_DATA_FILE = "wallet_data.txt";

// Add logging utility
function log(type: 'DEBUG' | 'INFO' | 'ERROR' | 'RESPONSE' | 'TOOL', message: string) {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] [${type}] ${message}`);
}

/**
 * Initialize the agent with CDP Agentkit
 *
 * @returns Agent executor and config
 */
async function initializeAgent() {
  try {
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
    });

    let walletDataStr: string | null = null;
    if (fs.existsSync(WALLET_DATA_FILE)) {
      try {
        walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
      } catch (error) {
        console.error("Error reading wallet data:", error);
      }
    }

    const config = {
      apiKeyName: process.env.CDP_API_KEY_NAME,
      apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      cdpWalletData: walletDataStr || undefined,
      networkId: process.env.NETWORK_ID || "base-sepolia",
    };

    const walletProvider = await CdpWalletProvider.configureWithWallet(config);

    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders: [
        wethActionProvider(),
        pythActionProvider(),
        walletActionProvider(),
        erc20ActionProvider(),
        aaveProtocolActionProvider(),
        cdpApiActionProvider(config),
        cdpWalletActionProvider(config),
      ],
    });

    const tools = await getLangChainTools(agentkit);
    const memory = new MemorySaver();

    const messageModifier = `
      You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit. 
      You can perform various operations including:
      - Checking wallet balances and details
      - Requesting funds from faucet on base-sepolia
      - Wrapping and unwrapping ETH
      - Interacting with Aave protocol (supply and withdraw assets)
      
      When displaying numbers:
      - Convert hex values to decimal
      - Show ETH/WETH amounts in a readable format (e.g., 0.1 ETH instead of 100000000000000000)
      - Show USDC amounts with 6 decimal places
      
      You understand natural language commands like:
      - "Show my wallet balance"
      - "Can you get some test funds?"
      - "I want to wrap 0.1 ETH"
      - "Supply 0.1 WETH to Aave"
      - "Withdraw my USDC from Aave"
      
      If there is a 5XX error, ask the user to try again later. Be concise and helpful.
      For unsupported operations, direct users to docs.cdp.coinbase.com.
    `;

    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier,
    });

    const exportedWallet = await walletProvider.exportWallet();
    fs.writeFileSync(WALLET_DATA_FILE, JSON.stringify(exportedWallet));

    return { agent, config: { configurable: { thread_id: "CDP AgentKit Chatbot!" } } };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}

/**
 * Run the agent autonomously with specified intervals
 */
async function runAutonomousMode(agent: any, config: any, interval = 10) {
  console.log("Starting autonomous mode...");

  while (true) {
    try {
      const thought =
        "Be creative and do something interesting on the blockchain. " +
        "Choose an action or set of actions and execute it that highlights your abilities.";

      const stream = await agent.stream({ messages: [new HumanMessage(thought)] }, config);

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
        console.log("-------------------");
      }

      await new Promise(resolve => setTimeout(resolve, interval * 1000));
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error:", error.message);
      }
      process.exit(1);
    }
  }
}

async function chooseMode(): Promise<"chat" | "auto" | "telegram" | "exit"> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.clear();
  console.log("\nAvailable modes:");
  console.log("1. chat    - Interactive chat mode");
  console.log("2. telegram - Telegram interface mode");
  console.log("3. auto    - Autonomous mode (disabled)");
  console.log("\nType 'kill' at any time to terminate the application");

  const answer = await new Promise<string>(resolve => 
    rl.question("\nChoose a mode (1/2/3): ", resolve)
  );
  rl.close();

  const choice = answer.toLowerCase().trim();
  if (choice === 'kill') {
    console.log('Terminating application...');
    process.exit(0);
  }

  switch(choice) {
    case "1":
    case "chat": return "chat";
    case "2":
    case "telegram": return "telegram";
    case "3":
    case "auto": return "auto";
    default: return "exit";
  }
}

async function runChatMode(agent: any, config: any) {
  log('INFO', "Starting chat mode... Type 'exit' to return to menu, 'kill' to terminate application.");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    while (true) {
      const userInput = await new Promise<string>(resolve => 
        rl.question("> ", resolve)
      );

      if (!userInput.trim()) {
        continue;
      }

      if (userInput.toLowerCase() === "kill") {
        log('INFO', "Terminating application...");
        process.exit(0);
      }

      if (userInput.toLowerCase() === "exit") {
        log('INFO', "Returning to menu...");
        break;
      }

      log('DEBUG', `Processing user input: ${userInput}`);

      try {
        // Format the input to handle hex addresses properly
        const formattedInput = userInput.replace(/0x[a-fA-F0-9]+/g, (match: string) => {
          try {
            // Don't convert if it looks like an address (40 chars after 0x)
            if (match.length === 42) return match;
            return BigInt(match).toString();
          } catch {
            return match;
          }
        });

        log('DEBUG', `Sending formatted input to agent: ${formattedInput}`);

        const stream = await agent.stream(
          { messages: [new HumanMessage(formattedInput)] },
          config
        );

        for await (const chunk of stream) {
          if ("agent" in chunk) {
            const content = chunk.agent?.messages?.[0]?.content;
            if (content) {
              // Format response but preserve addresses
              const formattedContent = content.replace(/0x[a-fA-F0-9]+/g, (match: string) => {
                try {
                  if (match.length === 42) return match;
                  return BigInt(match).toString();
                } catch {
                  return match;
                }
              });
              log('RESPONSE', formattedContent);
            }
          } else if ("tools" in chunk) {
            const content = chunk.tools?.messages?.[0]?.content;
            if (content) {
              // Format tool response but preserve addresses
              const formattedContent = content.replace(/0x[a-fA-F0-9]+/g, (match: string) => {
                try {
                  if (match.length === 42) return match;
                  return BigInt(match).toString();
                } catch {
                  return match;
                }
              });
              log('TOOL', formattedContent);
            }
          }
          console.log("-------------------");
        }
      } catch (error) {
        log('ERROR', `Failed to process message: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
          log('DEBUG', `Stack trace: ${error.stack}`);
        }
      }
    }
  } catch (error) {
    log('ERROR', `Fatal error in chat mode: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      log('DEBUG', `Stack trace: ${error.stack}`);
    }
  } finally {
    rl.close();
  }
}

interface TelegramIntegration {
  bot: TelegramBot;
  sendMessage(text: string, chatId: number): Promise<void>;
  waitForExit(): Promise<void>;
}

class TelegramBotImplementation implements TelegramIntegration {
  bot: TelegramBot;
  private exitPromise: Promise<void>;
  private exitResolve: (() => void) | null = null;
  private agent: any;
  private agentConfig: any;
  private messageCache: Set<string> = new Set();
  private startTime: number;
  private agentContext: any = {};

  constructor(token: string, agent: any, agentConfig: any) {
    this.bot = new TelegramBot(token, { polling: true });
    this.agent = agent;
    this.agentConfig = agentConfig;
    this.startTime = Date.now();
    this.exitPromise = new Promise((resolve) => {
      this.exitResolve = resolve;
    });

    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      if (msg.date * 1000 < this.startTime) {
        return;
      }
      if (msg.text) {
        // Log incoming Telegram message to terminal
        console.log(`\n[TELEGRAM INPUT] ${msg.from?.username || 'User'}: ${msg.text}`);
        await this.handleMessage(msg.text, chatId);
      }
    });

    console.log('\nTelegram bot is ready! Send /start in your Telegram chat.');
    console.log('Use /exit to return to terminal mode or /kill to terminate the app.\n');
  }

  async sendMessage(text: string, chatId: number): Promise<void> {
    if (!text.trim()) return;
    const key = text;
    if (!this.messageCache.has(key)) {
      this.messageCache.add(key);
      
      // Log outgoing Telegram message to terminal
      console.log(`[TELEGRAM OUTPUT]: ${text}\n`);
      
      await this.bot.sendMessage(chatId, text);
      setTimeout(() => this.messageCache.delete(key), 100);
    }
  }

  private async handleMessage(text: string, chatId: number) {
    try {
      if (!text.trim()) return;

      switch (text) {
        case '/start':
          await this.sendMessage('Welcome! I am your CDP AgentKit bot.\n\n' +
            'Available commands:\n' +
            '/exit - Return to terminal mode\n' +
            '/kill - Terminate the application\n' +
            'Send your message and I\'ll help you.',
            chatId
          );
          break;

        case '/exit':
          await this.sendMessage('Returning to menu...', chatId);
          await this.stop();
          break;

        case '/kill':
          await this.sendMessage('Terminating application. Goodbye!', chatId);
          process.exit(0);
          break;

        default:
          try {
            // Create a new context for each chat if it doesn't exist
            if (!this.agentContext[chatId]) {
              this.agentContext[chatId] = {
                messages: []
              };
            }

            // Add the new message to the context
            this.agentContext[chatId].messages.push(new HumanMessage(text));

            const stream = await this.agent.stream(
              { messages: this.agentContext[chatId].messages },
              {
                ...this.agentConfig,
                context: this.agentContext[chatId]
              }
            );
            
            let toolResponses: string[] = [];
            let agentResponse = '';
            
            for await (const chunk of stream) {
              if ("agent" in chunk && chunk.agent?.messages?.[0]?.content) {
                agentResponse = chunk.agent.messages[0].content;
              }
              if ("tools" in chunk && chunk.tools?.messages?.[0]?.content) {
                const toolMsg = chunk.tools.messages[0].content;
                if (toolMsg.trim()) {
                  toolResponses.push(toolMsg);
                }
              }
            }

            // Send tool responses first
            for (const toolMsg of toolResponses) {
              await this.sendMessage(toolMsg, chatId);
            }

            // Send agent response last
            if (agentResponse.trim()) {
              await this.sendMessage(agentResponse, chatId);
              // Add the agent's response to the context
              this.agentContext[chatId].messages.push(new HumanMessage(agentResponse));
            }

          } catch (error) {
            console.error('Stream error:', error);
            await this.sendMessage('An error occurred while processing your message.', chatId);
          }
      }
    } catch (error) {
      console.error('Handler error:', error);
      await this.sendMessage('An error occurred while processing your message.', chatId);
    }
  }

  async stop(): Promise<void> {
    try {
      await this.bot.stopPolling();
      if (this.exitResolve) {
        this.exitResolve();
      }
    } catch (error) {
      console.error('Error stopping bot:', error);
    }
  }

  async waitForExit(): Promise<void> {
    return this.exitPromise;
  }
}

let telegramBot: TelegramIntegration | null = null;

// Start the application
if (require.main === module) {
  console.log("Starting Agent...");
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

async function main() {
  try {
    const { agent, config } = await initializeAgent();
    
    while (true) {
      const mode = await chooseMode();
      
      switch(mode) {
        case "chat":
          await runChatMode(agent, config);
          break;
        case "telegram":
          if (!process.env.TELEGRAM_BOT_TOKEN) {
            console.error("Error: TELEGRAM_BOT_TOKEN is not set");
            await new Promise(resolve => setTimeout(resolve, 2000));
            break;
          }
          // Initialize and run Telegram bot
          telegramBot = new TelegramBotImplementation(
            process.env.TELEGRAM_BOT_TOKEN,
            agent,
            config
          );
          await telegramBot.waitForExit();
          break;
        case "auto":
          console.log("Autonomous mode is currently disabled.");
          await new Promise(resolve => setTimeout(resolve, 2000));
          break;
        case "exit":
          console.log("Invalid choice. Please try again.");
          await new Promise(resolve => setTimeout(resolve, 2000));
          break;
      }
    }
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}
