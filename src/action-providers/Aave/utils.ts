import { USDC_ADDRESS, WETH_ADDRESS } from "./constants";
import { formatUnits, parseUnits } from "viem";

export const getAssetAddress = (asset: "USDC" | "WETH") => {
    switch (asset) {
        case "USDC":
            return USDC_ADDRESS;
        case "WETH":
            return WETH_ADDRESS;
        default:
            throw new Error("Unsupported asset");
    }
};

export const getAssetDecimals = (asset: "USDC" | "WETH"): number => {
    switch (asset) {
        case "USDC":
            return 6;
        case "WETH":
            return 18;
        default:
            throw new Error("Unsupported asset");
    }
};

export const formatAmount = (amount: bigint, asset: "USDC" | "WETH"): string => {
    const decimals = getAssetDecimals(asset);
    return formatUnits(amount, decimals);
};

export const parseAmount = (amount: string, asset: "USDC" | "WETH"): bigint => {
    try {
        const decimals = getAssetDecimals(asset);
        // Handle scientific notation and validate number format
        const normalizedAmount = Number(amount).toString();
        if (isNaN(Number(normalizedAmount))) {
            throw new Error("Invalid number format");
        }
        return parseUnits(normalizedAmount, decimals);
    } catch (error) {
        throw new Error(`Failed to parse amount: ${amount}. Please use a valid number format.`);
    }
};

// Add this helper to properly display balances
export const displayBalance = (rawBalance: bigint, asset: "USDC" | "WETH"): string => {
    try {
        const formatted = formatAmount(rawBalance, asset);
        return `${formatted} ${asset}`;
    } catch (error) {
        return `${rawBalance.toString()} (raw units)`;
    }
}; 