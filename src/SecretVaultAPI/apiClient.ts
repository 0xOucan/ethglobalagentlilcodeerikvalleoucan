import axios from 'axios';
import { createSecretVaultConfig, SecretVaultConfig } from './config';
import { createJWT, ES256KSigner } from 'did-jwt';
import { Buffer } from 'buffer';
import { createStoreData, createInventoryData, createSaleData } from './schemas';

export class SecretVaultApiClient {
  private readonly node: { url: string; did: string };
  private readonly credentials: { secretKey: string; orgDid: string };
  private initialized: boolean = false;

  constructor(config: SecretVaultConfig) {
    this.credentials = {
      secretKey: config.orgCredentials.secretKey,
      orgDid: config.orgCredentials.orgDid
    };
    this.node = {
      url: config.nodes[0].url,
      did: config.nodes[0].did
    };
  }

  private async generateToken(): Promise<string> {
    try {
      const signer = ES256KSigner(Buffer.from(this.credentials.secretKey, 'hex'));
      const payload = {
        iss: this.credentials.orgDid,
        aud: this.node.did,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      };

      return await createJWT(payload, {
        issuer: this.credentials.orgDid,
        signer,
        alg: 'ES256K'
      });
    } catch (error) {
      console.error('Token generation failed:', error);
      return '';
    }
  }

  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    if (!this.initialized) {
      return null;
    }

    try {
      const token = await this.generateToken();
      if (!token) return null;

      const response = await axios({
        method,
        url: `${this.node.url}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        data,
        validateStatus: (status) => status < 500
      });

      return response.data;
    } catch (error: any) {
      console.error('Request failed:', error.message);
      return null;
    }
  }

  async init(): Promise<boolean> {
    try {
      // Test token generation
      const token = await this.generateToken();
      if (!token) {
        console.log('Token generation skipped');
        return false;
      }

      // Test connection - don't throw on 404
      try {
        await axios({
          method: 'GET',
          url: `${this.node.url}/api/v1/health`,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          validateStatus: (status) => status < 500
        });
      } catch (error) {
        console.log('Health check skipped');
      }

      this.initialized = true;
      console.log('SecretVault client initialized in fallback mode');
      return true;
    } catch (error: any) {
      console.log('Initialization skipped:', error.message);
      return false;
    }
  }

  // Modified store operations to handle failures gracefully
  async createStore(
    storeName: string,
    location: string,
    ownerName: string,
    contactInfo: string
  ): Promise<any> {
    const storeData = createStoreData(storeName, location, ownerName, contactInfo);
    const result = await this.makeRequest('POST', '/api/v1/records/store', [storeData]);
    return result || { error: 'Store creation failed' };
  }

  async getStores(): Promise<any> {
    const result = await this.makeRequest('GET', '/api/v1/records/store');
    return result || [];
  }

  // Modified inventory operations to handle failures gracefully
  async createInventory(
    storeId: string,
    products: Array<{
      productName: string;
      quantity: number;
      salePrice: number;
    }>
  ): Promise<any> {
    const inventoryData = products.map(product => 
      createInventoryData(
        product.productName,
        product.quantity,
        product.salePrice,
        storeId
      )
    );
    const result = await this.makeRequest('POST', '/api/v1/records/inventory', inventoryData);
    return result || { error: 'Inventory creation failed' };
  }

  async getInventory(storeId: string): Promise<any> {
    const result = await this.makeRequest('GET', `/api/v1/records/inventory?storeId=${storeId}`);
    return result || [];
  }
}

// Example usage
async function example() {
  try {
    const config = await createSecretVaultConfig();
    const client = new SecretVaultApiClient(config);
    
    // Initialize first
    await client.init();
    
    // Create a store
    const store = await client.createStore(
      "Tech Store",
      "123 Main St",
      "John Doe",
      "john@techstore.com"
    );
    console.log('Store created:', store);
    
    // Add inventory
    const inventory = await client.createInventory(
      store._id,
      [
        { productName: "Laptop", quantity: 10, salePrice: 999.99 },
        { productName: "Phone", quantity: 20, salePrice: 599.99 }
      ]
    );
    console.log('Inventory added:', inventory);
    
  } catch (error: any) {
    console.error('Operation failed:', error.message);
  }
}