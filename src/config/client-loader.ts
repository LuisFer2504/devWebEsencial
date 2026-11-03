import fs from "node:fs";
import path from "node:path";
import { ClientConfigSchema, type ClientConfig } from "../schemas/client.schema";

const DEFAULT_CLIENT_ID = "demo-professional";

/**
 * Retorna el ID del cliente configurado en las variables de entorno.
 */
export function getActiveClientId(): string {
  const envId = process.env.CLIENT_ID || process.env.NEXT_PUBLIC_CLIENT_ID;
  if (envId && envId.trim() !== "") {
    return envId.trim();
  }

  return DEFAULT_CLIENT_ID;
}

/**
 * Carga y valida estrictamente la configuración del cliente según su ID.
 * Lanza errores detallados si el archivo no existe o viola el esquema de validación.
 */
export function loadClientConfig(clientId: string = getActiveClientId()): ClientConfig {
  // Sanitizar el ID para prevenir path traversal
  const sanitizedId = clientId.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!sanitizedId) {
    throw new Error(`[client-loader] ID de cliente no válido: "${clientId}"`);
  }

  const clientsDir = path.resolve(process.cwd(), "clients");
  const filePath = path.join(clientsDir, `${sanitizedId}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `[client-loader] No se encontró el archivo de configuración para el cliente "${sanitizedId}".\n` +
        `Ruta esperada: ${filePath}\n` +
        `Verifica que exista el archivo en la carpeta "clients/" o revisa la variable CLIENT_ID.`
    );
  }

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

  return result.data;
}
