import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
// Servidor REAL del generador (no una copia del handler).
import { createGeneratorServer } from "../tools/generator/server.mjs";

const REAL_CLIENTS = path.resolve("clients");
const TOKEN = "token-de-prueba-0123456789abcdef";

let tmp: string;
const realSnapshot = new Map<string, string>();
let clientsDir: string;
let backupsDir: string;
let server: http.Server;
let port: number;

interface Res {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
  json: () => any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/** Petición HTTP con control total de cabeceras (incluida Host, que fetch no permite fijar). */
function request(
  method: string,
  urlPath: string,
  { headers = {}, body }: { headers?: Record<string, string>; body?: string | Buffer } = {}
): Promise<Res> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, method, path: urlPath, headers: { Host: `127.0.0.1:${port}`, ...headers } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          resolve({ status: res.statusCode || 0, headers: res.headers, body: text, json: () => JSON.parse(text) });
        });
      }
    );
    req.on("error", (e: NodeJS.ErrnoException) => (e.code === "ECONNRESET" || e.code === "EPIPE" ? resolve({ status: 0, headers: {}, body: "", json: () => ({}) }) : reject(e)));
    if (body !== undefined) req.write(body);
    req.end();
  });
}

const auth = { "X-Generator-Token": TOKEN };
const jsonHeaders = { ...auth, "Content-Type": "application/json" };
const save = (payload: unknown, extra: Record<string, string> = {}) =>
  request("POST", "/api/save", { headers: { ...jsonHeaders, ...extra }, body: JSON.stringify(payload) });
