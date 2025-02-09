import dotenv from 'dotenv';
import { z } from 'zod';
import { SecretVaultWrapper, Node } from 'nillion-sv-wrappers';

dotenv.config();

const NodeConfigSchema = z.object({
    url: z.string().url(),
    did: z.string(),
    jwt: z.string().optional()
});

const OrgCredentialsSchema = z.object({
    secretKey: z.string(),
    orgDid: z.string()
});

export interface SecretVaultConfig {
    orgCredentials: z.infer<typeof OrgCredentialsSchema>;
    nodes: z.infer<typeof NodeConfigSchema>[];
}

export async function createSecretVaultConfig(): Promise<SecretVaultConfig> {
    const requiredEnvVars = [
        'SV_PRIVATE_KEY',
        'SV_ORG_DID',
        'SV_NODE1_URL',
        'SV_NODE2_URL',
        'SV_NODE3_URL',
        'SCHEMA_ID_MERCHANT',
        'SCHEMA_ID_PRODUCT',
        'SCHEMA_ID_SALES',
        'SV_NODE1_DID',
        'SV_NODE2_DID',
        'SV_NODE3_DID'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    const config = {
        orgCredentials: {
            secretKey: process.env.SV_PRIVATE_KEY!,
            orgDid: process.env.SV_ORG_DID!,
        },
        nodes: [
            {
                url: process.env.SV_NODE1_URL!,
                did: process.env.SV_NODE1_DID!,
            },
            {
                url: process.env.SV_NODE2_URL!,
                did: process.env.SV_NODE2_DID!,
            },
            {
                url: process.env.SV_NODE3_URL!,
                did: process.env.SV_NODE3_DID!,
            },
        ],
    };

    // Validate config
    OrgCredentialsSchema.parse(config.orgCredentials);
    config.nodes.forEach(node => NodeConfigSchema.parse(node));

    return config;
}

export async function initializeSecretVault(config: SecretVaultConfig, schemaId: string): Promise<SecretVaultWrapper> {
    try {
        const wrapper = new SecretVaultWrapper(
            config.nodes,
            config.orgCredentials,
            schemaId
        );
        await wrapper.init();
        return wrapper;
    } catch (error) {
        console.error('Failed to initialize SecretVault wrapper:', error);
        throw error;
    }
}