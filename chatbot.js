"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
var agentkit_1 = require("@coinbase/agentkit");
var agentkit_langchain_1 = require("@coinbase/agentkit-langchain");
var messages_1 = require("@langchain/core/messages");
var langgraph_1 = require("@langchain/langgraph");
var prebuilt_1 = require("@langchain/langgraph/prebuilt");
var openai_1 = require("@langchain/openai");
var dotenv = require("dotenv");
var fs = require("fs");
var readline = require("readline");
dotenv.config();
/**
 * Validates that required environment variables are set
 *
 * @throws {Error} - If required environment variables are missing
 * @returns {void}
 */
function validateEnvironment() {
    var missingVars = [];
    // Check required variables
    var requiredVars = ["OPENAI_API_KEY", "CDP_API_KEY_NAME", "CDP_API_KEY_PRIVATE_KEY"];
    requiredVars.forEach(function (varName) {
        if (!process.env[varName]) {
            missingVars.push(varName);
        }
    });
    // Exit if any required variables are missing
    if (missingVars.length > 0) {
        console.error("Error: Required environment variables are not set");
        missingVars.forEach(function (varName) {
            console.error("".concat(varName, "=your_").concat(varName.toLowerCase(), "_here"));
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
var WALLET_DATA_FILE = "wallet_data.txt";
/**
 * Initialize the agent with CDP Agentkit
 *
 * @returns Agent executor and config
 */
function initializeAgent() {
    return __awaiter(this, void 0, void 0, function () {
        var llm, walletDataStr, config, walletProvider, agentkit, tools, memory, agentConfig, agent, exportedWallet, error_1;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 5, , 6]);
                    llm = new openai_1.ChatOpenAI({
                        model: "gpt-4o-mini",
                    });
                    walletDataStr = null;
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
                    config = {
                        apiKeyName: process.env.CDP_API_KEY_NAME,
                        apiKeyPrivateKey: (_a = process.env.CDP_API_KEY_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, "\n"),
                        cdpWalletData: walletDataStr || undefined,
                        networkId: process.env.NETWORK_ID || "base-sepolia",
                    };
                    return [4 /*yield*/, agentkit_1.CdpWalletProvider.configureWithWallet(config)];
                case 1:
                    walletProvider = _d.sent();
                    return [4 /*yield*/, agentkit_1.AgentKit.from({
                            walletProvider: walletProvider,
                            actionProviders: [
                                (0, agentkit_1.wethActionProvider)(),
                                (0, agentkit_1.pythActionProvider)(),
                                (0, agentkit_1.walletActionProvider)(),
                                (0, agentkit_1.erc20ActionProvider)(),
                                (0, agentkit_1.cdpApiActionProvider)({
                                    apiKeyName: process.env.CDP_API_KEY_NAME,
                                    apiKeyPrivateKey: (_b = process.env.CDP_API_KEY_PRIVATE_KEY) === null || _b === void 0 ? void 0 : _b.replace(/\\n/g, "\n"),
                                }),
                                (0, agentkit_1.cdpWalletActionProvider)({
                                    apiKeyName: process.env.CDP_API_KEY_NAME,
                                    apiKeyPrivateKey: (_c = process.env.CDP_API_KEY_PRIVATE_KEY) === null || _c === void 0 ? void 0 : _c.replace(/\\n/g, "\n"),
                                }),
                            ],
                        })];
                case 2:
                    agentkit = _d.sent();
                    return [4 /*yield*/, (0, agentkit_langchain_1.getLangChainTools)(agentkit)];
                case 3:
                    tools = _d.sent();
                    memory = new langgraph_1.MemorySaver();
                    agentConfig = { configurable: { thread_id: "CDP AgentKit Chatbot Example!" } };
                    agent = (0, prebuilt_1.createReactAgent)({
                        llm: llm,
                        tools: tools,
                        checkpointSaver: memory,
                        messageModifier: "\n        You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit. You are \n        empowered to interact onchain using your tools. If you ever need funds, you can request them from the \n        faucet if you are on network ID 'base-sepolia'. If not, you can provide your wallet details and request \n        funds from the user. Before executing your first action, get the wallet details to see what network \n        you're on. If there is a 5XX (internal) HTTP error code, ask the user to try again later. If someone \n        asks you to do something you can't do with your currently available tools, you must say so, and \n        encourage them to implement it themselves using the CDP SDK + Agentkit, recommend they go to \n        docs.cdp.coinbase.com for more information. Be concise and helpful with your responses. Refrain from \n        restating your tools' descriptions unless it is explicitly requested.\n        ",
                    });
                    return [4 /*yield*/, walletProvider.exportWallet()];
                case 4:
                    exportedWallet = _d.sent();
                    fs.writeFileSync(WALLET_DATA_FILE, JSON.stringify(exportedWallet));
                    return [2 /*return*/, { agent: agent, config: agentConfig }];
                case 5:
                    error_1 = _d.sent();
                    console.error("Failed to initialize agent:", error_1);
                    throw error_1; // Re-throw to be handled by caller
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Run the agent autonomously with specified intervals
 */
function runAutonomousMode(agent_1, config_1) {
    return __awaiter(this, arguments, void 0, function (agent, config, interval) {
        var thought, stream, _a, stream_1, stream_1_1, chunk, e_1_1, error_2;
        var _b, e_1, _c, _d;
        if (interval === void 0) { interval = 10; }
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    console.log("Starting autonomous mode...");
                    _e.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 19];
                    _e.label = 2;
                case 2:
                    _e.trys.push([2, 17, , 18]);
                    thought = "Be creative and do something interesting on the blockchain. " +
                        "Choose an action or set of actions and execute it that highlights your abilities.";
                    return [4 /*yield*/, agent.stream({ messages: [new messages_1.HumanMessage(thought)] }, config)];
                case 3:
                    stream = _e.sent();
                    _e.label = 4;
                case 4:
                    _e.trys.push([4, 9, 10, 15]);
                    _a = true, stream_1 = (e_1 = void 0, __asyncValues(stream));
                    _e.label = 5;
                case 5: return [4 /*yield*/, stream_1.next()];
                case 6:
                    if (!(stream_1_1 = _e.sent(), _b = stream_1_1.done, !_b)) return [3 /*break*/, 8];
                    _d = stream_1_1.value;
                    _a = false;
                    chunk = _d;
                    if ("agent" in chunk) {
                        console.log(chunk.agent.messages[0].content);
                    }
                    else if ("tools" in chunk) {
                        console.log(chunk.tools.messages[0].content);
                    }
                    console.log("-------------------");
                    _e.label = 7;
                case 7:
                    _a = true;
                    return [3 /*break*/, 5];
                case 8: return [3 /*break*/, 15];
                case 9:
                    e_1_1 = _e.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 15];
                case 10:
                    _e.trys.push([10, , 13, 14]);
                    if (!(!_a && !_b && (_c = stream_1.return))) return [3 /*break*/, 12];
                    return [4 /*yield*/, _c.call(stream_1)];
                case 11:
                    _e.sent();
                    _e.label = 12;
                case 12: return [3 /*break*/, 14];
                case 13:
                    if (e_1) throw e_1.error;
                    return [7 /*endfinally*/];
                case 14: return [7 /*endfinally*/];
                case 15: return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, interval * 1000); })];
                case 16:
                    _e.sent();
                    return [3 /*break*/, 18];
                case 17:
                    error_2 = _e.sent();
                    if (error_2 instanceof Error) {
                        console.error("Error:", error_2.message);
                    }
                    process.exit(1);
                    return [3 /*break*/, 18];
                case 18: return [3 /*break*/, 1];
                case 19: return [2 /*return*/];
            }
        });
    });
}
/**
 * Run the agent interactively based on user input
 */
