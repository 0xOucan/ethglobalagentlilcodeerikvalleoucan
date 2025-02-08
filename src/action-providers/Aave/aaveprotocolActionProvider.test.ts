import { AaveProtocolActionProvider, aaveProtocolActionProvider } from "./aaveprotocolActionProvider";
import { EvmWalletProvider } from "@coinbase/agentkit";
import { Contract } from "ethers";
import { AAVE_POOL_ADDRESS, AAVE_L2_ENCODER } from "./constants";

const MOCK_AMOUNT = "1000000"; // 1 USDC
const MOCK_ADDRESS = "0x1234567890123456789012345678901234543210";
const MOCK_HASH = "0x1234567890123456789012345678901234567890";

describe("AaveProtocolActionProvider", () => {
    let provider: AaveProtocolActionProvider;
    let mockWallet: jest.Mocked<Partial<EvmWalletProvider>>;

    beforeEach(() => {
        provider = aaveProtocolActionProvider();
        mockWallet = {
            getAddress: jest.fn().mockResolvedValue(MOCK_ADDRESS),
            sendTransaction: jest.fn().mockResolvedValue(MOCK_HASH),
            waitForTransactionReceipt: jest.fn().mockResolvedValue({ hash: MOCK_HASH }),
            readContract: jest.fn().mockResolvedValue("0x")
        };
    });

    it("should support the base-sepolia network", () => {
        const result = provider.supportsNetwork({
            protocolFamily: "evm",
            networkId: "base-sepolia",
        });
        expect(result).toBe(true);
    });

    describe("supplyAsset", () => {
        it("should successfully supply assets", async () => {
            const args = {
                asset: "USDC" as const,
                amount: MOCK_AMOUNT,
            };

            const response = await provider.supplyAsset(mockWallet as EvmWalletProvider, args);
            expect(response).toBe(MOCK_HASH);
        });
    });

    describe("withdrawAsset", () => {
        it("should successfully withdraw assets", async () => {
            const args = {
                asset: "USDC" as const,
                amount: MOCK_AMOUNT,
            };

            const response = await provider.withdrawAsset(mockWallet as EvmWalletProvider, args);
            expect(response).toBe(MOCK_HASH);
        });
    });

    // Add more test cases for other methods
}); 