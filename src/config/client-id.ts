import fs from "node:fs";
import path from "node:path";

/** Formato obligatorio del identificador de cliente (igual al nombre de archivo en clients/). */
export const CLIENT_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Cliente que se usa SOLO en desarrollo local (`next dev`) cuando no se indica CLIENT_ID. */
export const DEV_FALLBACK_CLIENT_ID = "demo-professional";

export class ClientIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientIdError";
  }
}

type Env = Record<string, string | undefined>;

export function getClientsDir(cwd: string = process.cwd()): string {
  return path.resolve(cwd, "clients");
}

/** IDs disponibles (archivos clients/<id>.json con nombre válido). */
export function listClientIds(clientsDir: string = getClientsDir()): string[] {
  try {
    return fs
      .readdirSync(clientsDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.slice(0, -".json".length))
      .filter((id) => CLIENT_ID_PATTERN.test(id))
      .sort();
  } catch {
    return [];
  }
}

/**
 * ¿Debe exigirse CLIENT_ID? Sí en cualquier compilación de producción (`next build` fija
 * NODE_ENV=production) y en entornos de despliegue/integración (Vercel, CI).
 */
export function isStrictClientIdContext(env: Env = process.env): boolean {
  return env.NODE_ENV === "production" || Boolean(env.VERCEL) || Boolean(env.CI);
}

function usage(available: string[]): string {
  return (
    `Indica el cliente a compilar:\n` +
    `  bash:       CLIENT_ID=demo-artist npm run build\n` +
    `  PowerShell: $env:CLIENT_ID='demo-artist'; npm run build\n` +
    `  Vercel:     Project Settings → Environment Variables → CLIENT_ID\n` +
    `Clientes disponibles: ${available.length ? available.join(", ") : "(ninguno en clients/)"}`
  );
}

/** Valida formato y existencia de un ID concreto. Lanza ClientIdError con un mensaje accionable. */
export function assertValidClientId(id: string, clientsDir: string = getClientsDir()): string {
  if (!CLIENT_ID_PATTERN.test(id)) {
    throw new ClientIdError(
      `[client-id] CLIENT_ID "${id}" no es válido: usa solo minúsculas, números y guiones (ej. "estudio-alva").\n` +
        usage(listClientIds(clientsDir))
    );
  }
  const file = path.join(clientsDir, `${id}.json`);
  if (!fs.existsSync(file)) {
    throw new ClientIdError(
      `[client-id] No se encontró el archivo de configuración para el cliente "${id}".\n` +
        `Ruta esperada: ${file}\n` +
        usage(listClientIds(clientsDir))
    );
  }
  return id;
}

/**
 * Resuelve el cliente activo a partir de CLIENT_ID (o NEXT_PUBLIC_CLIENT_ID, por compatibilidad).
 *
 * - En compilaciones de producción / Vercel / CI: CLIENT_ID es obligatorio y debe existir.
 *   Si falta o es inválido, se lanza un error y la compilación se detiene.
 * - En desarrollo local sin CLIENT_ID: se usa DEV_FALLBACK_CLIENT_ID mostrando un aviso.
 */
export function resolveClientId(
  options: { env?: Env; strict?: boolean; clientsDir?: string; warn?: (msg: string) => void } = {}
): string {
  const env = options.env ?? process.env;
  const clientsDir = options.clientsDir ?? getClientsDir();
  const strict = options.strict ?? isStrictClientIdContext(env);
  const warn = options.warn ?? ((msg: string) => console.warn(msg));

  const primary = env.CLIENT_ID?.trim();
  const legacy = env.NEXT_PUBLIC_CLIENT_ID?.trim();

  if (primary && legacy && primary !== legacy) {
    throw new ClientIdError(
      `[client-id] CLIENT_ID ("${primary}") y NEXT_PUBLIC_CLIENT_ID ("${legacy}") no coinciden. Define solo CLIENT_ID.`
    );
  }

  const id = primary || legacy;
  if (!id) {
    if (strict) {
      throw new ClientIdError(
        `[client-id] Falta la variable CLIENT_ID: es obligatoria para compilar un sitio.\n` + usage(listClientIds(clientsDir))
      );
    }
    warn(
      `[client-id] CLIENT_ID no definido: usando "${DEV_FALLBACK_CLIENT_ID}" solo para desarrollo local. ` +
        `Los builds de producción exigen CLIENT_ID.`
    );
    return assertValidClientId(DEV_FALLBACK_CLIENT_ID, clientsDir);
  }

  return assertValidClientId(id, clientsDir);
}
