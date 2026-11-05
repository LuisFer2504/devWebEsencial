import fs from "node:fs";
import path from "node:path";
import { ClientConfigSchema, type ClientConfig } from "../schemas/client.schema";
import { assertValidClientId, getClientsDir, resolveClientId } from "./client-id";

/**
 * Retorna el ID del cliente activo (variable CLIENT_ID).
 * En builds de producción, Vercel o CI es obligatorio: si falta o no es válido, lanza un error.
 */
export function getActiveClientId(): string {
  return resolveClientId();
}

/**
 * Carga y valida estrictamente la configuración del cliente según su ID.
 * Lanza errores detallados si el ID no es válido, el archivo no existe, el JSON es inválido,
 * viola el esquema o su campo "id" no coincide con el nombre del archivo.
 */
export function loadClientConfig(clientId: string = getActiveClientId()): ClientConfig {
  // Validación estricta (sin "sanear"): un ID inválido es un error, nunca se transforma en otro.
  const clientsDir = getClientsDir();
  const sanitizedId = assertValidClientId(clientId, clientsDir);
  const filePath = path.join(clientsDir, `${sanitizedId}.json`);

  let fileContent: string;
  try {
    fileContent = fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    throw new Error(
      `[client-loader] Error al leer el archivo del cliente "${sanitizedId}": ${err instanceof Error ? err.message : String(err)}`
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(fileContent);
  } catch (err) {
    throw new Error(
      `[client-loader] El archivo "${sanitizedId}.json" contiene un JSON inválido: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const result = ClientConfigSchema.safeParse(parsedJson);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((e) => `  - [${e.path.map(String).join(".") || "root"}]: ${e.message}`)
      .join("\n");
    throw new Error(
      `[client-loader] La configuración del cliente "${sanitizedId}" no cumple el esquema requerido:\n${errorDetails}`
    );
  }

  if (result.data.id !== sanitizedId) {
    throw new Error(
      `[client-loader] El archivo "${sanitizedId}.json" declara "id": "${result.data.id}". ` +
        `El campo "id" debe coincidir con el nombre del archivo.`
    );
  }

  return result.data;
}
