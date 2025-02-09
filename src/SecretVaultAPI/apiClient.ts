import axios from 'axios';
import { SecretVaultConfig } from './config';
import { createJWT, ES256KSigner } from 'did-jwt';
import { Buffer } from 'buffer';
import { v4 as uuidv4 } from 'uuid';

export class SecretVaultApiClient {
  private readonly nodes: Array<{url: string, did: string, jwt: string}>;
  private readonly credentials: { secretKey: string, orgDid: string };
  private readonly tokenExpirySeconds: number;

  constructor(config: SecretVaultConfig, tokenExpirySeconds: number = 3600) {
    this.credentials = {
      secretKey: config.orgCredentials.secretKey,
      orgDid: config.orgCredentials.orgDid
    };
    this.tokenExpirySeconds = tokenExpirySeconds;
    this.nodes = config.nodes.map(node => ({
      url: node.url,
      did: node.did,
      jwt: '', // Will be generated in init()
    }));
  }

  private async generateNodeToken(nodeDid: string): Promise<string> {
    const signer = ES256KSigner(Buffer.from(this.credentials.secretKey, 'hex'));
    const payload = {
      iss: this.credentials.orgDid,
      aud: nodeDid,
      exp: Math.floor(Date.now() / 1000) + this.tokenExpirySeconds,
    };
    return await createJWT(payload, {
      issuer: this.credentials.orgDid,
      signer,
    });
  }

  async init(): Promise<void> {
    // Generate JWT tokens for all nodes
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].jwt = await this.generateNodeToken(this.nodes[i].did);
    }
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.nodes[0].jwt}`,
      'Content-Type': 'application/json',
    };
  }

  private getNodeHeaders(nodeJwt: string) {
    return {
      Authorization: `Bearer ${nodeJwt}`,
      'Content-Type': 'application/json',
    };
  }

  async getHealth() {
    const response = await axios.get(`${this.nodes[0].url}/health`);
    return response.data;
  }

  async getNodeDetails() {
    const response = await axios.get(`${this.nodes[0].url}/about`);
    return response.data;
  }

  async createSchema(schema: {
    _id: string;
    name: string;
    keys: string[];
    schema: object;
  }) {
    const results = await Promise.all(
      this.nodes.map(node => 
        axios.post(
          `${node.url}/api/v1/schemas`,
          schema,
          { headers: this.getNodeHeaders(node.jwt) }
        )
      )
    );
    return results[0].data;
  }

  async deleteSchema(id: string) {
    const response = await axios.delete(
      `${this.nodes[0].url}/api/v1/schemas`,
      {
        headers: this.headers,
        data: { id }
      }
    );
    return response.data;
  }

  async createRecord(schemaId: string, data: any[]): Promise<any> {
    // Add _id if not present
    const recordsWithId = data.map(record => ({
      ...record,
      _id: record._id || uuidv4(),
      created_at: record.created_at || new Date().toISOString()
    }));

    const results = await Promise.all(
      this.nodes.map(node => 
        axios.post(
          `${node.url}/api/v1/data/create`,
          {
            schema: schemaId,
            data: recordsWithId
          },
          { headers: this.getNodeHeaders(node.jwt) }
        )
      )
    );
    return results[0].data;
  }

  async readRecords(schemaId: string, filter: object = {}): Promise<any[]> {
    const response = await axios.post(
      `${this.nodes[0].url}/api/v1/data/read`,
      {
        schema: schemaId,
        filter
      },
      { headers: this.getNodeHeaders(this.nodes[0].jwt) }
    );
    return response.data.data;
  }

  async updateRecords(schemaId: string, filter: object, update: object): Promise<any> {
    const results = await Promise.all(
      this.nodes.map(node =>
        axios.post(
          `${node.url}/api/v1/data/update`,
          {
            schema: schemaId,
            filter,
            update: { $set: update }
          },
          { headers: this.getNodeHeaders(node.jwt) }
        )
      )
    );
    return results[0].data;
  }

  async deleteRecords(schemaId: string, filter: object): Promise<any> {
    const results = await Promise.all(
      this.nodes.map(node =>
        axios.post(
          `${node.url}/api/v1/data/delete`,
          {
            schema: schemaId,
            filter
          },
          { headers: this.getNodeHeaders(node.jwt) }
        )
      )
    );
    return results[0].data;
  }

  async flushSchema(schemaId: string) {
    const response = await axios.post(
      `${this.nodes[0].url}/api/v1/data/flush`,
      {
        schema: schemaId
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async listQueries() {
    const response = await axios.get(
      `${this.nodes[0].url}/api/v1/queries`,
      { headers: this.headers }
    );
    return response.data;
  }

  async createQuery(query: {
    _id: string;
    name: string;
    schema: string;
    variables: object;
    pipeline: object[];
  }) {
    const response = await axios.post(
      `${this.nodes[0].url}/api/v1/queries`,
      query,
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteQuery(id: string) {
    const response = await axios.delete(
      `${this.nodes[0].url}/api/v1/queries`,
      {
        headers: this.headers,
        data: { id }
      }
    );
    return response.data;
  }
} 