function runChatMode(agent, config) {
    return __awaiter(this, void 0, void 0, function () {
        var rl, question, userInput, stream, _a, stream_2, stream_2_1, chunk, e_2_1, error_3;
        var _b, e_2, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    console.log("Starting chat mode... Type 'exit' to end.");
                    rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout,
                    });
                    question = function (prompt) {
                        return new Promise(function (resolve) { return rl.question(prompt, resolve); });
                    };
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 18, 19, 20]);
                    _e.label = 2;
                case 2:
                    if (!true) return [3 /*break*/, 17];
                    return [4 /*yield*/, question("\nPrompt: ")];
                case 3:
                    userInput = _e.sent();
                    if (userInput.toLowerCase() === "exit") {
                        return [3 /*break*/, 17];
                    }
                    return [4 /*yield*/, agent.stream({ messages: [new messages_1.HumanMessage(userInput)] }, config)];
                case 4:
                    stream = _e.sent();
                    _e.label = 5;
                case 5:
                    _e.trys.push([5, 10, 11, 16]);
                    _a = true, stream_2 = (e_2 = void 0, __asyncValues(stream));
                    _e.label = 6;
                case 6: return [4 /*yield*/, stream_2.next()];
                case 7:
                    if (!(stream_2_1 = _e.sent(), _b = stream_2_1.done, !_b)) return [3 /*break*/, 9];
                    _d = stream_2_1.value;
                    _a = false;
                    chunk = _d;
                    if ("agent" in chunk) {
                        console.log(chunk.agent.messages[0].content);
                    }
                    else if ("tools" in chunk) {
                        console.log(chunk.tools.messages[0].content);
                    }
                    console.log("-------------------");
                    _e.label = 8;
                case 8:
                    _a = true;
                    return [3 /*break*/, 6];
                case 9: return [3 /*break*/, 16];
                case 10:
                    e_2_1 = _e.sent();
                    e_2 = { error: e_2_1 };
                    return [3 /*break*/, 16];
                case 11:
                    _e.trys.push([11, , 14, 15]);
                    if (!(!_a && !_b && (_c = stream_2.return))) return [3 /*break*/, 13];
                    return [4 /*yield*/, _c.call(stream_2)];
                case 12:
                    _e.sent();
                    _e.label = 13;
                case 13: return [3 /*break*/, 15];
                case 14:
                    if (e_2) throw e_2.error;
                    return [7 /*endfinally*/];
                case 15: return [7 /*endfinally*/];
                case 16: return [3 /*break*/, 2];
                case 17: return [3 /*break*/, 20];
                case 18:
                    error_3 = _e.sent();
                    if (error_3 instanceof Error) {
                        console.error("Error:", error_3.message);
                    }
                    process.exit(1);
                    return [3 /*break*/, 20];
                case 19:
                    rl.close();
                    return [7 /*endfinally*/];
                case 20: return [2 /*return*/];
            }
        });
    });
}
/**
 * Choose whether to run in autonomous or chat mode
 */
