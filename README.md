# Coinbase Chatbot Agent with Enhanced Telegram Integration

This project implements a secure chatbot agent that integrates with Coinbase's AgentKit and features an advanced Telegram integration. The agent allows interaction through an interactive terminal, an autonomous mode, and a Telegram interface.

## New Features and Integrations

- **Integrated Telegram Bot:**
  - **/start:** Initializes the Telegram bot, cleans any pending log buffers and displays available commands.
  - **/devmode:** Toggles Developer Mode, which activates real-time forwarding of terminal logs (including the messages received by Telegram) to the Telegram chat.
  - **/exit:** Stops only the Telegram bot without terminating the entire application.
  - **/kill:** Terminates the entire application from Telegram.

- **Real-time Logging:**
  - The agent employs a custom override of `console.log` which sends every log line to the terminal as usual.
  - When Developer Mode is activated, every log message is also sent to Telegram in real time.
  - A helper function `replyAndLog` has been implemented to ensure that Telegram replies are printed in the terminal as well as sent to the user.

- **Seamless Interaction:**
  - The agent supports multiple modes (chat, autonomous, and Telegram) simultaneously.
  - Logs and messages are displayed in both interfaces, allowing easier development and testing.
  - Any command (`/devmode`, `/kill`, etc.) is correctly processed in real time across the terminal and Telegram.

## Project Structure

- **src/**
  - **chatbot.ts:** Main file integrating the Telegram bot and interactive terminal.
  - **... other modules ...**
- **dist/**
- **README.md:** This file.
- **package.json:** Project dependencies and scripts.

## How to Run

1. Make sure your environment variables (such as `TELEGRAM_BOT_TOKEN`) are properly configured.
2. Install dependencies using:
    ```
    npm install
    ```
3. Build the project:
    ```
    npm run build
    ```
4. Start the application:
    ```
    npm start
    ```

The terminal will display available modes, while the Telegram bot (if configured) will start in the background. You can switch modes as needed.

## Git Commands to Upload Changes to Main Branch

1. Stage all changes:
    ```
    git add .
    ```
2. Commit your changes with a message:
    ```
    git commit -m "Update README with new Telegram integrations and enhanced logging features"
    ```
3. Push the changes to the main branch:
    ```
    git push origin main
    ```

## License

MIT License

---

This project now facilitates full monitoring during development, allowing you to observe interactions and logs simultaneously in the terminal and on Telegram.
