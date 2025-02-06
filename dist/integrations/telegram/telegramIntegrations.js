import { Bot } from "grammy";
import { HumanMessage } from "@langchain/core/messages";
export class TelegramIntegration {
    constructor(config, agent, agentConfig) {
        this.config = config;
        this.agent = agent;
        this.agentConfig = agentConfig;
        this.telegramLogSender = null;
        this.adminChatId = null;
        this.bot = new Bot(config.botToken);
        this.developmentMode = config.developmentMode || false;
        this.setupHandlers();
    }
    async replyAndLog(ctx, message, options = {}) {
        await ctx.reply(message, options);
        console.log(`Bot response to ${ctx.from.username || ctx.from.first_name}: ${message}`);
    }
    setupHandlers() {
        // Start command
        this.bot.command("start", async (ctx) => {
            await this.replyAndLog(ctx, "Welcome! I'm your CDP AgentKit bot.\n\n" +
                "Available commands:\n" +
                "/devmode - Toggle developer mode\n" +
                "/exit - Exit Telegram mode (bot stops, but application remains running)\n" +
                "/kill - Terminate the entire application\n" +
                "Send your message and I'll help you.");
        });
        // Developer mode command - now accessible to any user of the bot
        this.bot.command("devmode", async (ctx) => {
            this.developmentMode = !this.developmentMode;
            this.adminChatId = ctx.chat.id; // Set the current chat as admin chat
            this.telegramLogSender = async (msg) => {
                await this.replyAndLog(ctx, `<pre>${msg}</pre>`, { parse_mode: "HTML" });
            };
            await this.replyAndLog(ctx, `Developer mode is now ${this.developmentMode ? "ON" : "OFF"}.`);
        });
        // Exit command
        this.bot.command("exit", async (ctx) => {
            await this.replyAndLog(ctx, "Exiting Telegram mode. Telegram bot will stop, but the application remains running.");
            this.bot.stop();
        });
        // Kill command
        this.bot.command("kill", async (ctx) => {
            await this.replyAndLog(ctx, "Terminating the entire application. Goodbye!");
            process.exit(0);
        });
        // Message handler
        this.bot.on("message:text", async (ctx) => {
            if (ctx.message.text.startsWith("/"))
                return;
            console.log(`Message from ${ctx.from.username || ctx.from.first_name}: ${ctx.message.text}`);
            try {
                const stream = await this.agent.stream({ messages: [new HumanMessage(ctx.message.text)] }, this.agentConfig);
                let fullResponse = "";
                for await (const chunk of stream) {
                    if (chunk.agent?.messages?.[0]?.content) {
                        fullResponse += chunk.agent.messages[0].content;
                    }
                    else if (chunk.tools?.messages?.[0]?.content) {
                        fullResponse += chunk.tools.messages[0].content;
                    }
                }
                await this.replyAndLog(ctx, fullResponse, { parse_mode: "HTML" });
            }
            catch (error) {
                console.error("Error processing message:", error);
                await this.replyAndLog(ctx, "An error occurred while processing your message. Please try again.");
            }
        });
    }
    async start() {
        try {
            await this.bot.start({ drop_pending_updates: true });
            console.log('Telegram bot started successfully');
        }
        catch (error) {
            console.error('Failed to start Telegram bot:', error);
            throw error;
        }
    }
    async stop() {
        try {
            await this.bot.stop();
            console.log('Telegram bot stopped successfully');
        }
        catch (error) {
            console.error('Failed to stop Telegram bot:', error);
            throw error;
        }
    }
}
export const createTelegramBot = async (agent, agentConfig) => {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
        throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
    }
    const config = {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        developmentMode: process.env.NODE_ENV === 'development'
    };
    const integration = new TelegramIntegration(config, agent, agentConfig);
    await integration.start();
    return integration;
};
