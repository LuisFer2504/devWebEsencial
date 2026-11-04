#!/usr/bin/env node
/**
 * Sirve cada sitio de .qa/sites/<id> en su propio puerto (127.0.0.1), con gzip y caché de assets
 * como un hosting estático real (Vercel). Necesario porque Next exporta rutas absolutas /_next/...
 *
 *   node tools/qa/serve.mjs            # puertos desde 4101
 *   node tools/qa/serve.mjs 4201       # puerto inicial personalizado
 *
 * Herramienta interna de QA: no forma parte del sitio público. Ctrl+C para detener.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const sitesDir = path.resolve(process.cwd(), ".qa", "sites");
const firstPort = Number(process.argv[2] || 4101);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

if (!fs.existsSync(sitesDir)) {
  console.error("No existe .qa/sites. Ejecuta antes: node tools/qa/build-all.mjs");
  process.exit(1);
}

const ids = fs.readdirSync(sitesDir).filter((d) => fs.statSync(path.join(sitesDir, d)).isDirectory());
ids.forEach((id, i) => {
  const root = path.join(sitesDir, id);
  const port = firstPort + i;
  http
    .createServer((req, res) => {
      const urlPath = decodeURIComponent(new URL(req.url || "/", "http://x").pathname);
      let file = path.join(root, urlPath);
      if (!file.startsWith(root)) {
        res.writeHead(403);
        return res.end();
      }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      let status = 200;
      if (!fs.existsSync(file)) {
        status = 404;
        file = path.join(root, "404.html");
      }
      const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
      const gzip = /text|javascript|json|svg/.test(type) && /gzip/.test(req.headers["accept-encoding"] || "");
      res.writeHead(status, {
        "Content-Type": type,
        "Cache-Control": urlPath.startsWith("/_next/static/") ? "public, max-age=31536000, immutable" : "no-cache",
        ...(gzip ? { "Content-Encoding": "gzip" } : {}),
      });
      const stream = fs.createReadStream(file);
      (gzip ? stream.pipe(zlib.createGzip()) : stream).pipe(res);
    })
    .listen(port, "127.0.0.1", () => console.log(`${id.padEnd(28)} http://127.0.0.1:${port}/`));
});
