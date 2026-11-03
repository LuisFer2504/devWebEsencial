import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { ClientConfigSchema } from "../src/schemas/client.schema";

const TEST_PORT = 3099;
const CLIENTS_DIR = path.resolve(process.cwd(), "clients");
const TEST_CLIENT_ID = "test-temporal-generador";

describe("Herramienta Generador Local - API y Seguridad", () => {
  let server: http.Server;

  beforeAll(async () => {
    // Montamos el manejador idéntico al de server.mjs
    server = http.createServer((req, res) => {
      const url = new URL(req.url || "/", `http://${req.headers.host}`);

      if (req.method === "GET" && url.pathname === "/api/clients") {
        const files = fs.readdirSync(CLIENTS_DIR)
          .filter((f) => f.endsWith(".json"))
          .map((f) => f.replace(".json", ""));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, clients: files }));
        return;
      }

      if (req.method === "GET" && url.pathname.startsWith("/api/client/")) {
        const clientId = url.pathname.replace("/api/client/", "").trim();
        const sanitizedId = clientId.toLowerCase().replace(/[^a-z0-9-]/g, "");
        const target = path.join(CLIENTS_DIR, `${sanitizedId}.json`);

        if (!fs.existsSync(target)) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Not found" }));
          return;
        }

        const data = JSON.parse(fs.readFileSync(target, "utf-8"));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, data }));
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/save") {
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
          const { config, overwrite } = JSON.parse(body);
          const rawId = String(config.id || "").trim();

          // Validar slug estricto
          if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(rawId)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: "ID inválido" }));
            return;
          }

          // Validar Zod
          const validation = ClientConfigSchema.safeParse(config);
          if (!validation.success) {
            res.writeHead(422, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: "Validación fallida" }));
            return;
          }

          const targetPath = path.resolve(CLIENTS_DIR, `${validation.data.id}.json`);
          if (!targetPath.startsWith(CLIENTS_DIR)) {
            res.writeHead(403, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: "No autorizado" }));
            return;
          }

          if (fs.existsSync(targetPath) && !overwrite) {
            res.writeHead(409, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, exists: true }));
            return;
          }

          fs.writeFileSync(targetPath, JSON.stringify(validation.data, null, 2), "utf-8");
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, id: validation.data.id }));
        });
        return;
      }

      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(TEST_PORT, "127.0.0.1", () => resolve()));
  });

  afterAll(async () => {
    // Limpieza de archivo de prueba
    const testFile = path.join(CLIENTS_DIR, `${TEST_CLIENT_ID}.json`);
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("debe listar los clientes existentes en clients/", async () => {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/clients`);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.clients).toContain("demo-professional");
    expect(json.clients).toContain("demo-commerce");
    expect(json.clients).toContain("demo-beauty");
    expect(json.clients).toContain("demo-artist");
  });

  it("debe rechazar IDs con caracteres prohibidos o intentos de path traversal", async () => {
    const maliciousPayload = {
      config: {
        id: "../hack-escape",
        businessName: "Malicious",
      },
      overwrite: false,
    };

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(maliciousPayload),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("debe bloquear la sobreescritura si ya existe y overwrite=false", async () => {
    const existingClientPayload = {
      config: {
        id: "demo-professional",
        businessName: "Alva & Asociados Modificado",
        tagline: "Lema",
        variant: "professional",
        colors: { primary: "#000000" },
        hero: {
          title: "Título suficientemente largo",
          description: "Descripción suficientemente extensa para pasar Zod",
          ctaPrimary: { text: "Ir", link: "#" },
        },
        about: { title: "Sobre", description: "Descripción extensa sobre la empresa" },
        services: [{ id: "s1", title: "Servicio 1", description: "Descripción del servicio" }],
        advantages: [{ title: "Ventaja 1", description: "Descripción de la ventaja" }],
        contact: {},
        seo: { title: "Título SEO largo", description: "Descripción SEO que cumple longitud" },
      },
      overwrite: false,
    };

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(existingClientPayload),
    });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.exists).toBe(true);
  });

  it("debe permitir guardar un nuevo cliente válido", async () => {
    const newClientPayload = {
      config: {
        id: TEST_CLIENT_ID,
        businessName: "Negocio de Prueba Temporal",
        tagline: "Servicios de prueba para el generador local",
        variant: "professional",
        colors: { primary: "#2563eb" },
        hero: {
          title: "Título para el hero de prueba del generador",
          description: "Descripción de prueba para verificar que el generador escribe correctamente.",
          ctaPrimary: { text: "Contactar", link: "#contacto" },
        },
        about: {
          title: "Sobre nuestra prueba",
          description: "Texto descriptivo que describe las operaciones de prueba.",
        },
        services: [
          {
            id: "servicio-test",
            title: "Servicio de Diagnóstico",
            description: "Descripción detallada del servicio de diagnóstico.",
          },
        ],
        advantages: [
          {
            title: "Rapidez garantizada",
            description: "Atención inmediata para todos los casos.",
          },
        ],
        contact: {
          whatsapp: "+51999111222",
        },
        seo: {
          title: "Negocio de Prueba Temporal | Lima Perú",
          description: "Página de prueba para verificar la creación de clientes desde el generador.",
        },
      },
      overwrite: false,
    };

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClientPayload),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // Verificar que el archivo realmente se escribió en disco
    const writtenFilePath = path.join(CLIENTS_DIR, `${TEST_CLIENT_ID}.json`);
    expect(fs.existsSync(writtenFilePath)).toBe(true);
  });
});
