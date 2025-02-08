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

export function createSecretVaultConfig(): SecretVaultConfig {
    const requiredEnvVars = [
        'SV_PRIVATE_KEY',
        'SV_ORG_DID',
        'SV_NODE1_URL',
        'SV_NODE2_URL',
        'SV_NODE3_URL'
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
                did: 'did:nil:testnet:nillion1fnhettvcrsfu8zkd5zms4d820l0ct226c3zy8u',
                jwt: process.env.SV_NODE1_JWT,
            },
            {
                url: process.env.SV_NODE2_URL!,
                did: 'did:nil:testnet:nillion14x47xx85de0rg9dqunsdxg8jh82nvkax3jrl5g',
                jwt: process.env.SV_NODE2_JWT,
            },
            {
                url: process.env.SV_NODE3_URL!,
                did: 'did:nil:testnet:nillion167pglv9k7m4gj05rwj520a46tulkff332vlpjp',
                jwt: process.env.SV_NODE3_JWT,
            },
        ],
    };

    // Validate config
    OrgCredentialsSchema.parse(config.orgCredentials);
    config.nodes.forEach(node => NodeConfigSchema.parse(node));

    return config;
}

export async function generateJWTTokens(config: SecretVaultConfig): Promise<void> {
    const wrapper = new SecretVaultWrapper(config.nodes, config.orgCredentials);
    await wrapper.init();
    const tokens = await wrapper.generateTokensForAllNodes();
    
    // Update node configs with JWT tokens
    config.nodes.forEach((node, index) => {
        if (tokens[index] && tokens[index].token) {
            node.jwt = tokens[index].token;
        }
    });
}