const demo = (id: string) => JSON.parse(fs.readFileSync(path.join(REAL_CLIENTS, `${id}.json`), "utf8"));

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "generador-"));
  clientsDir = path.join(tmp, "clients");
  backupsDir = path.join(tmp, "backups");
  fs.mkdirSync(clientsDir);
  for (const f of fs.readdirSync(REAL_CLIENTS)) {
    fs.copyFileSync(path.join(REAL_CLIENTS, f), path.join(clientsDir, f));
    realSnapshot.set(f, fs.readFileSync(path.join(REAL_CLIENTS, f), "utf8"));
  }
  ({ server } = createGeneratorServer({ clientsDir, backupsDir, token: TOKEN }));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("Generador: interfaz", () => {
  it("sirve el editor con el token de sesión y cabeceras de seguridad", async () => {
    const r = await request("GET", "/");
    expect(r.status).toBe(200);
    expect(r.body).toContain(`content="${TOKEN}"`);
    expect(r.body).not.toContain("__GENERATOR_TOKEN__");
    expect(r.headers["content-security-policy"]).toMatch(/frame-ancestors 'none'/);
    expect(r.headers["x-frame-options"]).toBe("DENY");
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers["cache-control"]).toBe("no-store");
  });

  it("sirve form-model.js y nada más (lista blanca)", async () => {
    expect((await request("GET", "/form-model.js")).status).toBe(200);
    for (const p of ["/server.mjs", "/../../package.json", "/%2e%2e/%2e%2e/package.json", "/clients/demo-artist.json", "/.env"]) {
      expect((await request("GET", p)).status, p).toBe(404);
    }
  });

  it("no envía cabeceras CORS en ninguna respuesta", async () => {
    const responses = [await request("GET", "/"), await request("GET", "/api/clients", { headers: auth }), await request("OPTIONS", "/api/save")];
    for (const r of responses) expect(r.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("Generador: acceso solo local y autorizado", () => {
  it("rechaza un Host distinto de localhost (DNS rebinding)", async () => {
    const r = await request("GET", "/api/clients", { headers: { ...auth, Host: "evil.example:80" } });
    expect(r.status).toBe(403);
    expect((await request("GET", "/", { headers: { Host: `attacker.test:${port}` } })).status).toBe(403);
  });

  it("acepta localhost y 127.0.0.1 con el puerto correcto", async () => {
    expect((await request("GET", "/api/clients", { headers: { ...auth, Host: `localhost:${port}` } })).status).toBe(200);
    expect((await request("GET", "/api/clients", { headers: { ...auth, Host: `127.0.0.1:${port}` } })).status).toBe(200);
  });

  it("exige el token en toda la API", async () => {
    expect((await request("GET", "/api/clients")).status).toBe(401);
    expect((await request("GET", "/api/client/demo-artist")).status).toBe(401);
    expect((await request("GET", "/api/clients", { headers: { "X-Generator-Token": "incorrecto" } })).status).toBe(401);
    expect((await save({ config: demo("demo-artist"), overwrite: true }, { "X-Generator-Token": "x" })).status).toBe(401);
  });

  it("rechaza peticiones con Origin ajeno o entre sitios aunque traigan token", async () => {
    expect((await request("GET", "/api/clients", { headers: { ...auth, Origin: "https://evil.example" } })).status).toBe(403);
    expect((await request("GET", "/api/clients", { headers: { ...auth, "Sec-Fetch-Site": "cross-site" } })).status).toBe(403);
    expect((await request("GET", "/api/clients", { headers: { ...auth, Origin: `http://localhost:${port}` } })).status).toBe(200);
  });

  it("rechaza el preflight OPTIONS y métodos no permitidos", async () => {
    expect((await request("OPTIONS", "/api/save", { headers: { Origin: "https://evil.example" } })).status).toBe(403);
    expect((await request("OPTIONS", "/api/save")).status).toBe(401);
    expect((await request("DELETE", "/api/client/demo-artist", { headers: auth })).status).toBe(405);
    expect((await request("GET", "/api/save", { headers: auth })).status).toBe(405);
    expect((await request("POST", "/", { headers: auth })).status).toBe(405);
  });
});

describe("Generador: lectura de clientes", () => {
  it("lista los clientes", async () => {
    const r = await request("GET", "/api/clients", { headers: auth });
    expect(r.json().clients).toEqual(expect.arrayContaining(["demo-artist", "demo-beauty", "demo-commerce", "demo-professional"]));
  });

  it("devuelve un cliente existente", async () => {
    const r = await request("GET", "/api/client/demo-artist", { headers: auth });
    expect(r.status).toBe(200);
    expect(r.json().data.id).toBe("demo-artist");
  });

  it.each(["..%2Fpackage", "%2e%2e%2f%2e%2e%2fpackage", "Demo-Artist", "demo_artist", "demo-artist.json", "..", "a%00b"])(
    "rechaza ids inválidos o rutas fuera de clients/: %s",
    async (id) => {
      const r = await request("GET", `/api/client/${id}`, { headers: auth });
      expect([400, 404]).toContain(r.status);
      expect(r.status).not.toBe(200);
    }
  );

  it("404 si el cliente no existe", async () => {
    expect((await request("GET", "/api/client/no-existe", { headers: auth })).status).toBe(404);
  });
});

describe("Generador: guardado", () => {
  beforeEach(() => {
    fs.rmSync(backupsDir, { recursive: true, force: true });
  });

  it("exige Content-Type JSON", async () => {
    const r = await request("POST", "/api/save", { headers: { ...auth, "Content-Type": "text/plain" }, body: "{}" });
    expect(r.status).toBe(415);
  });

  it("rechaza cuerpos de más de 1 MB", async () => {
    const big = JSON.stringify({ config: { id: "x", padding: "a".repeat(1_100_000) } });
    const r = await request("POST", "/api/save", { headers: jsonHeaders, body: big });
    expect([413, 0]).toContain(r.status);
    if (r.status) expect(r.json().success).toBe(false);
  });

  it("rechaza JSON mal formado y formatos inválidos", async () => {
    expect((await request("POST", "/api/save", { headers: jsonHeaders, body: "{ no es json" })).status).toBe(400);
    expect((await save([])).status).toBe(400);
    expect((await save({ config: "texto" })).status).toBe(400);
    expect((await save({ config: demo("demo-artist"), overwrite: "si" })).status).toBe(400);
  });

  it.each(["../hack-escape", "..\\hack", "clients/../x", "Mayusculas", "con espacios", "", "a/b"])(
    "rechaza ids que intentan salir de clients/ o son inválidos: %j",
    async (id) => {
      const r = await save({ config: { ...demo("demo-artist"), id }, overwrite: true });
      expect(r.status).toBe(400);
      // Nada se escribió fuera de clients/ (en tmp solo existen las carpetas esperadas).
      expect(fs.readdirSync(tmp).filter((f) => !["clients", "backups"].includes(f))).toEqual([]);
    }
  );

  it("valida con Zod y devuelve detalles por campo", async () => {
    const bad = { ...demo("demo-beauty"), id: "cliente-invalido", hero: { ...demo("demo-beauty").hero, title: "" } };
    const r = await save({ config: bad });
    expect(r.status).toBe(422);
    expect(r.json().details.map((d: { field: string }) => d.field)).toContain("hero.title");
    expect(fs.existsSync(path.join(clientsDir, "cliente-invalido.json"))).toBe(false);
  });

  it("no sobrescribe sin confirmación explícita", async () => {
    const before = fs.readFileSync(path.join(clientsDir, "demo-beauty.json"), "utf8");
    const r = await save({ config: { ...demo("demo-beauty"), tagline: "Cambiado sin permiso" } });
    expect(r.status).toBe(409);
    expect(fs.readFileSync(path.join(clientsDir, "demo-beauty.json"), "utf8")).toBe(before);
  });

  it("al sobrescribir guarda una copia de seguridad del archivo anterior", async () => {
    const before = fs.readFileSync(path.join(clientsDir, "demo-commerce.json"), "utf8");
    const r = await save({ config: { ...demo("demo-commerce"), tagline: "Nuevo lema de prueba" }, overwrite: true });
    expect(r.status).toBe(200);
    expect(r.json().backup).toMatch(/^demo-commerce\..+\.json$/);
    expect(fs.readFileSync(path.join(backupsDir, r.json().backup), "utf8")).toBe(before);
    expect(JSON.parse(fs.readFileSync(path.join(clientsDir, "demo-commerce.json"), "utf8")).tagline).toBe("Nuevo lema de prueba");
    expect(fs.readdirSync(clientsDir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });

  it("crea un cliente nuevo válido solo dentro de clients/", async () => {
    const r = await save({ config: { ...demo("demo-professional"), id: "nuevo-cliente-prueba" } });
    expect(r.status).toBe(200);
    expect(fs.existsSync(path.join(clientsDir, "nuevo-cliente-prueba.json"))).toBe(true);
    expect(fs.existsSync(path.join(REAL_CLIENTS, "nuevo-cliente-prueba.json"))).toBe(false);
  });

  it("guardar sin cambios conserva todos los campos del JSON (incluidos los que el editor no muestra)", async () => {
    const original = demo("demo-beauty");
    const r = await save({ config: original, overwrite: true });
    expect(r.status).toBe(200);
    const written = JSON.parse(fs.readFileSync(path.join(clientsDir, "demo-beauty.json"), "utf8"));
    expect(written.contact.googleMapsUrl).toBe(original.contact.googleMapsUrl);
    expect(written.colors).toEqual(original.colors);
  });

  it("no sigue enlaces simbólicos fuera de clients/", async () => {
    const outside = path.join(tmp, "fuera.json");
    fs.writeFileSync(outside, "{}");
    const link = path.join(clientsDir, "enlace-externo.json");
    try {
      fs.symlinkSync(outside, link);
    } catch {
      return; // Windows sin permisos para crear enlaces: el caso no se puede montar aquí.
    }
    const r = await save({ config: { ...demo("demo-professional"), id: "enlace-externo" }, overwrite: true });
    expect(r.status).toBe(403);
    expect(fs.readFileSync(outside, "utf8")).toBe("{}");
  });

  it("los archivos reales de clients/ no se modificaron durante las pruebas", () => {
    expect(fs.readdirSync(REAL_CLIENTS).sort()).toEqual([...realSnapshot.keys()].sort());
    for (const [f, content] of realSnapshot) {
      expect(fs.readFileSync(path.join(REAL_CLIENTS, f), "utf8"), f).toBe(content);
    }
    expect(fs.existsSync(path.join(REAL_CLIENTS, "nuevo-cliente-prueba.json"))).toBe(false);
  });
});
