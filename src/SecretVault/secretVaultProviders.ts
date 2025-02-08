/// <reference path="../types/nillion-sv-wrappers.d.ts" />

import { z } from "zod";
import { ActionProvider, CreateAction, Network, WalletProvider } from "@coinbase/agentkit";
import { SecretVaultWrapper, InventoryItem } from 'nillion-sv-wrappers';
import { StoreSchema, InventorySchema } from './schemas';
import { createSecretVaultConfig, generateJWTTokens } from './config';

export class SecretVaultActionProvider extends ActionProvider<WalletProvider> {
    private svWrapper!: SecretVaultWrapper;
    private initialized: boolean = false;

    constructor() {
        super("secret-vault", []);
        this.initializeWrapper().catch(console.error);
    }

    private async initializeWrapper(): Promise<void> {
        try {
            const config = createSecretVaultConfig();
            await generateJWTTokens(config);
            this.svWrapper = new SecretVaultWrapper(config.nodes, config.orgCredentials);
            await this.svWrapper.init();
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize SecretVault wrapper:', error);
            throw error;
        }
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            throw new Error('SecretVault wrapper not initialized');
        }
    }

    supportsNetwork(_network: Network): boolean {
        return true; // SecretVault works with any network
    }

    @CreateAction({
        name: "create_store",
        description: "Create a new store record in SecretVault",
        schema: StoreSchema,
    })
    async createStore(_walletProvider: WalletProvider, args: z.infer<typeof StoreSchema>): Promise<string> {
        try {
            const storeData = {
                created_at: new Date().toISOString(),
                ...args,
                _id: crypto.randomUUID(),
            };

            await this.svWrapper.createRecord("stores", storeData);
            return `Successfully created store: ${args.storeName}`;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return `Failed to create store: ${errorMessage}`;
        }
    }

    @CreateAction({
        name: "create_inventory",
        description: "Create a new inventory record in SecretVault",
        schema: InventorySchema,
    })
    async createInventory(_walletProvider: WalletProvider, args: z.infer<typeof InventorySchema>): Promise<string> {
        try {
            const inventoryData = {
                ...args,
                _id: crypto.randomUUID(),
                created_at: new Date().toISOString()
            };

            await this.svWrapper.createRecord("inventory", inventoryData);
            return `Successfully created inventory record for: ${args.productName}`;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return `Failed to create inventory record: ${errorMessage}`;
        }
    }

    @CreateAction({
        name: "get_store",
        description: "Retrieve store information",
        schema: z.object({
            storeName: z.string().optional(),
        }),
    })
    async getStore(_walletProvider: WalletProvider, args: { storeName?: string }): Promise<string> {
        try {
            const filter = args.storeName ? { storeName: args.storeName } : {};
            const stores = await this.svWrapper.getRecords("stores", filter);
            return JSON.stringify(stores, null, 2);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return `Failed to retrieve store information: ${errorMessage}`;
        }
    }

    @CreateAction({
        name: "get_inventory",
        description: "Retrieve inventory information",
        schema: z.object({
            productCode: z.string().optional(),
        }),
    })
    async getInventory(_walletProvider: WalletProvider, args: { productCode?: string }): Promise<string> {
        try {
            const filter = args.productCode ? { productCode: args.productCode } : {};
            const inventory = await this.svWrapper.getRecords("inventory", filter);
            return JSON.stringify(inventory, null, 2);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return `Failed to retrieve inventory information: ${errorMessage}`;
        }
    }

    @CreateAction({
        name: "record_sale",
        description: "Record a product sale",
        schema: z.object({
            productCode: z.string(),
            quantity: z.number(),
        }),
    })
    async recordSale(_walletProvider: WalletProvider, args: { productCode: string, quantity: number }): Promise<string> {
        try {
            const inventory = await this.svWrapper.getRecords<InventoryItem>("inventory", { productCode: args.productCode });
            if (inventory.length === 0) {
                return `Product ${args.productCode} not found`;
            }

            const product = inventory[0] as InventoryItem;
            const currentStock = product.initialStock - product.sales + product.returns;
            
            if (currentStock < args.quantity) {
                return `Insufficient stock. Only ${currentStock} units available`;
            }

            await this.svWrapper.updateRecord(
                "inventory",
                { productCode: args.productCode },
                { sales: product.sales + args.quantity }
            );

            return `Successfully recorded sale of ${args.quantity} units of ${product.productName}`;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return `Failed to record sale: ${errorMessage}`;
        }
    }

    @CreateAction({
        name: "get_stock_report",
        description: "Get current stock levels report",
        schema: z.object({
            productCode: z.string().optional(),
        }),
    })
    async getStockReport(_walletProvider: WalletProvider, args: { productCode?: string }): Promise<string> {
        try {
            const filter = args.productCode ? { productCode: args.productCode } : {};
            const inventory = await this.svWrapper.getRecords<InventoryItem>("inventory", filter);
            
            const report = inventory.map((item: InventoryItem) => ({
                productCode: item.productCode,
                productName: item.productName,
                initialStock: item.initialStock,
                currentStock: item.initialStock - item.sales + item.returns,
                totalSales: item.sales,
                returns: item.returns
            }));

            return JSON.stringify(report, null, 2);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return `Failed to generate stock report: ${errorMessage}`;
        }
    }

    @CreateAction({
        name: "get_store_profile",
        description: "Retrieve encrypted store profile information",
        schema: z.object({
            storeId: z.string().uuid(),
        }),
    })
    async getStoreProfile(_walletProvider: WalletProvider, args: { storeId: string }): Promise<string> {
        await this.ensureInitialized();
        try {
            const store = await this.svWrapper.getRecords("stores", { _id: args.storeId });
            if (!store.length) {
                return "Store not found";
            }
            return JSON.stringify(store[0], null, 2);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return `Failed to retrieve store profile: ${errorMessage}`;
        }
    }

    @CreateAction({
        name: "get_inventory_report",
        description: "Generate a detailed inventory report",
        schema: z.object({
            storeId: z.string().uuid().optional(),
        }),
    })
    async getInventoryReport(_walletProvider: WalletProvider, args: { storeId?: string }): Promise<string> {
        await this.ensureInitialized();
        try {
            const filter = args.storeId ? { storeId: args.storeId } : {};
            const inventory = await this.svWrapper.getRecords<InventoryItem>("inventory", filter);
            
            const report = inventory.map((item: InventoryItem) => ({
                productCode: item.productCode,
                productName: item.productName,
                currentStock: item.initialStock - item.sales + item.returns,
                salePrice: item.salePrice,
                totalSales: item.sales,
                returns: item.returns
            }));

            return JSON.stringify(report, null, 2);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return `Failed to generate inventory report: ${errorMessage}`;
        }
    }
}