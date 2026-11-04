#!/usr/bin/env node
/**
 * Compila cada cliente en su propia carpeta para verificación (QA con MCP).
 *
 *   node tools/qa/build-all.mjs                 # todos los clients/*.json
 *   node tools/qa/build-all.mjs demo-artist ... # solo los indicados
 *
 * Resultado: .qa/sites/<id>/ (ignorado por git). Herramienta interna: no forma parte del sitio público.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const clientsDir = path.join(root, "clients");
const outDir = path.join(root, ".qa", "sites");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(clientsDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));

fs.mkdirSync(outDir, { recursive: true });
const results = [];
for (const id of ids) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
    results.push({ id, ok: false, error: "id inválido" });
    continue;
  }
  process.stdout.write(`▶ ${id} ... `);
  const r = spawnSync(process.execPath, [nextBin, "build"], {
    cwd: root,
    env: { ...process.env, CLIENT_ID: id },
    encoding: "utf8",
  });
  if (r.status !== 0) {
    console.log("FALLO");
    results.push({ id, ok: false, error: (r.stdout + r.stderr).split("\n").slice(-15).join("\n") });
    continue;
  }
  const dest = path.join(outDir, id);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(path.join(root, "out"), dest, { recursive: true });
  console.log("OK");
  results.push({ id, ok: true });
}

console.log("\nResumen:");
for (const r of results) console.log(`  ${r.ok ? "✔" : "✘"} ${r.id}${r.ok ? "" : `\n${r.error}`}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
