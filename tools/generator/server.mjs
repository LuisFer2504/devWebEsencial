import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ClientConfigSchema } from "../../src/schemas/client.schema.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENTS_DIR = path.resolve(process.cwd(), "clients");
const PORT = 3001;

// Asegurar que el directorio de clientes exista
if (!fs.existsSync(CLIENTS_DIR)) {
  fs.mkdirSync(CLIENTS_DIR, { recursive: true });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  // Manejo de CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  // 1. Servir interfaz HTML del generador
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    const htmlPath = path.join(__dirname, "index.html");
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      fs.createReadStream(htmlPath).pipe(res);
      return;
    }
    res.writeHead(404);
    res.end("index.html not found");
    return;
  }

  // 2. Listar clientes existentes
  if (req.method === "GET" && url.pathname === "/api/clients") {
    try {
      const files = fs.readdirSync(CLIENTS_DIR)
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.replace(".json", ""));
      sendJson(res, 200, { success: true, clients: files });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 3. Cargar configuración de un cliente existente
  if (req.method === "GET" && url.pathname.startsWith("/api/client/")) {
    const clientId = url.pathname.replace("/api/client/", "").trim();
    const sanitizedId = clientId.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const targetFile = path.join(CLIENTS_DIR, `${sanitizedId}.json`);

    if (!fs.existsSync(targetFile)) {
      sendJson(res, 404, { success: false, error: `Cliente "${sanitizedId}" no encontrado` });
      return;
    }

    try {
      const data = JSON.parse(fs.readFileSync(targetFile, "utf-8"));
      sendJson(res, 200, { success: true, data });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4. Guardar / Crear configuración de cliente
  if (req.method === "POST" && url.pathname === "/api/save") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy(); // Proteger contra payloads masivos
      }
    });

    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const { config, overwrite } = payload;

        if (!config || typeof config !== "object") {
          sendJson(res, 400, { success: false, error: "Formato de configuración inválido" });
          return;
        }

        // Sanitización estricta del ID
        const rawId = String(config.id || "").trim();
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(rawId)) {
          sendJson(res, 400, {
            success: false,
            error: "El ID debe ser slug válido: solo minúsculas, números y guiones (ej: botica-salud-peru)",
          });
          return;
        }

        // Validación estricta con Zod
        const validation = ClientConfigSchema.safeParse(config);
        if (!validation.success) {
          const issues = validation.error.issues.map((i) => ({
            field: i.path.map(String).join("."),
            message: i.message,
          }));
          sendJson(res, 422, {
            success: false,
            error: "La configuración no cumple las validaciones de datos",
            details: issues,
          });
          return;
        }

        const validConfig = validation.data;
        const targetPath = path.resolve(CLIENTS_DIR, `${validConfig.id}.json`);

        // Comprobar que no haya path traversal y que quede estrictamente dentro de clients/
        if (!targetPath.startsWith(CLIENTS_DIR)) {
          sendJson(res, 403, { success: false, error: "Ruta de archivo no autorizada" });
          return;
        }

        // Confirmación de sobreescritura
        const alreadyExists = fs.existsSync(targetPath);
        if (alreadyExists && !overwrite) {
          sendJson(res, 409, {
            success: false,
            exists: true,
            message: `El archivo "${validConfig.id}.json" ya existe. Marca la casilla de confirmación para sobrescribir.`,
          });
          return;
        }

        // Guardar archivo formateado con 2 espacios
        fs.writeFileSync(targetPath, JSON.stringify(validConfig, null, 2), "utf-8");

        sendJson(res, 200, {
          success: true,
          message: `Configuración de "${validConfig.businessName}" guardada correctamente en clients/${validConfig.id}.json`,
          id: validConfig.id,
          overwritten: alreadyExists,
        });
      } catch (err) {
        sendJson(res, 500, {
          success: false,
          error: `Error interno al procesar configuración: ${err.message}`,
        });
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Endpoint no encontrado");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n======================================================`);
  console.log(`  GENERADOR LOCAL WEB ESENCIAL ACTIVO`);
  console.log(`  Interfaz:  http://localhost:${PORT}`);
  console.log(`  Carpeta:   ${CLIENTS_DIR}`);
  console.log(`======================================================\n`);
});
