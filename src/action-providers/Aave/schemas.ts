import { z } from "zod";

export const SupplySchema = z.object({
  asset: z.enum(["USDC", "WETH"]).describe("Asset to supply (USDC or WETH)"),
  amount: z.string().describe("Amount to supply in base units (wei for WETH, 6 decimals for USDC)"),
});

export const BorrowSchema = z.object({
  asset: z.enum(["USDC", "WETH"]).describe("Asset to borrow (USDC or WETH)"),
  amount: z.string().describe("Amount to borrow in base units (wei for WETH, 6 decimals for USDC)"),
  interestRateMode: z
    .enum(["VARIABLE", "STABLE"])
    .describe("Interest rate mode (VARIABLE or STABLE)"),
});

export const RepaySchema = z.object({
  asset: z.enum(["USDC", "WETH"]).describe("Asset to repay (USDC or WETH)"),
  amount: z
    .string()
    .describe(
      "Amount to repay in base units (wei for WETH, 6 decimals for USDC). Use -1 for full debt",
    ),
  interestRateMode: z
    .enum(["VARIABLE", "STABLE"])
    .describe("Interest rate mode (VARIABLE or STABLE)"),
});

export const WithdrawSchema = z.object({
  asset: z.enum(["USDC", "WETH"]).describe("Asset to withdraw (USDC or WETH)"),
  amount: z
    .string()
    .describe(
      "Amount to withdraw in base units (wei for WETH, 6 decimals for USDC). Use -1 for max available",
    ),
});