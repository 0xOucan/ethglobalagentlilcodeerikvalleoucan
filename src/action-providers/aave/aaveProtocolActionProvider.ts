import { ActionProvider, Network, EvmWalletProvider } from "@coinbase/agentkit";
import { Contract } from "ethers";
import { z } from "zod";
import { 
  AAVE_POOL_ADDRESS, 
  AAVE_L2_ENCODER, 
  AAVE_POOL_ABI, 
  L2_ENCODER_ABI 
} from "./constants";
import { 
  AaveSupplySchema, 
  AaveBorrowSchema 
} from "./schemas";
import { CreateAction } from "../actionDecorator";

export class AaveProtocolActionProvider extends ActionProvider {
    constructor() {
        super("aave-protocol-action-provider", []);
    }

    @CreateAction({
        name: "supply",
        description: `
Supply assets to Aave V3 protocol on Base Sepolia.
Requires asset type (USDC or WETH) and amount in base units.
        `,
        schema: AaveSupplySchema,
    })
    async supplyAsset(walletProvider: EvmWalletProvider, args: z.infer<typeof AaveSupplySchema>): Promise<string> {
        try {
            const poolContract = new Contract(
                AAVE_POOL_ADDRESS,
                AAVE_POOL_ABI,
                walletProvider
            );
            // Rest of implementation...
            return "Success message";
        } catch (error) {
            return `Error: ${error}`;
        }
    }

    supportsNetwork = (network: Network): boolean => {
        return Number(network.chainId) === 84532;
    };
}

export const aaveProtocolActionProvider = () => new AaveProtocolActionProvider(); 