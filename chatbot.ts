import {
    AgentKit,
    CdpWalletProvider,
    wethActionProvider,
    walletActionProvider,
    erc20ActionProvider,
    cdpApiActionProvider,
    cdpWalletActionProvider,
    pythActionProvider,
    customActionProvider,
  } from "@coinbase/agentkit";
  
  import { getLangChainTools } from "@coinbase/agentkit-langchain";
  import { HumanMessage } from "@langchain/core/messages";
  import { MemorySaver } from "@langchain/langgraph";
  import { createReactAgent } from "@langchain/langgraph/prebuilt";
  import { ChatOpenAI } from "@langchain/openai";
  import * as dotenv from "dotenv";
  import * as fs from "fs";
  import * as readline from "readline";
  import { z } from "zod";
  import { v4 as uuidv4 } from "uuid";
  
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
  
  /* ────────────────────────────────
     Nuevas acciones personalizadas
     ──────────────────────────────── */
  
  // Acción para almacenar el perfil del comerciante
  const customStoreProfileAction = customActionProvider({
    name: "store_profile",
    description: "Almacenar perfil de comerciante: nombre del propietario, nombre de la tienda y descripción breve.",
    schema: z.object({
      owner: z.string().min(1).describe("Nombre del propietario"),
      storeName: z.string().min(1).describe("Nombre de la tienda"),
      description: z.string().min(1).describe("Descripción breve de la tienda"),
    }),
    invoke: async (_walletProvider, args) => {
      // Generamos un objeto con el perfil del comerciante
      const merchantProfile = {
        id: uuidv4(),
        owner: args.owner,
        storeName: args.storeName,
        description: args.description,
      };
  
      // AQUÍ: Integrar con SecretVault utilizando nillion-sv-wrappers para almacenar merchantProfile.
      // Por ejemplo:
      // const collection = new SecretVaultWrapper(orgConfig.nodes, orgConfig.orgCredentials, MERCHANT_SCHEMA_ID);
      // await collection.init();
      // const result = await collection.writeToNodes([merchantProfile]);
  
      console.log("Registrando perfil del comerciante:", merchantProfile);
      return `Perfil registrado: ${merchantProfile.id}`;
    },
  });
  
  // Acción para registrar un producto en el inventario
  const customRegisterProductAction = customActionProvider({
    name: "register_product",
    description: "Registrar producto en inventario: código, nombre y descripción (máximo 4 palabras).",
    schema: z.object({
      productCode: z.string().min(1).describe("Código del producto"),
      productName: z.string().min(1).describe("Nombre del producto"),
      productDescription: z.string().min(1).describe("Descripción breve (máx 4 palabras)"),
    }),
    invoke: async (_walletProvider, args) => {
      // Aseguramos que la descripción tenga máximo 4 palabras
      let palabras = args.productDescription.split(/\s+/);
      if (palabras.length > 4) {
        palabras = palabras.slice(0, 4);
      }
      const description = palabras.join(" ");
  
      const productEntry = {
        id: uuidv4(),
        productCode: args.productCode,
        productName: args.productName,
        productDescription: description,
      };
  
      // AQUÍ: Integrar con SecretVault para almacenar productEntry en la colección de inventario.
      console.log("Registrando producto:", productEntry);
      return `Producto registrado: ${productEntry.id}`;
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
      const llm = new ChatOpenAI({
        model: "gpt-4",
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
      const formatPrivateKey = (key: string | undefined) => {
        if (!key) return undefined;
        return key
          .replace(/\\n/g, '\n')  // Reemplaza \n con saltos de línea reales
          .replace(/^"(.*)"$/, '$1')  // Elimina comillas envolventes si existen
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
            apiKeyName: config.apiKeyName,
            apiKeyPrivateKey: config.apiKeyPrivateKey,
          }),
          cdpWalletActionProvider({
            apiKeyName: config.apiKeyName,
            apiKeyPrivateKey: config.apiKeyPrivateKey,
          }),
          customStoreProfileAction,
          customRegisterProductAction,
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
          Eres un agente útil que puede interactuar onchain usando el Coinbase Developer Platform AgentKit.
          Tienes acceso a herramientas para interactuar onchain. Al ejecutar una acción, verifica si necesitas almacenar
          el perfil del comerciante o registrar un producto en inventario, según la solicitud del usuario.
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
          "Sé creativo y haz algo interesante onchain. " +
          "Elige una acción que resalte tus habilidades y ejecútala.";
  
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
   * Run the agent interactively based on user input
   */
  async function runChatMode(agent: any, config: any) {
    console.log("Starting chat mode... Type 'exit' to end.");
  
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  
    const question = (prompt: string): Promise<string> =>
      new Promise(resolve => rl.question(prompt, resolve));
  
    try {
      while (true) {
        const userInput = await question("\nPrompt: ");
  
        if (userInput.toLowerCase() === "exit") {
          break;
        }
  
        const stream = await agent.stream({ messages: [new HumanMessage(userInput)] }, config);
  
        for await (const chunk of stream) {
          if ("agent" in chunk) {
            console.log(chunk.agent.messages[0].content);
          } else if ("tools" in chunk) {
            console.log(chunk.tools.messages[0].content);
          }
          console.log("-------------------");
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error:", error.message);
      }
      process.exit(1);
    } finally {
      rl.close();
    }
  }
  
  /**
   * Choose whether to run in autonomous or chat mode
   */
  async function chooseMode(): Promise<"chat" | "auto"> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  
    const question = (prompt: string): Promise<string> =>
      new Promise(resolve => rl.question(prompt, resolve));
  
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
      } else if (choice === "2" || choice === "auto") {
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
      } else {
        await runAutonomousMode(agent, config);
      }
    } catch (error) {
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