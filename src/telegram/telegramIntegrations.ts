import { Bot, InlineKeyboard } from "grammy";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { Context } from "grammy";
import { telegramConfig } from "./telegramConfig";

interface TelegramConfig {
  botToken: string;
  developmentMode?: boolean;
}

export class TelegramIntegration {
  private bot: Bot;
  private developmentMode: boolean;
  private isActive: boolean = false;
  private telegramLogSender: ((msg: string) => Promise<void>) | null = null;
  private adminChatId: number | null = null;
  private logBuffer: string[] = [];
  private sendingTelegramLog: boolean = false;
  private exitResolve: (() => void) | null = null;
  private exitPromise: Promise<void>;

  constructor(config: TelegramConfig, private agent: any, private agentConfig: any) {
    this.bot = new Bot(config.botToken);
    this.developmentMode = config.developmentMode || false;
    this.setupLogHandling();
    this.setupHandlers();
    // Initialize exit promise
    this.exitPromise = new Promise((resolve) => {
      this.exitResolve = resolve;
    });
  }

  private setupLogHandling() {
    const originalConsoleLog = console.log.bind(console);
    console.log = (...args: any[]) => {
      const message = args
        .map(arg => {
          if (typeof arg === "object") {
            try {
              return JSON.stringify(arg, null, 2);
            } catch (err) {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(" ");

      // Print to terminal
      originalConsoleLog(message);

      // Store in buffer
      this.logBuffer.push(message);
      if (this.logBuffer.length > 100) {
        this.logBuffer.shift();
      }

      // Send to Telegram if in dev mode
      if (this.developmentMode && this.telegramLogSender && !this.sendingTelegramLog) {
        this.sendingTelegramLog = true;
        this.telegramLogSender(message)
          .catch(err => {
            originalConsoleLog("Error sending log to Telegram:", err);
          })
          .finally(() => {
            this.sendingTelegramLog = false;
          });
      }
    };
  }

  private async replyAndLog(ctx: Context, message: string, options: any = {}) {
    if (ctx.from) {
      console.log(`Bot response to ${ctx.from.username || ctx.from.first_name}: ${message}`);
    }
    return await ctx.reply(message, options);
  }

  private setupHandlers() {
    // Message handler - Process messages only after /start
    this.bot.on("message:text", async (ctx) => {
      if (!this.isActive && ctx.message.text !== '/start') {
        await this.replyAndLog(ctx, "Please use /start to begin the conversation.");
        return;
      }

      if (!ctx.message.text.startsWith('/')) {
        console.log(`Message from ${ctx.from?.username || ctx.from?.first_name}: ${ctx.message.text}`);
        
        try {
          const stream = await this.agent.stream(
            { messages: [new HumanMessage(ctx.message.text)] },
            this.agentConfig
          );
          
          let fullResponse = "";
          for await (const chunk of stream) {
            if (chunk.agent?.messages?.[0]?.content) {
              fullResponse += chunk.agent.messages[0].content;
            } else if (chunk.tools?.messages?.[0]?.content) {
              fullResponse += chunk.tools.messages[0].content;
            }
          }
          await this.replyAndLog(ctx, fullResponse, { parse_mode: "HTML" });
        } catch (error) {
          console.error("Error processing message:", error);
          await this.replyAndLog(ctx, "An error occurred while processing your message. Please try again.");
        }
        return;
      }

      // Handle commands
      switch (ctx.message.text) {
        case '/start':
          this.isActive = true;
          this.adminChatId = ctx.chat.id;
          this.logBuffer.length = 0;
          this.telegramLogSender = async (msg: string) => {
            await this.replyAndLog(ctx, `<pre>${msg}</pre>`, { parse_mode: "HTML" });
          };
          // Send buffered logs if in dev mode
          if (this.developmentMode && this.logBuffer.length > 0) {
            await this.replyAndLog(ctx, "Previous logs:");
            for (const log of this.logBuffer) {
              await this.replyAndLog(ctx, `<pre>${log}</pre>`, { parse_mode: "HTML" });
            }
          }
          await this.replyAndLog(
            ctx,
            "Welcome! I'm your CDP AgentKit bot.\n\n" +
            "Available commands:\n" +
            "/devmode - Toggle developer mode\n" +
            "/exit - Exit Telegram mode\n" +
            "/kill - Terminate the entire application\n" +
            "Send your message and I'll help you."
          );
          break;

        case '/devmode':
          this.developmentMode = !this.developmentMode;
          await this.replyAndLog(
            ctx, 
            `Developer mode is now ${this.developmentMode ? "ON" : "OFF"}.\n` +
            "You will now receive detailed logs of all operations."
          );
          break;

        case '/exit':
          await this.replyAndLog(ctx, "Exiting Telegram mode. Returning to terminal...");
          await this.stop();
          break;

        case '/kill':
          await this.replyAndLog(ctx, "Terminating the entire application. Goodbye!");
          process.exit(0);
          break;
      }
    });
  }

  public async start() {
    try {
      await this.bot.start({ drop_pending_updates: true });
      console.log('Telegram bot started successfully');
    } catch (error) {
      console.error('Failed to start Telegram bot:', error);
      throw error;
    }
  }

  public enableTelegramMode() {
    this.isActive = true;
    console.log('Telegram interface activated');
  }

  public async stop() {
    this.isActive = false;
    try {
      await this.bot.stop();
      console.log('Telegram bot stopped successfully');
      // Resolve the exit promise when bot stops
      if (this.exitResolve) {
        this.exitResolve();
      }
    } catch (error) {
      console.error('Failed to stop Telegram bot:', error);
      throw error;
    }
  }

  // Add method to wait for exit
  public async waitForExit(): Promise<void> {
    return this.exitPromise;
  }
}

export const createTelegramBot = async (
  agent: ReturnType<typeof createReactAgent>,
  agentConfig: any
) => {
  const config: TelegramConfig = telegramConfig;

  const integration = new TelegramIntegration(config, agent, agentConfig);
  await integration.start();
  return integration;
};