# Eth Agent for LATAM Store Owners

A sophisticated AI agent designed to help store owners in Latin America manage their businesses through blockchain technology, DeFi protocols, and secure data management.

## Features

### Current Features
- **Interactive AI Agent** powered by GPT-4
- **Blockchain Interaction** through Coinbase Developer Platform (CDP)
- **Wallet Management** and cryptocurrency operations
- **Multi-mode Operation** (chat and autonomous)

### Upcoming Features
- **Telegram Integration**
  - Primary user interface for merchants
  - Debug console for developers
  - Comprehensive logging system for audits
  - Testing environment

- **Secure Data Management (Nillion)**
  - Encrypted store profiles storage
  - Secure vault system for:
    - Owner information
    - Store details
    - Location data
    - Business credentials

- **Inventory & Sales System (NilQL & NilDB)**
  - Product registration and management
  - Real-time stock tracking
  - Sales recording and analytics
  - Query optimization for large datasets

- **DeFi Integration**
  - $XOC Mexican Peso Stablecoin integration
  - Aave Protocol lending services
  - Yield optimization
  - Risk management tools

## Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **OpenAI API Key**
- **Coinbase Developer Platform credentials**

## Environment Variables

Create a `.env` file with the following content:

```
CDP_API_KEY_NAME="your_CDP_API_KEY_NAME_here"
CDP_API_KEY_PRIVATE_KEY="your_CDP_API_KEY_PRIVATE_KEY_here"
OPENAI_API_KEY="your_OPENAI_API_KEY_here"
NETWORK_ID="your_NETWORK_ID_here"

# SecretVault Credentials (provided after registering your organization with SecretVault)
SV_ORG_DID="your_organization_DID_here"
SV_PRIVATE_KEY="your_secret_vault_private_key_here"
SV_PUBLIC_KEY="your_secret_vault_public_key_here"

# SecretVault Cluster Node Configuration (Demo cluster URLs)
SV_NODE1_URL="https://nildb-zy8u.nillion.network"
SV_NODE1_JWT="your_jwt_token_for_node1_here"

SV_NODE2_URL="https://nildb-rl5g.nillion.network"
SV_NODE2_JWT="your_jwt_token_for_node2_here"

SV_NODE3_URL="https://nildb-lpjp.nillion.network"
SV_NODE3_JWT="your_jwt_token_for_node3_here"

# Schema IDs for Collections - generate UUIDs for each collection and use them consistently across all nodes
SCHEMA_ID_MERCHANT="your_UUID_for_merchant_collection_here"
SCHEMA_ID_PRODUCT="your_UUID_for_product_collection_here" 
SCHEMA_ID_SALES="your_UUID_for_sales_collection_here"

TELEGRAM_BOT_TOKEN="your_bot_token_here"
```

## Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Build the project**
   ```bash
   npm run build
   ```

## Usage

- **Development mode**
  ```bash
  npm run dev
  ```
- **Production mode**
  ```bash
  npm start
  ```
- **Linting**
  ```bash
  npm run lint
  ```
- **Fix linting issues**
  ```bash
  npm run lint:fix
  ```
- **Format code**
  ```bash
  npm run format
  ```

## Project Structure

├── chatbot.ts # Main agent logic
├── español/ # Spanish documentation
├── src/ # Source code
│ ├── telegram/ # Telegram integration
│ ├── nillion/ # Nillion integration
│ └── defi/ # DeFi integrations
├── dist/ # Compiled code
└── tests/ # Test files


## Contributing

1. **Fork the repository**
2. **Create your feature branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**

## License

This project is licensed under the Apache-2.0 License - see the [LICENSE](LICENSE) file for details.
