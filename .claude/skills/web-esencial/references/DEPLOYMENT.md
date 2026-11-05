# Deployment — build, exportación y entrega

## Build

```bash
# bash
CLIENT_ID=<id> npm run build
# PowerShell
$env:CLIENT_ID='<id>'; npm run build
```

- `next.config.ts`: `output: "export"`, `images.unoptimized: true`, `trailingSlash: true`.
- Resultado: `out/index.html`, `out/404.html`, `out/_next/static/**`, más todo `public/`.
- Verificado (demo-artist): build OK, `/` 3.51 kB, First Load JS 109 kB, `out/` 1.1 MB.
- `CLIENT_ID` es **obligatorio**: si falta, no es un slug válido o no existe `clients/<id>.json`, `next build`
  se detiene antes de compilar con un mensaje que lista los clientes disponibles (`src/config/client-id.ts`,
  llamado desde `next.config.ts`). También se acepta `NEXT_PUBLIC_CLIENT_ID` (si ambos existen deben
  coincidir). Solo `next dev` usa `demo-professional` por defecto, con aviso.
- El campo `id` del JSON debe coincidir con el nombre del archivo.
- Un JSON inválido o inexistente hace fallar el build con un mensaje por campo (comportamiento deseado).
- `npm start` (`next start`) no es aplicable a `output: "export"`; para probar `out/` usa un servidor
  estático (p. ej. `npx serve out`, requiere descarga; no es dependencia del proyecto).
- `out/` y `.next/` se sobrescriben en cada build y están en `.gitignore`. Un build por cliente a la vez.

## Despliegue documentado (README; no verificado en esta auditoría)

Un proyecto Vercel por cliente importando el mismo repositorio, con env `CLIENT_ID=<id>`. Vercel ejecuta
`npm run build` y publica `out/`. No hay `vercel.json`, CI, ni scripts de despliegue en el repo.

Consecuencia: cualquier push a la rama conectada redespliega **todos** los clientes (solución diseñada en
`docs/VERCEL_DEPLOYMENTS.md`, pendiente de implementar); un cambio en un
componente compartido afecta a todos a la vez.

Alternativas compatibles (no implementadas): cualquier hosting estático (Netlify, Cloudflare Pages,
S3+CloudFront, hosting tradicional por FTP) subiendo `out/`.

## Lo que falta para un despliegue profesional

- `metadataBase`/URL del sitio por cliente (campo `seo.siteUrl` propuesto) para canónica y OG absolutos.
- `robots.txt` y `sitemap.xml` (Next `app/robots.ts` y `app/sitemap.ts` funcionan con export estático).
- Favicon/íconos por cliente; quitar los SVG de plantilla de `public/` (`next.svg`, `vercel.svg`,
  `file.svg`, `globe.svg`, `window.svg`) que hoy se publican con cada cliente.
- Script para compilar y verificar todos los clientes (`for id in clients/*.json`).
- CI (GitHub Actions): test, type-check, lint y build de cada cliente.

## Checklist de entrega a un cliente

1. `git status` limpio y commit con el JSON del cliente.
2. `npm test && npm run type-check && npm run lint`.
3. `CLIENT_ID=<id> npm run build` sin errores ni warnings nuevos.
4. Revisar `out/index.html` en navegador a 375 px, 768 px, 1280 px.
5. Contenido: sin textos ni imágenes de demo, ortografía revisada, precios confirmados por el cliente.
6. WhatsApp: abrir el enlace en un móvil real y confirmar número y mensaje.
7. Teléfono (`tel:`), email (`mailto:`), mapa, redes: cada enlace probado.
8. SEO: `<title>` ≤ 60, description ≤ 160, `og:image` absoluta y válida.
9. Lighthouse (móvil): registrar Performance, Accessibility, Best Practices, SEO.
10. Imágenes con derechos de uso confirmados (las de Unsplash de los demos no son del cliente).
11. Dominio, DNS y HTTPS configurados (fuera del repo).
12. **Solo con autorización explícita**: desplegar.
