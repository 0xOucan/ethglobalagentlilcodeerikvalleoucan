import { USDC_ADDRESS, WETH_ADDRESS } from "./constants";

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