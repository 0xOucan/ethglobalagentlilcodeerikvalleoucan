"use strict";
/**
 * File: chatbot.ts
 *
 * This agent is designed to:
 * - Register merchant profiles in a secret vault using Nillion.
 * - Register products in a local but encrypted database.
 * - Manage an inventory/stock system that aligns with sales files.
 *
 * The agent supports multiple modes of interaction: Chat, Autonomous, and Telegram.
 */
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
exports.runTelegramMode = runTelegramMode;
const agentkit_1 = require("@coinbase/agentkit");
const agentkit_langchain_1 = require("@coinbase/agentkit-langchain");
const messages_1 = require("@langchain/core/messages");
const langgraph_1 = require("@langchain/langgraph");
const prebuilt_1 = require("@langchain/langgraph/prebuilt");
const openai_1 = require("@langchain/openai");
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const readline = __importStar(require("readline"));
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const grammy_1 = require("grammy");
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
        console.error("Error: Required environment variables are not set.");
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
/* ────────────────────────────────
   Nuevas acciones personalizadas
   ──────────────────────────────── */
// Acción para almacenar el perfil del comerciante
const customStoreProfileAction = (0, agentkit_1.customActionProvider)({
    name: "store_profile",
    description: "Store merchant profile: owner's name, store name, and a brief description.",
    schema: zod_1.z.object({
        owner: zod_1.z.string().min(1).describe("Owner's name"),
        storeName: zod_1.z.string().min(1).describe("Store name"),
        description: zod_1.z.string().min(1).describe("Brief store description"),
    }),
    invoke: async (_walletProvider, args) => {
        // Generamos un objeto con el perfil del comerciante
        const merchantProfile = {
            id: (0, uuid_1.v4)(),
            owner: args.owner,
            storeName: args.storeName,
            description: args.description,
        };
        // AQUÍ: Integrar con SecretVault utilizando nillion-sv-wrappers para almacenar merchantProfile.
        // Por ejemplo:
        // const collection = new SecretVaultWrapper(orgConfig.nodes, orgConfig.orgCredentials, MERCHANT_SCHEMA_ID);
        // await collection.init();
        // const result = await collection.writeToNodes([merchantProfile]);
        console.log("Registering merchant profile:", merchantProfile);
        return `Profile registered: ${merchantProfile.id}`;
    },
});
// Acción para registrar un producto en el inventario
const customRegisterProductAction = (0, agentkit_1.customActionProvider)({
    name: "register_product",
    description: "Register product in inventory: product code, product name, and a brief description (max 4 words).",
    schema: zod_1.z.object({
        productCode: zod_1.z.string().min(1).describe("Product code"),
        productName: zod_1.z.string().min(1).describe("Product name"),
        productDescription: zod_1.z.string().min(1).describe("Brief description (max 4 words)"),
    }),
    invoke: async (_walletProvider, args) => {
        // Aseguramos que la descripción tenga máximo 4 palabras
        let words = args.productDescription.split(/\s+/);
        if (words.length > 4) {
            words = words.slice(0, 4);
        }
        const description = words.join(" ");
        const productEntry = {
            id: (0, uuid_1.v4)(),
            productCode: args.productCode,
            productName: args.productName,
            productDescription: description,
        };
        // AQUÍ: Integrar con SecretVault para almacenar productEntry en la colección de inventario.
        console.log("Registering product:", productEntry);
        return `Product registered: ${productEntry.id}`;
    },
});
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
                customStoreProfileAction,
                customRegisterProductAction,
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
          You are a helpful agent that can interact on-chain using the Coinbase Developer Platform AgentKit.
          You have access to tools for on-chain interaction. When executing an action, verify if you need to store
          a merchant profile or register a product in inventory based on the user's request.
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
            const thought = "Be creative and do something interesting on-chain. " +
                "Choose an action that showcases your skills and execute it.";
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
// Global variables for logs and developer mode.
let developmentMode = false;
const logBuffer = [];
let telegramLogSender = null;
let adminChatId = undefined;
// Guarda la función original de console.log para usarla en replyAndLog y evitar recursión.
const baseConsoleLog = console.log.bind(console);
// Bandera para evitar llamadas recursivas al enviar logs a Telegram.
let sendingTelegramLog = false;
// Override global de console.log para imprimir en la terminal y enviar logs a Telegram en tiempo real (si está en modo dev).
(() => {
    const originalConsoleLog = baseConsoleLog;
    console.log = (...args) => {
        const message = args
            .map(arg => {
            if (typeof arg === "object") {
                try {
                    return JSON.stringify(arg, null, 2);
                }
                catch (err) {
                    return String(arg);
                }
            }
            return String(arg);
        })
            .join(" ");
        // Imprime el mensaje en la terminal usando la función original.
        originalConsoleLog(message);
        // Guarda el mensaje en el buffer (opcional).
        logBuffer.push(message);
        if (logBuffer.length > 100) {
            logBuffer.shift();
        }
        // Envía el log a Telegram si está en modo desarrollador y se evita el ciclo recursivo.
        if (developmentMode && telegramLogSender && !sendingTelegramLog) {
            sendingTelegramLog = true;
            telegramLogSender(message)
                .catch(err => {
                originalConsoleLog("Error sending log to Telegram:", err);
            })
                .finally(() => {
                sendingTelegramLog = false;
            });
        }
    };
})();
/**
 * Función auxiliar para responder en Telegram y registrar (log) la respuesta en la terminal.
 * Se usa la función baseConsoleLog para evitar que se active el override de console.log.
 */
