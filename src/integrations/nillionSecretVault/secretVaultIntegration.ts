import { SecretVaultWrapper } from "nillion-sv-wrappers/SecretVault/wrapper";
import { secretVaultConfig } from "./config/secretVaultConfig"; // Adjust the path if necessary
import { v4 as uuidv4 } from "uuid";

interface MerchantProfile {
  owner: string;
  storeName: string;
  description: string;
  _id?: string;
}

// Función para formatear la clave privada correctamente
const formatPrivateKey = (key: string | undefined): string | undefined => {
  if (!key) return undefined;
  return key
    .replace(/\\n/g, '\n')
    .replace(/^"(.*)"$/, '$1')
    .trim();
};

/**
 * Escribe un perfil de comerciante en SecretVault.
 */
export async function writeMerchantProfile(profile: MerchantProfile): Promise<any> {
  const privateKey = formatPrivateKey(secretVaultConfig.privateKey);
  if (!privateKey) throw new Error('Private key is required');

  const collection = new SecretVaultWrapper(
    secretVaultConfig.nodes.map(node => ({
      ...node,
      did: node.url
    })),
    {
      orgDid: secretVaultConfig.orgDID || '',  // Add default empty string
      secretKey: privateKey,  // Now guaranteed to be string
    },
    secretVaultConfig.schemaMerchant || ''  // Add default empty string
  );

  await collection.init();

  // Asignar un identificador único si aún no existe
  if (!profile._id) {
    profile._id = uuidv4();
  }

  try {
    // Escribir el perfil en todos los nodos
    const result = await collection.writeToNodes([profile]);
    console.log("Merchant Profile escrito en SecretVault:", result);
    return result;
  } catch (error) {
    console.error("Error al escribir merchant profile en SecretVault:", error);
    throw error;
  }
} 