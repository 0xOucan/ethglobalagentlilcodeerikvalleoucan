export const secretVaultConfig = {
  orgDID: process.env.SV_ORG_DID || '',
  privateKey: process.env.SV_PRIVATE_KEY || '',
  publicKey: process.env.SV_PUBLIC_KEY || '',
  nodes: [
    {
      url: process.env.SV_NODE1_URL || '',
      jwt: process.env.SV_NODE1_JWT || '',
    },
    {
      url: process.env.SV_NODE2_URL || '',
      jwt: process.env.SV_NODE2_JWT || '',
    },
    {
      url: process.env.SV_NODE3_URL || '',
      jwt: process.env.SV_NODE3_JWT || '',
    },
  ],
  // Los IDs de esquema te permitirán enlazar los registros con sus colecciones
  schemaMerchant: process.env.SCHEMA_ID_MERCHANT || '',
  schemaProduct: process.env.SCHEMA_ID_PRODUCT || '',
}; 