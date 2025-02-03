# Coinbase Chatbot Agent with SecretVault Integration

This project is a secure chatbot agent that integrates with Coinbase's AgentKit and Nillion's SecretVault to build and manage databases for merchants.

## Overview

The agent is designed to store and manage sensitive merchant data using SecretVault's distributed encryption system. The project includes two main database collections:

- **Merchant Profiles Collection**: Stores information about merchants, including the owner's name, store name, and a brief description.
- **Product Inventory Collection**: (Planned) Stores product details such as product code, product name, and a short description (e.g., "coca cola 355 ml aluminum").

## Project Structure

- **src/**: Contains the source code.
  - **config/**: Holds configuration files (e.g., `secretVaultConfig.ts`).
  - **integration/**: Contains integration modules with SecretVault (e.g., `secretVaultIntegration.ts`).
  - **api/**: Contains API scripts, such as the schema creation script (`createSchema.ts`).
- **.env.example**: Template for environment variables.
- **package.json**: Project dependencies and scripts.
- **README.md**: This file, which provides a detailed description of the project.

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/coinbase-chatbot.git
   cd coinbase-chatbot
   ```

2. **Install the dependencies:**

   ```bash
   npm install
   ```

### Environment Variables

Before running the project, create a copy of the `.env.example` file and name it `.env`. Then, fill in the required credentials.

#### .env Variables Description

- **CDP_API_KEY_NAME**: Your Coinbase AgentKit API key name.
- **CDP_API_KEY_PRIVATE_KEY**: Your Coinbase AgentKit API private key.
- **OPENAI_API_KEY**: Your OpenAI API key.
- **NETWORK_ID**: The network identifier.
- **SV_ORG_DID**: Your organization DID provided by SecretVault.
- **SV_PRIVATE_KEY**: Your SecretVault private key.
- **SV_PUBLIC_KEY**: Your SecretVault public key.
- **SV_NODE1_URL**, **SV_NODE2_URL**, **SV_NODE3_URL**: URLs of the SecretVault cluster nodes.
- **SV_NODE1_JWT**, **SV_NODE2_JWT**, **SV_NODE3_JWT**: JWT tokens for authenticating each respective node.
- **SCHEMA_ID_MERCHANT**: The unique UUID for the Merchant Profiles collection.
- **SCHEMA_ID_PRODUCT**: The unique UUID for the Product Inventory collection.

For obtaining these credentials, please refer to the official SecretVault documentation and your organization's registration details.

### Building and Running the Project

To build the project, run:

```bash
npm run build
```

To start the project, run:

```bash
npm start
```

## Additional Information

- The project integrates with SecretVault using the `nillion-sv-wrappers` package, which simplifies encryption, decryption, and API operations.
- Sensitive data is managed exclusively through environment variables. The `.gitignore` file is configured to exclude sensitive files (such as `.env`) and build artifacts (`node_modules/`, `dist/`).
- The modular architecture (with dedicated directories like `config` and `integration`) ensures that integration logic is cleanly separated and maintainable.

## License

MIT License

---

This project leverages distributed encryption via SecretVault to securely manage sensitive merchant and product information. Contributions and suggestions are welcome.