async function replyAndLog(ctx, message, options = {}) {
    baseConsoleLog("Telegram response to", ctx.from.username || ctx.from.first_name, ":", message);
    return await ctx.reply(message, options);
}
/**
 * Ejecuta el modo Telegram, iniciando el bot y escuchando comandos y mensajes.
 * El comando /exit detiene solo el bot de Telegram, mientras que /kill termina la aplicación completa.
 */
async function runTelegramMode(agent, config) {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
        console.error("Error: TELEGRAM_BOT_TOKEN is not defined in the environment variables.");
        return;
    }
    const telegramBot = new grammy_1.Bot(process.env.TELEGRAM_BOT_TOKEN);
    // Handler para /start: limpia el buffer y asigna telegramLogSender.
    telegramBot.command("start", async (ctx) => {
        adminChatId = ctx.chat.id;
        // Limpiar el buffer para no enviar logs antiguos.
        logBuffer.length = 0;
        telegramLogSender = async (msg) => {
            // Se envía cada línea de log con formato preformateado.
            await replyAndLog(ctx, `<pre>${msg}</pre>`, { parse_mode: "HTML" });
        };
        await replyAndLog(ctx, "Welcome! Available commands:\n" +
            "/devmode - Toggle developer mode\n" +
            "/exit - Exit Telegram mode (bot stops, but application remains running)\n" +
            "/kill - Terminate the entire application\n" +
            "Send your message and I'll help you.");
    });
    // Handler para /devmode: alterna el modo desarrollador.
    telegramBot.command("devmode", async (ctx) => {
        developmentMode = !developmentMode;
        // Si aún no se ha asignado telegramLogSender, asignarlo usando el chat actual.
        if (!telegramLogSender) {
            adminChatId = ctx.chat.id;
            telegramLogSender = async (msg) => {
                await replyAndLog(ctx, `<pre>${msg}</pre>`, { parse_mode: "HTML" });
            };
        }
        await replyAndLog(ctx, `Developer mode is now ${developmentMode ? "ON" : "OFF"}.`);
    });
    // Handler para /exit: detiene solo el bot de Telegram.
    telegramBot.command("exit", async (ctx) => {
        await replyAndLog(ctx, "Exiting Telegram mode. Telegram bot will stop, but the application remains running.");
        telegramBot.stop();
    });
    // Nuevo comando /kill: finaliza toda la aplicación.
    telegramBot.command("kill", async (ctx) => {
        await replyAndLog(ctx, "Terminating the entire application. Goodbye!");
        process.exit(0);
    });
    // Handler para mensajes de texto.
    telegramBot.on("message:text", async (ctx) => {
        // Evitar reprocesar mensajes que sean comandos.
        if (ctx.message.text.startsWith("/")) {
            return;
        }
        console.log(`Message from ${ctx.from.username || ctx.from.first_name}: ${ctx.message.text}`);
        try {
            // Envía el mensaje recibido al agente.
            const stream = await agent.stream({ messages: [new messages_1.HumanMessage(ctx.message.text)] }, config);
            let fullResponse = "";
            for await (const chunk of stream) {
                if (chunk.agent && chunk.agent.messages && chunk.agent.messages[0].content) {
                    fullResponse += chunk.agent.messages[0].content;
                }
                else if (chunk.tools && chunk.tools.messages && chunk.tools.messages[0].content) {
                    fullResponse += chunk.tools.messages[0].content;
                }
            }
            // Envía la respuesta al usuario en Telegram y la imprime en la terminal.
            await replyAndLog(ctx, fullResponse, { parse_mode: "HTML" });
        }
        catch (error) {
            console.error("Error processing message:", error);
            await replyAndLog(ctx, "An error occurred while processing your message. Please try again.");
        }
    });
    // Inicia el bot descartando actualizaciones pendientes.
    telegramBot.start({ drop_pending_updates: true });
    console.log("Telegram mode started. Waiting for messages...");
}
/**
 * Modo interactivo en terminal. Permite:
 * - Escribir "exit" para salir del modo chat.
 * - Escribir "kill" para terminar toda la aplicación.
 */