function chooseMode() {
    return __awaiter(this, void 0, void 0, function () {
        var rl, question, choice;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout,
                    });
                    question = function (prompt) {
                        return new Promise(function (resolve) { return rl.question(prompt, resolve); });
                    };
                    _a.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 3];
                    console.log("\nAvailable modes:");
                    console.log("1. chat    - Interactive chat mode");
                    console.log("2. auto    - Autonomous action mode");
                    return [4 /*yield*/, question("\nChoose a mode (enter number or name): ")];
                case 2:
                    choice = (_a.sent())
                        .toLowerCase()
                        .trim();
                    if (choice === "1" || choice === "chat") {
                        rl.close();
                        return [2 /*return*/, "chat"];
                    }
                    else if (choice === "2" || choice === "auto") {
                        rl.close();
                        return [2 /*return*/, "auto"];
                    }
                    console.log("Invalid choice. Please try again.");
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Main entry point
 */
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, agent, config, mode, error_4;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 7, , 8]);
                    return [4 /*yield*/, initializeAgent()];
                case 1:
                    _a = _b.sent(), agent = _a.agent, config = _a.config;
                    return [4 /*yield*/, chooseMode()];
                case 2:
                    mode = _b.sent();
                    if (!(mode === "chat")) return [3 /*break*/, 4];
                    return [4 /*yield*/, runChatMode(agent, config)];
                case 3:
                    _b.sent();
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, runAutonomousMode(agent, config)];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6: return [3 /*break*/, 8];
                case 7:
                    error_4 = _b.sent();
                    if (error_4 instanceof Error) {
                        console.error("Error:", error_4.message);
                    }
                    process.exit(1);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
// Start the agent when running directly
if (require.main === module) {
    console.log("Starting Agent...");
    main().catch(function (error) {
        console.error("Fatal error:", error);
        process.exit(1);
    });
}
