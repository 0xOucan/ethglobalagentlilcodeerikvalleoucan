   // src/integrations/nillionSecretVault/wrapper.d.ts
   declare module 'nillion-sv-wrappers/SecretVault/wrapper' {
    export interface NodeConfig {
      url: string;
      did: string;
    }

    export interface Credentials {
      orgDid: string;
      secretKey: string;
    }

    export interface SchemaDefinition {
      _id: string;
      name: string;
      keys: string[];
      schema: object;
    }

    export class SecretVaultWrapper {
      constructor(
        nodes: NodeConfig[],
        credentials: Credentials,
        schemaId?: string | null,
        operation?: string,
        tokenExpirySeconds?: number
      );

      init(): Promise<any>;
      setSchemaId(schemaId: string, operation?: string): void;
      generateNodeToken(nodeDid: string): Promise<string>;
      generateTokensForAllNodes(): Promise<Array<{ node: string; token: string }>>;
      
      makeRequest(
        nodeUrl: string,
        endpoint: string,
        token: string,
        payload: any,
        method?: string
      ): Promise<any>;

      allotData(data: any[]): Promise<any[]>;
      flushData(): Promise<Array<{ node: string; result: any }>>;
      getSchemas(): Promise<any[]>;
      
      createSchema(
        schema: object,
        schemaName: string,
        schemaId?: string | null
      ): Promise<Array<{ node: string; result: any }>>;

      deleteSchema(schemaId: string): Promise<Array<{ node: string; result: any }>>;
      
      writeToNodes(
        data: any[]
      ): Promise<Array<{ node: string; result: any } | { node: string; error: string }>>;
      
      readFromNodes(
        filter?: object
      ): Promise<any[]>;
      
      updateDataToNodes(
        recordUpdate: any,
        filter?: object
      ): Promise<Array<{ node: string; result: any } | { node: string; error: string }>>;
      
      deleteDataFromNodes(
        filter?: object
      ): Promise<Array<{ node: string; result: any } | { node: string; error: string }>>;
    }
  }