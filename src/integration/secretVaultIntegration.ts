import { SecretVaultWrapper } from "nillion-sv-wrappers";
import { secretVaultConfig } from "../config/secretVaultConfig";
import { v4 as uuidv4 } from "uuid";

// Función para formatear la clave privada correctamente
const formatPrivateKey = (key: string | undefined) => {
  if (!key) return undefined;
  return key
    .replace(/\\n/g, '\n')
    .replace(/^"(.*)"$/, '$1')
    .trim();
};

/**
 * Escribe un perfil de comerciante en SecretVault.
 */
export async function writeMerchantProfile(
  profile: { owner: string; storeName: string; description: string; _id?: string }
): Promise<any> {
  // Al no requerir definir el JSON Schema en runtime, pasamos null.
  const collection = new SecretVaultWrapper(
    secretVaultConfig.nodes,
    {
      orgDID: secretVaultConfig.orgDID,
      privateKey: formatPrivateKey(secretVaultConfig.privateKey),
      publicKey: secretVaultConfig.publicKey,
    },
    null  // Omitir el esquema porque éste ya fue creado en SecretVault
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