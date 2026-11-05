/**
 * Generador / editor local de Web Esencial.
 *
 * Herramienta INTERNA: nunca se despliega ni se importa desde src/. Escucha solo en 127.0.0.1.
 *
 * Capas de seguridad (ver .claude/skills/web-esencial/references/GENERATOR.md):
 *  1. Solo loopback (127.0.0.1) y cabecera Host restringida a localhost:<puerto> → bloquea DNS rebinding.
 *  2. Token aleatorio por sesión, inyectado en el HTML del editor y exigido en la cabecera
 *     X-Generator-Token para toda la API → una web externa no puede leerlo ni enviarlo.
 *  3. Sin CORS: se rechazan Origin / Sec-Fetch-Site ajenos y OPTIONS.
 *  4. Validación estricta: métodos, Content-Type JSON, límite de 1 MB, id con formato fijo, Zod.
 *  5. Escritura confinada a clients/<id>.json (sin enlaces simbólicos), atómica y con copia de seguridad.
 *  6. Cabeceras de seguridad (CSP, frame-ancestors 'none', nosniff, no-store).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ClientConfigSchema } from "../../src/schemas/client.schema.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_BODY_BYTES = 1_000_000;
const TOKEN_HEADER = "x-generator-token";
const TOKEN_PLACEHOLDER = "__GENERATOR_TOKEN__";

/** Archivos estáticos permitidos (lista blanca). */
const STATIC_FILES = {
  "/": { file: "index.html", type: "text/html; charset=utf-8", inject: true },
  "/index.html": { file: "index.html", type: "text/html; charset=utf-8", inject: true },
  "/form-model.js": { file: "form-model.js", type: "text/javascript; charset=utf-8", inject: false },
};

const BASE_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Cross-Origin-Opener-Policy": "same-origin",
};

