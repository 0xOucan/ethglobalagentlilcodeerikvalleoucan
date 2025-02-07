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

import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as readline from "readline";
import { createTelegramBot } from "./src/telegram/telegramIntegrations";
import TelegramBot from 'node-telegram-bot-api';
import { aaveProtocolActionProvider } from "@coinbase/agentkit";

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
  const requiredVars = ["OPENAI_API_KEY", "CDP_API_KEY_NAME", "CDP_API_KEY_PRIVATE_KEY"];
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

/**
 * Initialize the agent with CDP Agentkit
 *
 * @returns Agent executor and config
 */
async function initializeAgent() {
  try {
    // Initialize LLM
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
    });

    let walletDataStr: string | null = null;

    // Read existing wallet data if available
    if (fs.existsSync(WALLET_DATA_FILE)) {
      try {
        walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
      } catch (error) {
        console.error("Error reading wallet data:", error);
        // Continue without wallet data
      }
    }

    // Configure CDP Wallet Provider
    const config = {
      apiKeyName: process.env.CDP_API_KEY_NAME,
      apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      cdpWalletData: walletDataStr || undefined,
      networkId: process.env.NETWORK_ID || "base-sepolia",
    };

    const walletProvider = await CdpWalletProvider.configureWithWallet(config);

    // Initialize AgentKit
    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders: [
        wethActionProvider(),
        pythActionProvider(),
        walletActionProvider(),
        erc20ActionProvider(),
        cdpApiActionProvider({
          apiKeyName: process.env.CDP_API_KEY_NAME,
          apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
        cdpWalletActionProvider({
          apiKeyName: process.env.CDP_API_KEY_NAME,
          apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
        aaveProtocolActionProvider(),
      ],
    });

    const tools = await getLangChainTools(agentkit);

    // Store buffered conversation history in memory
    const memory = new MemorySaver();
    const agentConfig = { configurable: { thread_id: "CDP AgentKit Chatbot Example!" } };

    // Create React Agent using the LLM and CDP AgentKit tools
    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier: `
        You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit. You are 
        empowered to interact onchain using your tools. If you ever need funds, you can request them from the 
        faucet if you are on network ID 'base-sepolia'. If not, you can provide your wallet details and request 
        funds from the user. Before executing your first action, get the wallet details to see what network 
        you're on. If there is a 5XX (internal) HTTP error code, ask the user to try again later. If someone 
        asks you to do something you can't do with your currently available tools, you must say so, and 
        encourage them to implement it themselves using the CDP SDK + Agentkit, recommend they go to 
        docs.cdp.coinbase.com for more information. Be concise and helpful with your responses. Refrain from 
        restating your tools' descriptions unless it is explicitly requested.
        `,
    });

    // Save wallet data
    const exportedWallet = await walletProvider.exportWallet();
    fs.writeFileSync(WALLET_DATA_FILE, JSON.stringify(exportedWallet));

    return { agent, config: agentConfig };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error; // Re-throw to be handled by caller
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

/**
 * Main entry point
 */
async function main() {
  let isRunning = true;
  
  try {
    const { agent, config } = await initializeAgent();
    
    while (isRunning) {
      console.clear();
      console.log("\nAvailable modes:");
      console.log("1. chat      - Terminal chat mode");
      console.log("2. telegram  - Telegram interface mode");
      console.log("3. auto      - Autonomous mode (not implemented yet)");
      
      const choice = await new Promise<string>((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        
        const handleChoice = (answer: string) => {
          rl.removeListener('line', handleChoice);
          rl.close();
          resolve(answer);
        };

        rl.question("\nChoose a mode (1/2/3): ", handleChoice);
      });
      
      switch(choice) {
        case "1":
          await runChatMode(agent, config);
          break;
        
        case "2":
          if (!process.env.TELEGRAM_BOT_TOKEN) {
            console.error("Error: TELEGRAM_BOT_TOKEN is not set in environment variables");
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          try {
            console.log("\nStarting Telegram mode...");
            telegramBot = new TelegramBotImplementation(process.env.TELEGRAM_BOT_TOKEN, agent, config);
            
            // Wait for bot to exit
            await telegramBot.waitForExit();
            console.log("\nReturning to menu...");
          } catch (error) {
            console.error('Failed to start Telegram mode:', error);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          break;
        
        case "3":
          console.log("Autonomous mode is not implemented yet.");
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        
        default:
          console.log("Invalid choice. Please try again.");
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
      }
    }
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

/**
 * Run the agent interactively based on user input
 */
async function runChatMode(agent: any, config: any) {
  let rl: readline.Interface | null = null;
  
  try {
    // Create readline interface
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> '
    });

    // Store the message handler function
    const handleMessage = async (input: string) => {
      const trimmedInput = input.trim().toLowerCase();
      
      if (!trimmedInput) {
        rl?.prompt();
        return;
      }

      // Handle commands first
      switch(trimmedInput) {
        case 'exit':
          console.log('Returning to menu...');
          if (rl) {
            rl.removeListener('line', handleMessage);
            rl.close();
          }
          return;
        
        case 'kill':
          console.log('Terminating application...');
          process.exit(0);
          return;
          
        default:
          // Only process with agent if it's not a command
          try {
            const stream = await agent.stream({ messages: [new HumanMessage(input)] }, config);
            let fullResponse = '';
            for await (const chunk of stream) {
              if ("agent" in chunk) {
                fullResponse = chunk.agent.messages[0].content;
              } else if ("tools" in chunk) {
                console.log(chunk.tools.messages[0].content);
              }
            }
            // Print the complete response at once
            if (fullResponse) {
              console.log(fullResponse);
            }
          } catch (error) {
            console.error("Error processing message:", error);
          }
      }
      
      rl?.prompt();
    };

    // Print welcome message once
    console.clear();
    console.log("\nTerminal chat mode started. Type 'exit' to return to menu, 'kill' to terminate application.");
    rl.prompt();

    // Add single listener
    rl.removeAllListeners('line');
    rl.on('line', handleMessage);

    // Handle cleanup
    await new Promise<void>((resolve) => {
      rl?.once('close', () => {
        rl?.removeListener('line', handleMessage);
        resolve();
      });
    });

  } catch (error) {
    console.error("Error:", error);
    if (rl) {
      rl.close();
    }
    process.exit(1);
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
    console.log('Use /exit to return to menu or /kill to terminate the app.\n');
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
            
            let toolResponses = [];
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
              this.agentContext[chatId].messages.push(new AIMessage(agentResponse));
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
