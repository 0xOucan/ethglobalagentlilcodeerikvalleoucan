import { SecretVaultWrapper } from "nillion-sv-wrappers";
import { secretVaultConfig } from "../config/secretVaultConfig";
import { v4 as uuidv4 } from "uuid";

/**
 * Escribe un perfil de comerciante en SecretVault.
 * La función inicializa el SecretVaultWrapper con la configuración obtenida
 * de secretVaultConfig y envía el perfil (con un _id único) a todos los nodos.
 *
 * Basado en la recomendación:
 * "Una vez configurado el schema, en los puntos de integración (por ejemplo, dentro de tus acciones personalizadas en el agente)
 * deberás inicializar una instancia de SecretVaultWrapper para interactuar con la API."
 *
 * @param profile Objeto con la información del perfil: owner, storeName y description.
 * @returns El resultado de la operación de escritura.
 */
export async function writeMerchantProfile(
  profile: { owner: string; storeName: string; description: string; _id?: string }
): Promise<any> {
  // Inicializa la instancia del wrapper utilizando la configuración
  const collection = new SecretVaultWrapper(
    secretVaultConfig.nodes,
    {
      orgDID: secretVaultConfig.orgDID,
      privateKey: secretVaultConfig.privateKey,
      publicKey: secretVaultConfig.publicKey,
    },
    secretVaultConfig.schemaMerchant // Schema ID para la colección Merchant Profiles
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