async function runChatMode(agent, config) {
    console.log("Starting chat mode... Type 'exit' to end, or 'kill' to terminate the entire application.");
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));
    try {
        while (true) {
            const userInput = await question("\nPrompt: ");
            // If the input is "exit", end the chat mode.
            if (userInput.toLowerCase() === "exit")
                break;
            // If the input is "kill", terminate the entire application.
            if (userInput.toLowerCase() === "kill") {
                console.log("Terminating the entire application from terminal.");
                rl.close();
                process.exit(0);
            }
            // Increase recursion limit for development mode
            if (developmentMode) {
                agent.recursionLimit = 50; // Set a higher limit for testing
            }
            const stream = await agent.stream({ messages: [new messages_1.HumanMessage(userInput)] }, config);
            for await (const chunk of stream) {
                if (chunk.agent && chunk.agent.messages && chunk.agent.messages[0].content) {
                    console.log(chunk.agent.messages[0].content);
                }
                else if (chunk.tools && chunk.tools.messages && chunk.tools.messages[0].content) {
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
 * Función chooseMode que muestra las 3 opciones en la terminal.
 */
async function chooseMode() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
    while (true) {
        console.log("\nAvailable modes:");
        console.log("1. chat      - Interactive chat mode");
        console.log("2. auto      - Autonomous action mode");
        console.log("3. telegram  - Telegram chat interface mode");
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
        else if (choice === "3" || choice === "telegram") {
            rl.close();
            return "telegram";
        }
        console.log("Invalid choice. Please try again.");
    }
}
/**
 * Función principal que inicia el agente y permite seleccionar el modo.
 */
async function main() {
    try {
        const { agent, config } = await initializeAgent();
        // Inicia el bot de Telegram en segundo plano (si TELEGRAM_BOT_TOKEN está definido)
        if (process.env.TELEGRAM_BOT_TOKEN) {
            runTelegramMode(agent, config).catch((e) => console.error("Error in Telegram mode:", e));
        }
        // Muestra el prompt de selección de modo en la terminal
        const mode = await chooseMode();
        if (mode === "chat") {
            await runChatMode(agent, config);
        }
        else if (mode === "auto") {
            await runAutonomousMode(agent, config);
        }
        else if (mode === "telegram") {
            console.log("Telegram mode is already running in the background. You can interact via Telegram.");
            // Mantener el proceso en ejecución sin salir
            await new Promise(() => { });
        }
    }
    catch (error) {
        if (error instanceof Error) {
            console.error("Error:", error.message);
        }
        process.exit(1);
    }
}
// Inicia el proceso principal cuando se ejecuta directamente
if (require.main === module) {
    console.log("Starting Agent...");
    main().catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
}
