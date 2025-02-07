import { z } from "zod";

export const AaveSupplySchema = z.object({
    asset: z.enum(["USDC", "WETH"]).describe("Asset to supply (USDC or WETH)"),
    amount: z.string().describe("Amount to supply in base units"),
});

export const AaveBorrowSchema = z.object({
    asset: z.enum(["USDC", "WETH"]).describe("Asset to borrow"),
    amount: z.string().describe("Amount to borrow in base units"),
    interestRateMode: z.enum(["VARIABLE", "STABLE"]),
});