const HTML_CSP = [
  "default-src 'self'",
  // Tailwind por CDN + script del editor en línea (herramienta interna, solo local).
  "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a ?? ""));
  const bb = Buffer.from(String(b ?? ""));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/**
 * Crea el servidor del generador (sin iniciar). Exportado para los tests.
 *
 * @param {object} [options]
 * @param {string} [options.clientsDir]  Carpeta de configuraciones (por defecto ./clients).
 * @param {string} [options.backupsDir]  Carpeta de copias de seguridad (por defecto ./.generator-backups).
 * @param {string} [options.token]       Token de sesión (por defecto aleatorio).
 */
export function createGeneratorServer(options = {}) {
  const clientsDir = path.resolve(options.clientsDir ?? path.resolve(process.cwd(), "clients"));
  const backupsDir = path.resolve(options.backupsDir ?? path.resolve(process.cwd(), ".generator-backups"));
  const token = options.token ?? crypto.randomBytes(32).toString("hex");

  if (!fs.existsSync(clientsDir)) fs.mkdirSync(clientsDir, { recursive: true });
  const realClientsDir = fs.realpathSync(clientsDir);

  const server = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      const status = err instanceof HttpError ? err.status : 500;
      const message = err instanceof HttpError ? err.message : "Error interno del generador";
      if (!(err instanceof HttpError)) console.error("[generador]", err);
      if (!res.headersSent) sendJson(res, status, { success: false, error: message, ...(err.extra || {}) });
      else res.end();
    });
  });

  function port() {
    const addr = server.address();
    return addr && typeof addr === "object" ? addr.port : null;
  }

  function allowedHosts() {
    const p = port();
    return new Set([`127.0.0.1:${p}`, `localhost:${p}`, `[::1]:${p}`]);
  }

  function allowedOrigins() {
    return new Set([...allowedHosts()].map((h) => `http://${h}`));
  }

  function sendJson(res, status, data) {
    res.writeHead(status, { ...BASE_HEADERS, "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data));
  }

  /** Comprobaciones comunes a toda petición. */
  function checkRequestOrigin(req) {
    const host = String(req.headers.host || "").toLowerCase();
    if (!allowedHosts().has(host)) {
      throw new HttpError(403, "Host no permitido: el generador solo acepta peticiones a localhost");
    }
    const origin = req.headers.origin;
    if (origin !== undefined && !allowedOrigins().has(String(origin).toLowerCase())) {
      throw new HttpError(403, "Origen no permitido");
    }
    const fetchSite = req.headers["sec-fetch-site"];
    if (fetchSite !== undefined && !["same-origin", "none"].includes(String(fetchSite))) {
      throw new HttpError(403, "Petición entre sitios no permitida");
    }
  }

  function checkToken(req) {
    if (!safeEqual(req.headers[TOKEN_HEADER], token)) {
      throw new HttpError(401, "Token del generador ausente o inválido. Recarga el editor desde http://localhost:" + port());
    }
  }

  function assertId(id) {
    if (typeof id !== "string" || !ID_PATTERN.test(id)) {
      throw new HttpError(400, "El ID debe ser un slug válido: solo minúsculas, números y guiones (ej: botica-salud-peru)");
    }
    return id;
  }

  /** Ruta segura de clients/<id>.json: confinada a clientsDir y sin enlaces simbólicos. */
  function clientPath(id) {
    assertId(id);
    const target = path.resolve(realClientsDir, `${id}.json`);
    if (path.dirname(target) !== realClientsDir) throw new HttpError(403, "Ruta de archivo no autorizada");
    if (fs.existsSync(target)) {
      const st = fs.lstatSync(target);
      if (st.isSymbolicLink() || !st.isFile()) throw new HttpError(403, "El destino no es un archivo regular de clients/");
    }
    return target;
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      const declared = Number(req.headers["content-length"]);
      if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
        reject(new HttpError(413, "La configuración supera el tamaño máximo permitido (1 MB)"));
        req.resume();
        return;
      }
      const chunks = [];
      let size = 0;
      let failed = false;
      req.on("data", (chunk) => {
        if (failed) return;
        size += chunk.length;
        if (size > MAX_BODY_BYTES) {
          failed = true;
          reject(new HttpError(413, "La configuración supera el tamaño máximo permitido (1 MB)"));
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", () => !failed && resolve(Buffer.concat(chunks).toString("utf8")));
      req.on("error", (e) => !failed && reject(e));
    });
  }

  function writeAtomically(target, content) {
    const tmp = `${target}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
    fs.writeFileSync(tmp, content, { encoding: "utf8", flag: "wx" });
    fs.renameSync(tmp, target);
  }

  function backup(target, id) {
    fs.mkdirSync(backupsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dest = path.join(backupsDir, `${id}.${stamp}.json`);
    fs.copyFileSync(target, dest);
    return path.basename(dest);
  }

  async function handle(req, res) {
    checkRequestOrigin(req);
    const url = new URL(req.url || "/", "http://localhost");
    const pathname = url.pathname;

    // --- Interfaz (lista blanca de archivos) ---
    if (!pathname.startsWith("/api/")) {
      const entry = STATIC_FILES[pathname];
      if (!entry) throw new HttpError(404, "Recurso no encontrado");
      if (req.method !== "GET" && req.method !== "HEAD") throw new HttpError(405, "Método no permitido");
      let body = fs.readFileSync(path.join(__dirname, entry.file), "utf8");
      if (entry.inject) body = body.split(TOKEN_PLACEHOLDER).join(token);
      res.writeHead(200, {
        ...BASE_HEADERS,
        "Content-Type": entry.type,
        ...(entry.type.startsWith("text/html") ? { "Content-Security-Policy": HTML_CSP } : {}),
      });
      res.end(req.method === "HEAD" ? undefined : body);
      return;
    }

    // --- API: siempre autenticada ---
    checkToken(req);

    if (pathname === "/api/clients") {
      if (req.method !== "GET") throw new HttpError(405, "Método no permitido");
      const clients = fs
        .readdirSync(realClientsDir, { withFileTypes: true })
        .filter((d) => d.isFile() && d.name.endsWith(".json"))
        .map((d) => d.name.slice(0, -5))
        .filter((id) => ID_PATTERN.test(id))
        .sort();
      sendJson(res, 200, { success: true, clients });
      return;
    }

    if (pathname.startsWith("/api/client/")) {
      if (req.method !== "GET") throw new HttpError(405, "Método no permitido");
      const id = decodeURIComponent(pathname.slice("/api/client/".length));
      const target = clientPath(id);
      if (!fs.existsSync(target)) throw new HttpError(404, `Cliente "${id}" no encontrado`);
      let data;
      try {
        data = JSON.parse(fs.readFileSync(target, "utf8"));
      } catch {
        throw new HttpError(422, `El archivo de "${id}" no contiene un JSON válido`);
      }
      sendJson(res, 200, { success: true, data });
      return;
    }

    if (pathname === "/api/save") {
      if (req.method !== "POST") throw new HttpError(405, "Método no permitido");
      const contentType = String(req.headers["content-type"] || "").toLowerCase();
      if (!contentType.startsWith("application/json")) throw new HttpError(415, "Content-Type debe ser application/json");

      const raw = await readBody(req);
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        throw new HttpError(400, "El cuerpo de la petición no es un JSON válido");
      }
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new HttpError(400, "Formato de petición inválido");
      const { config, overwrite } = payload;
      if (!config || typeof config !== "object" || Array.isArray(config)) {
        throw new HttpError(400, "Formato de configuración inválido");
      }
      if (overwrite !== undefined && typeof overwrite !== "boolean") throw new HttpError(400, "overwrite debe ser booleano");

      assertId(typeof config.id === "string" ? config.id.trim() : config.id);

      const validation = ClientConfigSchema.safeParse(config);
      if (!validation.success) {
        throw new HttpError(422, "La configuración no cumple las validaciones de datos", {
          details: validation.error.issues.map((i) => ({ field: i.path.map(String).join("."), message: i.message })),
        });
      }

      const validConfig = validation.data;
      const target = clientPath(validConfig.id);
      const alreadyExists = fs.existsSync(target);
      if (alreadyExists && overwrite !== true) {
        sendJson(res, 409, {
          success: false,
          exists: true,
          message: `El archivo "${validConfig.id}.json" ya existe. Marca la casilla de confirmación para sobrescribir.`,
        });
        return;
      }

      const backupFile = alreadyExists ? backup(target, validConfig.id) : null;
      writeAtomically(target, JSON.stringify(validConfig, null, 2) + "\n");

      sendJson(res, 200, {
        success: true,
        message: `Configuración de "${validConfig.businessName}" guardada correctamente en clients/${validConfig.id}.json`,
        id: validConfig.id,
        overwritten: alreadyExists,
        backup: backupFile,
      });
      return;
    }

    throw new HttpError(404, "Endpoint no encontrado");
  }

  return { server, token, clientsDir: realClientsDir, backupsDir };
}

// --- Ejecución directa: npm run generate ---
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  const PORT = Number(process.env.GENERATOR_PORT || 3001);
  const { server, clientsDir } = createGeneratorServer();
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`\n======================================================`);
    console.log(`  GENERADOR LOCAL WEB ESENCIAL ACTIVO`);
    console.log(`  Interfaz:  http://localhost:${PORT}`);
    console.log(`  Carpeta:   ${clientsDir}`);
    console.log(`  Acceso:    solo desde este equipo (token de sesión)`);
    console.log(`======================================================\n`);
  });
}
