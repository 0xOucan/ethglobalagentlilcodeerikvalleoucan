declare module 'nillion-sv-wrappers' {
    export interface Node {
        url: string;
        did: string;
        jwt?: string;
    }

    export interface OrgCredentials {
        secretKey: string;
        orgDid: string;
    }

    export interface InventoryItem {
        _id: string;
        productCode: string;
        productName: string;
        initialStock: number;
        cost: number;
        salePrice: number;
        sales: number;
        returns: number;
    }

    export class SecretVaultWrapper {
        constructor(
            nodes: Node[],
            credentials: OrgCredentials,
            schemaId?: string | null,
            operation?: string,
            tokenExpirySeconds?: number
        );

        init(): Promise<void>;
        generateNodeToken(nodeDid: string): Promise<string>;
        generateTokensForAllNodes(): Promise<Array<{ node: string; token: string }>>;
        createRecord(collection: string, data: any): Promise<any>;
        getRecords<T>(collection: string, filter?: object): Promise<T[]>;
        updateRecord(collection: string, filter: object, update: object): Promise<any>;
    }

    export class NilQLWrapper {
        constructor(cluster: { nodes: Node[] }, operation?: string);
        init(): Promise<void>;
        encrypt(data: any): Promise<any[]>;
        decrypt(shares: any[]): Promise<any>;
    }
}