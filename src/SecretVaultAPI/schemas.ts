import { z } from "zod";

// Store schema with simplified required fields
export const StoreSchema = z.object({
    _id: z.string().uuid().optional(), // Auto-generated if not provided
    storeName: z.string().min(1).describe("Name of the store"),
    location: z.string().min(1).describe("Store location"),
    ownerName: z.string().min(1).describe("Store owner name"),
    contactInfo: z.string().min(1).describe("Contact information"),
    created_at: z.string().optional() // Auto-generated timestamp
});

// Inventory schema with simplified required fields
export const InventorySchema = z.object({
    _id: z.string().uuid().optional(), // Auto-generated if not provided
    productCode: z.string().min(1).describe("Product unique identifier"),
    productName: z.string().min(1).describe("Product name"),
    quantity: z.number().min(0).describe("Current stock quantity"),
    salePrice: z.number().min(0).describe("Sale price"),
    storeId: z.string().describe("Store ID"),
    created_at: z.string().optional() // Auto-generated timestamp
});

// Sale schema to track sales
export const SaleSchema = z.object({
    _id: z.string().uuid().optional(), // Auto-generated if not provided
    productId: z.string().describe("Product ID"),
    storeId: z.string().describe("Store ID"),
    quantity: z.number().min(1).describe("Quantity sold"),
    salePrice: z.number().min(0).describe("Price at time of sale"),
    saleDate: z.string().optional(), // Auto-generated timestamp
    created_at: z.string().optional() // Auto-generated timestamp
});

export type Store = z.infer<typeof StoreSchema>;
export type Inventory = z.infer<typeof InventorySchema>;
export type Sale = z.infer<typeof SaleSchema>;

// Helper functions for creating records
export const createStoreData = (
    storeName: string,
    location: string,
    ownerName: string,
    contactInfo: string
): Store => ({
    storeName,
    location,
    ownerName,
    contactInfo
});

export const createInventoryData = (
    productName: string,
    quantity: number,
    salePrice: number,
    storeId: string,
    productCode?: string
): Inventory => ({
    productCode: productCode || `PRD-${Math.random().toString(36).substr(2, 9)}`,
    productName,
    quantity,
    salePrice,
    storeId
});

export const createSaleData = (
    productId: string,
    storeId: string,
    quantity: number,
    salePrice: number
): Sale => ({
    productId,
    storeId,
    quantity,
    salePrice,
    saleDate: new Date().toISOString()
});