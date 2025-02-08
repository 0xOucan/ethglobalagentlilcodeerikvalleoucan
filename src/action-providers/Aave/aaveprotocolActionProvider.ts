import { z } from "zod";
import { ActionProvider } from "@coinbase/agentkit";
import { Network } from "@coinbase/agentkit";
import { EvmWalletProvider } from "@coinbase/agentkit";
import { 
  SupplySchema, 
  BorrowSchema, 
  RepaySchema, 
  WithdrawSchema 
} from "./schemas";
import { 
  AAVE_POOL_ADDRESS, 
  AAVE_L2_ENCODER, 
  AAVE_POOL_ABI, 
  L2_ENCODER_ABI 
} from "./constants";
import { createAaveError, AaveErrorCode } from "./errors";
import { getAssetAddress } from "./utils";
import { Contract } from "ethers";

/**
 * AaveProtocolActionProvider is an action provider for Aave V3 protocol interactions.
 */
export class AaveProtocolActionProvider extends ActionProvider {
    supportsNetwork: (network: Network) => boolean;

    constructor() {
        super("AaveProtocolActionProvider", []);
        this.supportsNetwork = (network: Network) => {
            return network.protocolFamily === "evm" && network.networkId === "base-sepolia";
        };
    }

    /**
     * Supply assets to Aave V3 protocol
     *
     * @param walletProvider - The wallet provider to use for the action.
     * @param args - The input arguments for the action.
     * @returns A message containing the transaction hash.
     */
    async supplyAsset(walletProvider: EvmWalletProvider, args: z.infer<typeof SupplySchema>): Promise<string> {
        try {
            const assetAddress = getAssetAddress(args.asset);
            const amount = BigInt(args.amount);

            // Encode supply parameters
            const encodedParams = await walletProvider.readContract({
                address: AAVE_L2_ENCODER,
                abi: L2_ENCODER_ABI,
                functionName: 'encodeSupplyParams',
                args: [assetAddress, amount, 0]
            });

            // Execute supply transaction
            const hash = await walletProvider.sendTransaction({
                to: AAVE_POOL_ADDRESS,
                data: encodedParams as `0x${string}`
            });

            await walletProvider.waitForTransactionReceipt(hash);

            return hash;
        } catch (error) {
            throw createAaveError(AaveErrorCode.TRANSACTION_FAILED, error);
        }
    }

    /**
     * Borrow assets from Aave V3 protocol
     *
     * @param walletProvider - The wallet provider to use for the action.
     * @param args - The input arguments for the action.
     * @returns A message containing the transaction hash.
     */
    borrowAsset(walletProvider: EvmWalletProvider, args: z.infer<typeof BorrowSchema>): Promise<string> {
        // Implementation of borrowAsset method
        throw new Error("Method not implemented");
    }

    /**
     * Repay borrowed assets to Aave V3 protocol
     *
     * @param walletProvider - The wallet provider to use for the action.
     * @param args - The input arguments for the action.
     * @returns A message containing the transaction hash.
     */
    repayLoan(walletProvider: EvmWalletProvider, args: z.infer<typeof RepaySchema>): Promise<string> {
        // Implementation of repayLoan method
        throw new Error("Method not implemented");
    }

    /**
     * Withdraw supplied assets from Aave V3 protocol
     *
     * @param walletProvider - The wallet provider to use for the action.
     * @param args - The input arguments for the action.
     * @returns A message containing the transaction hash.
     */
    async withdrawAsset(walletProvider: EvmWalletProvider, args: z.infer<typeof WithdrawSchema>): Promise<string> {
        try {
            const assetAddress = getAssetAddress(args.asset);
            const amount = BigInt(args.amount);

            // Encode withdraw parameters
            const encodedParams = await walletProvider.readContract({
                address: AAVE_L2_ENCODER,
                abi: L2_ENCODER_ABI,
                functionName: 'encodeWithdrawParams',
                args: [assetAddress, amount]
            });

            // Execute withdraw transaction
            const hash = await walletProvider.sendTransaction({
                to: AAVE_POOL_ADDRESS,
                data: encodedParams as `0x${string}`
            });

            await walletProvider.waitForTransactionReceipt(hash);

            return hash;
        } catch (error) {
            throw createAaveError(AaveErrorCode.TRANSACTION_FAILED, error);
        }
    }
}

export const aaveProtocolActionProvider = () => new AaveProtocolActionProvider();