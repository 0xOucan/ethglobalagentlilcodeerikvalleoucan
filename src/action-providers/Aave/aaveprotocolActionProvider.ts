import "reflect-metadata";
import { z } from "zod";
import { ActionProvider, CreateAction } from "@coinbase/agentkit";
import { Network } from "@coinbase/agentkit";
import { EvmWalletProvider } from "@coinbase/agentkit";
import { 
  AAVE_POOL_ADDRESS, 
  POOL_ABI,
  ERC20_ABI
} from "./constants";
import { getAssetAddress, parseAmount, formatAmount, displayBalance } from "./utils";
import { createAaveError, AaveErrorCode, AaveError, isAaveError } from "./errors";
import { encodeFunctionData } from 'viem';
import type { Hex, Address } from 'viem';

// Define base schemas
const AssetSchema = z.enum(["USDC", "WETH"]).describe("Asset to interact with (USDC or WETH)");
const AmountSchema = z.string().describe("Amount in base units (6 decimals for USDC, 18 for WETH)");
const InterestRateSchema = z.enum(["VARIABLE", "STABLE"]).default("VARIABLE");

// Action schemas
export const SupplySchema = z.object({
  asset: AssetSchema,
  amount: AmountSchema,
});

export const WithdrawSchema = z.object({
  asset: AssetSchema,
  amount: AmountSchema,
});

export const BorrowSchema = z.object({
  asset: AssetSchema,
  amount: AmountSchema,
  interestRateMode: InterestRateSchema,
});

export const RepaySchema = z.object({
  asset: AssetSchema,
  amount: AmountSchema,
  interestRateMode: InterestRateSchema,
});

/**
 * AaveProtocolActionProvider is an action provider for Aave V3 protocol interactions.
 */
export class AaveProtocolActionProvider extends ActionProvider<EvmWalletProvider> {
    constructor() {
        super("aave", []);
    }

    @CreateAction({
        name: "supply",
        description: `
            Supply assets to the Aave protocol.
            This action will supply the specified amount of an asset (USDC or WETH) to Aave.
            The user will receive aTokens in return, representing their supplied position.
        `,
        schema: SupplySchema
    })
    async supply(
        walletProvider: EvmWalletProvider, 
        args: z.infer<typeof SupplySchema>
    ): Promise<string> {
        try {
            // Parse amount with proper decimals
            const amountInWei = parseAmount(args.amount, args.asset);
            
            if (amountInWei <= BigInt(0)) {
                throw createAaveError(
                    AaveErrorCode.INVALID_AMOUNT,
                    "Amount must be greater than 0"
                );
            }

            const assetAddress = getAssetAddress(args.asset) as Address;
            const userAddress = (await walletProvider.getAddress()) as Address;

            // Check balance with proper formatting
            const balance = await walletProvider.readContract({
                address: assetAddress,
                abi: ERC20_ABI,
                functionName: "balanceOf",
                args: [userAddress]
            }) as bigint;

            if (amountInWei > balance) {
                throw createAaveError(
                    AaveErrorCode.INSUFFICIENT_BALANCE,
                    {
                        asset: args.asset,
                        requested: displayBalance(amountInWei, args.asset),
                        available: displayBalance(balance, args.asset),
                        rawBalance: balance.toString(),
                        rawRequested: amountInWei.toString()
                    }
                );
            }

            // Add minimum amount check
            const minimumAmount = parseAmount("0.0001", args.asset); // Set minimum to 0.0001 units
            if (amountInWei < minimumAmount) {
                throw createAaveError(
                    AaveErrorCode.INVALID_AMOUNT,
                    {
                        message: "Amount is below minimum required",
                        minimum: displayBalance(minimumAmount, args.asset),
                        provided: displayBalance(amountInWei, args.asset)
                    }
                );
            }

            // Check allowance
            const allowance = await walletProvider.readContract({
                address: assetAddress,
                abi: ERC20_ABI,
                functionName: "allowance",
                args: [userAddress, AAVE_POOL_ADDRESS as Address]
            }) as bigint;

            // Approve if needed
            if (amountInWei > allowance) {
                const approvalData = encodeFunctionData({
                    abi: ERC20_ABI,
                    functionName: "approve",
                    args: [AAVE_POOL_ADDRESS as Address, amountInWei]
                }) as Hex;

                const approvalTx = await walletProvider.sendTransaction({
                    to: assetAddress,
                    data: approvalData
                });
                
                try {
                    await walletProvider.waitForTransactionReceipt(approvalTx);
                } catch (error) {
                    throw createAaveError(
                        AaveErrorCode.APPROVAL_FAILED,
                        `Failed to approve ${args.asset}: ${error}`
                    );
                }
            }

            // Supply to Aave
            const supplyData = encodeFunctionData({
                abi: POOL_ABI,
                functionName: "supply",
                args: [assetAddress, amountInWei, userAddress, 0]
            }) as Hex;

            const hash = await walletProvider.sendTransaction({
                to: AAVE_POOL_ADDRESS as Address,
                data: supplyData
            });

            try {
                await walletProvider.waitForTransactionReceipt(hash);
                return `Successfully supplied ${displayBalance(amountInWei, args.asset)} ${args.asset} to Aave. Transaction hash: ${hash}`;
            } catch (error) {
                throw createAaveError(
                    AaveErrorCode.SUPPLY_FAILED,
                    `Failed to supply ${args.asset}: ${error}`
                );
            }
        } catch (error) {
            if (isAaveError(error)) {
                throw error;
            }
            throw createAaveError(AaveErrorCode.TRANSACTION_FAILED, error);
        }
    }

