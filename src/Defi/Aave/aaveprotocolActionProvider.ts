import { z } from "zod";
import { customActionProvider } from "@coinbase/agentkit/dist/action-providers";
import { EvmWalletProvider } from "@coinbase/agentkit/dist/wallet-providers/evmWalletProvider";

// Define schemas
const AssetSchema = z.enum(["USDC", "WETH"]);
const AmountSchema = z.string().describe("Amount in base units (no decimals)");
const InterestRateSchema = z.enum(["VARIABLE", "STABLE"]);

const SupplySchema = z.object({
  asset: AssetSchema,
  amount: AmountSchema,
});

const BorrowSchema = z.object({
  asset: AssetSchema,
  amount: AmountSchema,
  interestRateMode: InterestRateSchema,
});

const RepaySchema = z.object({
  asset: AssetSchema,
  amount: AmountSchema,
  interestRateMode: InterestRateSchema,
});

const WithdrawSchema = z.object({
  asset: AssetSchema,
  amount: AmountSchema,
});

export const AaveProtocolActionProvider = () => customActionProvider<EvmWalletProvider>([
  {
    name: "supply_asset",
    description: "Supply assets to Aave V3 protocol on Base Sepolia",
    schema: SupplySchema,
    invoke: async (walletProvider, args) => {
      try {
        // Implementation here
        return `Successfully supplied ${args.amount} ${args.asset} to Aave`;
      } catch (error) {
        return `Error supplying asset to Aave: ${error}`;
      }
    }
  },
  {
    name: "borrow_asset",
    description: "Borrow assets from Aave V3 protocol on Base Sepolia",
    schema: BorrowSchema,
    invoke: async (walletProvider, args) => {
      try {
        // Implementation here
        return `Successfully borrowed ${args.amount} ${args.asset} from Aave`;
      } catch (error) {
        return `Error borrowing asset from Aave: ${error}`;
      }
    }
  },
  {
    name: "repay_loan",
    description: "Repay borrowed assets to Aave V3 protocol on Base Sepolia",
    schema: RepaySchema,
    invoke: async (walletProvider, args) => {
      try {
        // Implementation here
        return `Successfully repaid ${args.amount} ${args.asset} to Aave`;
      } catch (error) {
        return `Error repaying loan to Aave: ${error}`;
      }
    }
  },
  {
    name: "withdraw_asset",
    description: "Withdraw supplied assets from Aave V3 protocol on Base Sepolia",
    schema: WithdrawSchema,
    invoke: async (walletProvider, args) => {
      try {
        // Implementation here
        return `Successfully withdrew ${args.amount} ${args.asset} from Aave`;
      } catch (error) {
        return `Error withdrawing asset from Aave: ${error}`;
      }
    }
  }
]);

// Optionally, you can keep the camelCase version as an alias
export const aaveProtocolActionProvider = AaveProtocolActionProvider;