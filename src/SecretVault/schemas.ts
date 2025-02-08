import { z } from "zod";

// Store schema with sensitive data marked for encryption
export const StoreSchema = z.object({
    _id: z.string().uuid(),
    storeName: z.object({ $allot: z.string() }).describe("Name of the store (encrypted)"),
    storeOwnerName: z.object({ $allot: z.string() }).describe("Name of the store owner (encrypted)"),
    description: z.string().describe("Store description"),
    geolocalization: z.string().describe("Store location coordinates"),
}).strict();

// Inventory schema with sensitive data marked for encryption
export const InventorySchema = z.object({
    _id: z.string().uuid(),
    productCode: z.string().describe("Unique product code"),
    productName: z.string().describe("Name of the product"),
    initialStock: z.object({ $allot: z.number() }).describe("Initial stock quantity (encrypted)"),
    cost: z.object({ $allot: z.number() }).describe("Product cost (encrypted)"),
    salePrice: z.number().min(0).describe("Product sale price"),
    sales: z.number().int().min(0).default(0).describe("Number of sales"),
    returns: z.number().int().min(0).default(0).describe("Number of returns"),
}).strict();

export type Store = z.infer<typeof StoreSchema>;
export type Inventory = z.infer<typeof InventorySchema>;