    @CreateAction({
        name: "withdraw",
        description: `
            Withdraw supplied assets from the Aave protocol.
            This action will withdraw the specified amount of an asset (USDC or WETH) from Aave.
        `,
        schema: WithdrawSchema
    })
    async withdraw(
        walletProvider: EvmWalletProvider,
        args: z.infer<typeof WithdrawSchema>
    ): Promise<string> {
        try {
            const assetAddress = getAssetAddress(args.asset) as Address;
            const userAddress = (await walletProvider.getAddress()) as Address;

            const withdrawData = encodeFunctionData({
                abi: POOL_ABI,
                functionName: "withdraw",
                args: [assetAddress, BigInt(args.amount), userAddress]
            }) as Hex;

            const hash = await walletProvider.sendTransaction({
                to: AAVE_POOL_ADDRESS as Address,
                data: withdrawData
            });

            await walletProvider.waitForTransactionReceipt(hash);
            return `Successfully withdrew ${args.amount} ${args.asset} from Aave. Transaction hash: ${hash}`;
        } catch (error) {
            throw createAaveError(AaveErrorCode.TRANSACTION_FAILED, error);
        }
    }

    @CreateAction({
        name: "borrow",
        description: `
            Borrow assets from the Aave protocol.
            This action will borrow the specified amount of an asset (USDC or WETH) from Aave.
            The user must have sufficient collateral supplied.
        `,
        schema: BorrowSchema
    })
    async borrow(
        walletProvider: EvmWalletProvider,
        args: z.infer<typeof BorrowSchema>
    ): Promise<string> {
        try {
            const assetAddress = getAssetAddress(args.asset) as Address;
            const userAddress = (await walletProvider.getAddress()) as Address;
            const interestRateMode = args.interestRateMode === "VARIABLE" ? 2 : 1;

            const borrowData = encodeFunctionData({
                abi: POOL_ABI,
                functionName: "borrow",
                args: [assetAddress, BigInt(args.amount), BigInt(interestRateMode), 0, userAddress]
            }) as Hex;

            const hash = await walletProvider.sendTransaction({
                to: AAVE_POOL_ADDRESS as Address,
                data: borrowData
            });

            await walletProvider.waitForTransactionReceipt(hash);
            return `Successfully borrowed ${args.amount} ${args.asset} from Aave. Transaction hash: ${hash}`;
        } catch (error) {
            throw createAaveError(AaveErrorCode.TRANSACTION_FAILED, error);
        }
    }

    @CreateAction({
        name: "repay",
        description: `
            Repay borrowed assets to the Aave protocol.
            This action will repay the specified amount of an asset (USDC or WETH).
        `,
        schema: RepaySchema
    })
    async repay(
        walletProvider: EvmWalletProvider,
        args: z.infer<typeof RepaySchema>
    ): Promise<string> {
        try {
            const assetAddress = getAssetAddress(args.asset) as Address;
            const userAddress = (await walletProvider.getAddress()) as Address;
            const interestRateMode = args.interestRateMode === "VARIABLE" ? 2 : 1;

            const approvalData = encodeFunctionData({
                abi: ERC20_ABI,
                functionName: "approve",
                args: [AAVE_POOL_ADDRESS as Address, BigInt(args.amount)]
            }) as Hex;

            const approvalTx = await walletProvider.sendTransaction({
                to: assetAddress,
                data: approvalData
            });
            await walletProvider.waitForTransactionReceipt(approvalTx);

            const repayData = encodeFunctionData({
                abi: POOL_ABI,
                functionName: "repay",
                args: [assetAddress, BigInt(args.amount), BigInt(interestRateMode), userAddress]
            }) as Hex;

            const hash = await walletProvider.sendTransaction({
                to: AAVE_POOL_ADDRESS as Address,
                data: repayData
            });

            await walletProvider.waitForTransactionReceipt(hash);
            return `Successfully repaid ${args.amount} ${args.asset} to Aave. Transaction hash: ${hash}`;
        } catch (error) {
            throw createAaveError(AaveErrorCode.TRANSACTION_FAILED, error);
        }
    }

    supportsNetwork = (network: Network) => network.chainId === "84532"; // Base Sepolia chainId
}

export const aaveProtocolActionProvider = () => new AaveProtocolActionProvider();