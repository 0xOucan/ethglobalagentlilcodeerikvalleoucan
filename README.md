# AgentKit Chatbot with Enhanced Merchant and Inventory Integration

This project implements a secure and feature-rich chatbot agent built on Coinbase's AgentKit. The agent has been enhanced with several new features currently under active development:
  
- **Merchant Profile Registration:**  
  Register merchant profiles in a secret vault using Nillion. This feature allows the agent to store essential information (owner's name, store name, and a brief description) related to merchant profiles.

- **Product Registration:**  
  Register products with a concise description (limited to four words) in a local but encrypted database. This enables secure management of product data.

- **Inventory/Stock System:**  
  Manage an inventory system that is aligned with sales records, ensuring that stock levels can be tracked and updated accurately.

- **Multiple Interaction Modes:**  
  Choose from various modes to interact with the agent:
  - **Chat Mode:** Interactive terminal session.
  - **Autonomous Mode:** The agent executes pre-defined creative actions at regular intervals.
  - **Telegram Mode:** A Telegram interface allows for remote interaction with additional commands:
    - `/start` – Initializes the bot.
    - `/devmode` – Toggles developer mode, forwarding terminal logs to Telegram in real time.
    - `/exit` – Stops only the Telegram bot.
    - `/kill` – Terminates the entire application.

## Features Overview

### Custom Actions
- **Store Merchant Profile (`store_profile`)**  
  Registers a merchant profile with the following attributes:
  - Owner's name
  - Store name
  - Brief description  
  
- **Register Product (`register_product`)**  
  Adds a product to the inventory. The action limits the product description to a maximum of four words.

### Modes of Operation
The agent supports three modes:
- **Chat Mode:**  
  Direct interaction via the terminal. Simply type your prompt, and the agent will respond. Commands `exit` and `kill` are available to exit or stop the application.

- **Autonomous Mode:**  
  The agent runs continuously, executing creative tasks on-chain at fixed intervals (default is 10 seconds).

- **Telegram Mode:**  
  Enables interaction through Telegram. All commands (like `/start`, `/devmode`, `/exit`, and `/kill`) are processed by the Telegram bot, and responses are logged both on Telegram and in the terminal.

### Technical Details in `@chatbot.ts`
- **Environment Validation:**  
  A function ensures all required environment variables (such as `OPENAI_API_KEY`, `CDP_API_KEY_NAME`, and `CDP_API_KEY_PRIVATE_KEY`) are set before initialization.
  
- **Agent Initialization:**  
  The agent is initialized with a wallet provider using the CDP credentials. Custom actions for merchant and product registration are registered here.
  
- **Real-time Logging:**  
  The application overrides `console.log` to forward logs to Telegram (when developer mode is active) without causing recursive calls. The helper function `replyAndLog` is used to respond in Telegram while logging messages to the terminal.

- **Modes Implementation:**  
  The functions `runChatMode`, `runAutonomousMode`, and `runTelegramMode` in `@chatbot.ts` provide the logic for interactive and autonomous behavior.

## Getting Started

1. **Clone the Repository:**
    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```

2. **Install Dependencies:**
    ```bash
    npm install
    ```

3. **Set Up Environment Variables:**
   Create a `.env` file in the root directory and add the required variables:
    ```env
    OPENAI_API_KEY=your_openai_api_key
    CDP_API_KEY_NAME=your_cdp_api_key_name
    CDP_API_KEY_PRIVATE_KEY=your_cdp_api_key_private_key
    NETWORK_ID=base-sepolia          # Optional, defaults to base-sepolia
    TELEGRAM_BOT_TOKEN=your_telegram_bot_token   # Optional for Telegram mode
    ```

4. **Build and Start the Application:**
    ```bash
    npm run build
    npm start
    ```

## Git Commands to Push Changes to the Main Branch

To stage, commit, and push your latest changes (including updates in `@chatbot.ts`) to the main branch:
```bash
git add .
git commit -m "Update README with enhanced functionalities and Telegram integration"
git push origin main
```

## License

This project is licensed under the MIT License.

---

This project now facilitates full monitoring during development, allowing you to observe interactions and logs simultaneously in the terminal and on Telegram.
