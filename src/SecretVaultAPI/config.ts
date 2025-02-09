import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const NodeConfigSchema = z.object({
  url: z.string().url(),
  did: z.string(),
});

const OrgCredentialsSchema = z.object({
  orgDid: z.string(),
  secretKey: z.string(),
});

export interface SecretVaultConfig {
  orgCredentials: z.infer<typeof OrgCredentialsSchema>;
  nodes: z.infer<typeof NodeConfigSchema>[];
}

export async function createSecretVaultConfig(): Promise<SecretVaultConfig> {
  const requiredEnvVars = [
    "NILLION_ORG_DID",
    "NILLION_ORG_SECRET_KEY",
    "SV_NODE1_URL",
    "SV_NODE2_URL",
    "SV_NODE3_URL",
    "SV_NODE1_DID",
    "SV_NODE2_DID",
    "SV_NODE3_DID",
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName],
  );
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`,
    );
  }

  const config = {
    orgCredentials: {
      orgDid: process.env.NILLION_ORG_DID!,
      secretKey: process.env.NILLION_ORG_SECRET_KEY!,
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
  config.nodes.forEach((node) => NodeConfigSchema.parse(node));

  return config;
}
