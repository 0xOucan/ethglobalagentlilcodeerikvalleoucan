import { AaveProtocolActionProvider, aaveProtocolActionProvider } from "./aaveprotocolActionProvider";
import { EvmWalletProvider } from "@coinbase/agentkit";
import { Network } from "@coinbase/agentkit";
import { AaveErrorCode } from "./errors";
import { parseAmount } from "./utils";

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
        const mockNetwork: Network = {
            protocolFamily: "evm",
            chainId: "84532"
        };
        const result = provider.supportsNetwork(mockNetwork);
        expect(result).toBe(true);
    });

    describe("supply", () => {
        it("should successfully supply assets", async () => {
            const args = {
                asset: "WETH" as const,
                amount: "0.1" // 0.1 WETH
            };

            // Mock balance check with proper decimals
            mockWallet.readContract = jest.fn()
                .mockResolvedValueOnce(parseAmount("0.2", "WETH")) // Balance
                .mockResolvedValueOnce(BigInt(0)); // Allowance

            const response = await provider.supply(mockWallet as EvmWalletProvider, args);
            expect(response).toContain(MOCK_HASH);
        });

        it("should fail with insufficient balance", async () => {
            const args = {
                asset: "WETH" as const,
                amount: "2000000000000000000" // 2 WETH
            };

            mockWallet.readContract = jest.fn()
                .mockResolvedValueOnce(BigInt("1000000000000000000")); // Lower balance

            await expect(async () => {
                await provider.supply(mockWallet as EvmWalletProvider, args);
            }).rejects.toThrow(expect.objectContaining({
                code: AaveErrorCode.INSUFFICIENT_BALANCE
            }));
        });
    });

    describe("withdraw", () => {
        it("should successfully withdraw assets", async () => {
            const args = {
                asset: "USDC" as const,
                amount: MOCK_AMOUNT,
            };

            const response = await provider.withdraw(mockWallet as EvmWalletProvider, args);
            expect(response).toContain(MOCK_HASH);
        });
    });

    describe("borrow", () => {
        it("should successfully borrow assets", async () => {
            const args = {
                asset: "USDC" as const,
                amount: MOCK_AMOUNT,
                interestRateMode: "VARIABLE" as const
            };

            const response = await provider.borrow(mockWallet as EvmWalletProvider, args);
            expect(response).toContain(MOCK_HASH);
        });
    });

    describe("repay", () => {
        it("should successfully repay assets", async () => {
            const args = {
                asset: "USDC" as const,
                amount: MOCK_AMOUNT,
                interestRateMode: "VARIABLE" as const
            };

            const response = await provider.repay(mockWallet as EvmWalletProvider, args);
            expect(response).toContain(MOCK_HASH);
        });
    });

    // Add more test cases for other methods
}); 