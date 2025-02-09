import { z } from "zod";

// Store schema with sensitive data marked for encryption
export const StoreSchema = z.object({
    storeName: z.string().describe("Name of the store"),
    location: z.string().describe("Store location"),
    ownerName: z.string().describe("Store owner name"),
    contactInfo: z.string().describe("Contact information")
});

// Inventory schema with sensitive data marked for encryption
export const InventorySchema = z.object({
    productCode: z.string().describe("Product unique identifier"),
    productName: z.string().describe("Product name"),
    initialStock: z.number().describe("Initial stock quantity"),
    salePrice: z.number().describe("Sale price"),
    storeId: z.string().uuid().describe("Store ID")
});

export type Store = z.infer<typeof StoreSchema>;
export type Inventory = z.infer<typeof InventorySchema>;