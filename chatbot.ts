import {
  AgentKit,
  CdpWalletProvider,
  wethActionProvider,
  walletActionProvider,
  erc20ActionProvider,
  cdpApiActionProvider,
  cdpWalletActionProvider,
  pythActionProvider,
  EvmWalletProvider,
} from "@coinbase/agentkit";

import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as readline from "readline";
import TelegramBot from 'node-telegram-bot-api';
import { formatUnits } from "viem";
import type { Address } from "viem";
import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { SecretVaultApiClient } from "./src/SecretVaultAPI/apiClient";
import { createSecretVaultConfig } from "./src/SecretVaultAPI/config";
import { 
  Store, 
  Inventory, 
  StoreSchema, 
  InventorySchema 
} from "./src/SecretVaultAPI";

dotenv.config();
/**
 * Validates that required environment variables are set
 *
 * @throws {Error} - If required environment variables are missing
 * @returns {void}
 */
function validateEnvironment(): void {
  const missingVars: string[] = [];
  const requiredVars = [
    {
      name: "OPENAI_API_KEY",
      description: "OpenAI API key for the language model"
    },
    {
      name: "CDP_API_KEY_NAME",
      description: "Coinbase Developer Platform API key name"
    },
    {
      name: "CDP_API_KEY_PRIVATE_KEY",
      description: "Coinbase Developer Platform private key (PEM format)"
    },
    {
      name: "TELEGRAM_BOT_TOKEN",
      description: "Telegram bot token (optional for chat mode)"
    }
  ];

  requiredVars.forEach(({ name, description }) => {
    if (!process.env[name]) {
      missingVars.push(`${name} - ${description}`);
    }
  });

  if (missingVars.length > 0) {
    console.error("Error: Required environment variables are not set");
    console.error("\nMissing variables:");
    missingVars.forEach(variable => {
      console.error(`- ${variable}`);
    });
    console.error("\nPlease add these to your .env file:");
    missingVars.forEach(variable => {
      const name = variable.split(" - ")[0];
      console.error(`${name}=your_${name.toLowerCase()}_here`);
    });
    process.exit(1);
  }

  if (!process.env.NETWORK_ID) {
    console.warn("Warning: NETWORK_ID not set, defaulting to base-sepolia testnet");
  }
}

// Add this right after imports and before any other code
validateEnvironment();

// Configure a file to persist the agent's CDP MPC Wallet Data
const WALLET_DATA_FILE = "wallet_data.txt";

// Add more detailed logging
function log(type: 'DEBUG' | 'INFO' | 'ERROR' | 'RESPONSE' | 'TOOL', message: string) {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] [${type}] ${message}`);
}

// Store Management Tool
class StoreManagementTool extends StructuredTool {
  name = "manage_store";
  description = "Manage store records (create and view stores)";
  schema = z.object({
    action: z.enum(["create", "view"]),
    storeName: z.string().optional(),
    location: z.string().optional(),
    ownerName: z.string().optional(),
    contactInfo: z.string().optional()
  });

  private client: SecretVaultApiClient;

  constructor(client: SecretVaultApiClient) {
    super();
    this.client = client;
  }

  async _call(args: any): Promise<string> {
    try {
      if (args.action === "create") {
        if (!args.storeName || !args.location || !args.ownerName || !args.contactInfo) {
          return "Please provide all required store information: name, location, owner name, and contact info";
        }

        const store = await this.client.createStore(
          args.storeName,
          args.location,
          args.ownerName,
          args.contactInfo
        );
        return `Store created successfully: ${JSON.stringify(store)}`;
      }

      if (args.action === "view") {
        const stores = await this.client.getStores();
        return `Current stores: ${JSON.stringify(stores)}`;
      }

      return "Invalid action. Use 'create' or 'view'";
    } catch (error: any) {
      return `Store operation failed: ${error.message}`;
    }
  }
}

// Inventory Management Tool
class InventoryManagementTool extends StructuredTool {
  name = "manage_inventory";
  description = "Manage store inventory (add and view products)";
  schema = z.object({
    action: z.enum(["add", "view"]),
    storeId: z.string(),
    products: z.array(z.object({
      productName: z.string(),
      quantity: z.number(),
      salePrice: z.number()
    })).optional()
  });

  private client: SecretVaultApiClient;

  constructor(client: SecretVaultApiClient) {
    super();
    this.client = client;
  }

  async _call(args: any): Promise<string> {
    try {
      if (args.action === "add") {
        if (!args.products || args.products.length === 0) {
          return "Please provide product information to add to inventory";
        }

        const inventory = await this.client.createInventory(
          args.storeId,
          args.products
        );
        return `Inventory added successfully: ${JSON.stringify(inventory)}`;
      }

      if (args.action === "view") {
        const inventory = await this.client.getInventory(args.storeId);
        return `Current inventory: ${JSON.stringify(inventory)}`;
      }

      return "Invalid action. Use 'add' or 'view'";
    } catch (error: any) {
      return `Inventory operation failed: ${error.message}`;
    }
  }
}

/**
 * Initialize the agent with CDP Agentkit
 *
 * @returns Agent executor and config
 */
async function initializeAgent() {
  try {
    const model = new ChatOpenAI({
      modelName: process.env.MODEL_NAME || "gpt-4-turbo-preview",
      temperature: 0.7,
      maxTokens: 4096,
    });

    // Initialize tools array
    const tools = [];

    // Try to initialize SecretVault client
    try {
      const svConfig = await createSecretVaultConfig();
      const secretVaultClient = new SecretVaultApiClient(svConfig);
      const initialized = await secretVaultClient.init();
      
      if (initialized) {
        const storeManagementTool = new StoreManagementTool(secretVaultClient);
        const inventoryManagementTool = new InventoryManagementTool(secretVaultClient);
        tools.push(storeManagementTool, inventoryManagementTool);
        console.log('SecretVault tools added successfully');
      } else {
        console.log('SecretVault tools skipped - initialization failed');
      }
    } catch (error) {
      if (error instanceof Error) {
        console.log('SecretVault integration skipped:', error.message);
      } else {
        console.log('SecretVault integration skipped: Unknown error');
      }
    }

    // Create agent without memory (removed MemorySaver)
    const agent = createReactAgent({
      llm: model,
      tools
    });

    return { agent, config: { tools } };
  } catch (error) {
    if (error instanceof Error) {
      console.error("Failed to initialize agent:", error.message);
    } else {
      console.error("Failed to initialize agent: Unknown error");
    }
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
