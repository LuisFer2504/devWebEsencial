import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  ClientIdError,
  DEV_FALLBACK_CLIENT_ID,
  isStrictClientIdContext,
  listClientIds,
  resolveClientId,
} from "../src/config/client-id";
import { loadClientConfig } from "../src/config/client-loader";

const clientsDir = path.resolve("clients");
const silent = () => {};

describe("CLIENT_ID: contexto estricto", () => {
  it("es estricto en builds de producción, Vercel y CI", () => {
    expect(isStrictClientIdContext({ NODE_ENV: "production" })).toBe(true);
    expect(isStrictClientIdContext({ VERCEL: "1" })).toBe(true);
    expect(isStrictClientIdContext({ CI: "true" })).toBe(true);
    expect(isStrictClientIdContext({ NODE_ENV: "development" })).toBe(false);
    expect(isStrictClientIdContext({ NODE_ENV: "test" })).toBe(false);
  });
});

describe("CLIENT_ID: builds de producción", () => {
  it.each([
    [{ NODE_ENV: "production" }],
    [{ VERCEL: "1" }],
    [{ CI: "true" }],
    [{ NODE_ENV: "production", CLIENT_ID: "   " }],
  ])("falla si falta CLIENT_ID (%j)", (env) => {
    expect(() => resolveClientId({ env, clientsDir })).toThrowError(ClientIdError);
    expect(() => resolveClientId({ env, clientsDir })).toThrowError(/Falta la variable CLIENT_ID/);
  });

  it("el mensaje indica cómo definirlo y qué clientes existen", () => {
    try {
      resolveClientId({ env: { NODE_ENV: "production" }, clientsDir });
      expect.unreachable();
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toMatch(/CLIENT_ID=demo-artist npm run build/);
      expect(msg).toMatch(/\$env:CLIENT_ID/);
      expect(msg).toMatch(/demo-commerce/);
    }
  });

  it.each(["Demo-Artist", "demo artist", "../demo-artist", "demo_artist", "demo-artist.json", "-demo", "demo--artist"])(
    "rechaza un CLIENT_ID con formato inválido: %s",
    (id) => {
      expect(() => resolveClientId({ env: { NODE_ENV: "production", CLIENT_ID: id }, clientsDir })).toThrowError(/no es válido/);
    }
  );

  it("rechaza un CLIENT_ID que no tiene archivo en clients/", () => {
    expect(() => resolveClientId({ env: { NODE_ENV: "production", CLIENT_ID: "cliente-inexistente" }, clientsDir })).toThrowError(
      /No se encontró el archivo de configuración/
    );
  });

  it("rechaza CLIENT_ID y NEXT_PUBLIC_CLIENT_ID contradictorios", () => {
    expect(() =>
      resolveClientId({ env: { NODE_ENV: "production", CLIENT_ID: "demo-artist", NEXT_PUBLIC_CLIENT_ID: "demo-beauty" }, clientsDir })
    ).toThrowError(/no coinciden/);
  });

  it("acepta un CLIENT_ID válido y existente (y recorta espacios)", () => {
    expect(resolveClientId({ env: { NODE_ENV: "production", CLIENT_ID: " demo-artist " }, clientsDir })).toBe("demo-artist");
    expect(resolveClientId({ env: { VERCEL: "1", NEXT_PUBLIC_CLIENT_ID: "demo-beauty" }, clientsDir })).toBe("demo-beauty");
  });
});

describe("CLIENT_ID: desarrollo local", () => {
  it("sin CLIENT_ID usa el cliente de desarrollo y avisa", () => {
    const warnings: string[] = [];
    const id = resolveClientId({ env: { NODE_ENV: "development" }, clientsDir, warn: (m) => warnings.push(m) });
    expect(id).toBe(DEV_FALLBACK_CLIENT_ID);
    expect(warnings[0]).toMatch(/solo para desarrollo local/);
  });

  it("aun en desarrollo, un CLIENT_ID inválido es un error", () => {
    expect(() => resolveClientId({ env: { NODE_ENV: "development", CLIENT_ID: "No Valido" }, clientsDir, warn: silent })).toThrowError(
      /no es válido/
    );
  });
});

describe("loadClientConfig: validación estricta del archivo", () => {
  let tmp: string;
  let cwd: string;

  beforeAll(() => {
    cwd = process.cwd();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "client-id-"));
    fs.mkdirSync(path.join(tmp, "clients"));
    const demo = JSON.parse(fs.readFileSync(path.join(clientsDir, "demo-beauty.json"), "utf8"));
    fs.writeFileSync(path.join(tmp, "clients", "copiado-sin-cambiar-id.json"), JSON.stringify(demo));
    process.chdir(tmp);
  });

  afterAll(() => {
    process.chdir(cwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("ya no 'sanea' IDs: un ID con mayúsculas o caracteres extra es un error", () => {
    expect(() => loadClientConfig("Copiado-Sin-Cambiar-Id")).toThrowError(/no es válido/);
  });

  it("falla si el campo id no coincide con el nombre del archivo", () => {
    expect(() => loadClientConfig("copiado-sin-cambiar-id")).toThrowError(/debe coincidir con el nombre del archivo/);
  });
});

describe("Todos los clientes", () => {
  it("cada archivo de clients/ tiene un nombre válido y su id coincide", () => {
    const files = fs.readdirSync(clientsDir).filter((f) => f.endsWith(".json"));
    expect(listClientIds(clientsDir)).toHaveLength(files.length);
    for (const id of listClientIds(clientsDir)) expect(loadClientConfig(id).id).toBe(id);
  });
});

describe("next build (real)", () => {
  it(
    "se detiene antes de compilar si falta CLIENT_ID",
    () => {
      const env = { ...process.env };
      delete env.CLIENT_ID;
      delete env.NEXT_PUBLIC_CLIENT_ID;
      const r = spawnSync(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "build"], {
        env,
        encoding: "utf8",
        timeout: 240_000,
      });
      expect(r.status).not.toBe(0);
      expect(r.stdout + r.stderr).toMatch(/Falta la variable CLIENT_ID/);
      expect(r.stdout + r.stderr).not.toMatch(/Compiled successfully/);
    },
    300_000
  );
});
