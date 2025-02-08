import { z } from "zod";

export const SupplySchema = z.object({
  asset: z.enum(["USDC", "WETH"]).describe("Asset to supply (USDC or WETH)"),
  amount: z.string().describe(
    "Amount to supply (e.g., '0.1' for 0.1 WETH or '100' for 100 USDC)"
  ),
});

export const WithdrawSchema = z.object({
  asset: z.enum(["USDC", "WETH"]).describe("Asset to withdraw (USDC or WETH)"),
  amount: z.string().describe("Amount to withdraw in base units (wei for WETH, 6 decimals for USDC)"),
});

export const BorrowSchema = z.object({
  asset: z.enum(["USDC", "WETH"]).describe("Asset to borrow (USDC or WETH)"),
  amount: z.string().describe("Amount to borrow in base units (wei for WETH, 6 decimals for USDC)"),
  interestRateMode: z.number().default(2).describe("Interest rate mode (2 for variable rate)"),
});

export const RepaySchema = z.object({
  asset: z.enum(["USDC", "WETH"]).describe("Asset to repay (USDC or WETH)"),
  amount: z.string().describe("Amount to repay in base units (wei for WETH, 6 decimals for USDC)"),
  interestRateMode: z.number().default(2).describe("Interest rate mode (2 for variable rate)"),
});