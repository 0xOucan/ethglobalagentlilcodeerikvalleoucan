import { USDC_ADDRESS, WETH_ADDRESS } from "./constants";

export const getAssetDecimals = (asset: "USDC" | "WETH") => {
  switch (asset) {
    case "USDC":
      return 6;
    case "WETH":
      return 18;
    default:
      throw new Error("Unsupported asset");
  }
};

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