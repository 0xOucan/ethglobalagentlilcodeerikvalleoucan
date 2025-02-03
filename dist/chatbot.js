"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const agentkit_1 = require("@coinbase/agentkit");
const agentkit_langchain_1 = require("@coinbase/agentkit-langchain");
const messages_1 = require("@langchain/core/messages");
const langgraph_1 = require("@langchain/langgraph");
const prebuilt_1 = require("@langchain/langgraph/prebuilt");
const openai_1 = require("@langchain/openai");
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const readline = __importStar(require("readline"));
dotenv.config();
/**
* Validates that required environment variables are set
*
* @throws {Error} - If required environment variables are missing
* @returns {void}
*/
function validateEnvironment() {
    const missingVars = [];
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
        const llm = new openai_1.ChatOpenAI({
            model: "gpt-4",
        });
        let walletDataStr = null;
        // Read existing wallet data if available
        if (fs.existsSync(WALLET_DATA_FILE)) {
            try {
                walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
            }
            catch (error) {
                console.error("Error reading wallet data:", error);
                // Continue without wallet data
            }
        }
        // Configure CDP Wallet Provider
        const formatPrivateKey = (key) => {
            if (!key)
                return undefined;
            return key
                .replace(/\\n/g, '\n') // Reemplaza \n con saltos de línea reales
                .replace(/^"(.*)"$/, '$1') // Elimina comillas envolventes si existen
                .trim();
        };
        const config = {
            apiKeyName: process.env.CDP_API_KEY_NAME?.trim(),
            apiKeyPrivateKey: formatPrivateKey(process.env.CDP_API_KEY_PRIVATE_KEY),
            cdpWalletData: walletDataStr || undefined,
            networkId: process.env.NETWORK_ID || "base-sepolia",
        };
        console.log("Config:", {
            ...config,
            apiKeyName: config.apiKeyName,
            apiKeyPrivateKey: 'PRIVATE_KEY_HIDDEN',
            networkId: config.networkId
        });
        // Validar que tenemos las credenciales necesarias
        if (!config.apiKeyName || !config.apiKeyPrivateKey) {
            throw new Error("Missing CDP credentials in environment variables");
        }
        // Validar formato de la clave privada
        if (!config.apiKeyPrivateKey.includes('-----BEGIN EC PRIVATE KEY-----')) {
            throw new Error("Invalid private key format");
        }
        const walletProvider = await agentkit_1.CdpWalletProvider.configureWithWallet(config);
        // Initialize AgentKit
        const agentkit = await agentkit_1.AgentKit.from({
            walletProvider,
            actionProviders: [
                (0, agentkit_1.wethActionProvider)(),
                (0, agentkit_1.pythActionProvider)(),
                (0, agentkit_1.walletActionProvider)(),
                (0, agentkit_1.erc20ActionProvider)(),
                (0, agentkit_1.cdpApiActionProvider)({
                    apiKeyName: config.apiKeyName,
                    apiKeyPrivateKey: config.apiKeyPrivateKey,
                }),
                (0, agentkit_1.cdpWalletActionProvider)({
                    apiKeyName: config.apiKeyName,
                    apiKeyPrivateKey: config.apiKeyPrivateKey,
                }),
            ],
        });
        const tools = await (0, agentkit_langchain_1.getLangChainTools)(agentkit);
        // Store buffered conversation history in memory
        const memory = new langgraph_1.MemorySaver();
        const agentConfig = { configurable: { thread_id: "CDP AgentKit Chatbot Example!" } };
        // Create React Agent using the LLM and CDP AgentKit tools
        const agent = (0, prebuilt_1.createReactAgent)({
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
    }
    catch (error) {
        console.error("Failed to initialize agent:", error);
        throw error; // Re-throw to be handled by caller
    }
}
/**
* Run the agent autonomously with specified intervals
*/
async function runAutonomousMode(agent, config, interval = 10) {
    console.log("Starting autonomous mode...");
    while (true) {
        try {
            const thought = "Be creative and do something interesting on the blockchain. " +
                "Choose an action or set of actions and execute it that highlights your abilities.";
            const stream = await agent.stream({ messages: [new messages_1.HumanMessage(thought)] }, config);
            for await (const chunk of stream) {
                if ("agent" in chunk) {
                    console.log(chunk.agent.messages[0].content);
                }
                else if ("tools" in chunk) {
                    console.log(chunk.tools.messages[0].content);
                }
                console.log("-------------------");
            }
            await new Promise(resolve => setTimeout(resolve, interval * 1000));
        }
        catch (error) {
            if (error instanceof Error) {
                console.error("Error:", error.message);
            }
            process.exit(1);
        }
    }
}
/**
 * Run the agent interactively based on user input
 */
async function runChatMode(agent, config) {
    console.log("Starting chat mode... Type 'exit' to end.");
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
    try {
        while (true) {
            const userInput = await question("\nPrompt: ");
            if (userInput.toLowerCase() === "exit") {
                break;
            }
            const stream = await agent.stream({ messages: [new messages_1.HumanMessage(userInput)] }, config);
            for await (const chunk of stream) {
                if ("agent" in chunk) {
                    console.log(chunk.agent.messages[0].content);
                }
                else if ("tools" in chunk) {
                    console.log(chunk.tools.messages[0].content);
                }
                console.log("-------------------");
            }
        }
    }
    catch (error) {
        if (error instanceof Error) {
            console.error("Error:", error.message);
        }
        process.exit(1);
    }
    finally {
        rl.close();
    }
}
/**
 * Choose whether to run in autonomous or chat mode
 */
async function chooseMode() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
    while (true) {
        console.log("\nAvailable modes:");
        console.log("1. chat    - Interactive chat mode");
        console.log("2. auto    - Autonomous action mode");
        const choice = (await question("\nChoose a mode (enter number or name): "))
            .toLowerCase()
            .trim();
        if (choice === "1" || choice === "chat") {
            rl.close();
            return "chat";
        }
        else if (choice === "2" || choice === "auto") {
            rl.close();
            return "auto";
        }
        console.log("Invalid choice. Please try again.");
    }
}
/**
 * Main entry point
 */
async function main() {
    try {
        const { agent, config } = await initializeAgent();
        const mode = await chooseMode();
        if (mode === "chat") {
            await runChatMode(agent, config);
        }
        else {
            await runAutonomousMode(agent, config);
        }
    }
    catch (error) {
        if (error instanceof Error) {
            console.error("Error:", error.message);
        }
        process.exit(1);
    }
}
// Start the agent when running directly
if (require.main === module) {
    console.log("Starting Agent...");
    main().catch(error => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
}
