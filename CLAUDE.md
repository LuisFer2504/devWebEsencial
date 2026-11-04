# CLAUDE.md — Web Esencial

Punto de entrada para trabajar en este repositorio. La documentación detallada vive en
`.claude/skills/web-esencial/` (Skill `web-esencial` + `references/`). **Carga esa Skill antes de
cualquier cambio no trivial.**

## Producto

Web Esencial genera **landing pages estáticas de una sola página** para pequeños negocios,
profesionales y artistas (enfoque Perú, conversión por WhatsApp). Cada cliente es un archivo JSON en
`clients/`; el mismo código Next.js renderiza cualquier cliente según la variable `CLIENT_ID` y lo
exporta como HTML estático a `out/`. Un editor local (`tools/generator/`) crea/edita esos JSON.

Objetivo comercial: entregar sitios de calidad de forma rápida y barata reutilizando variantes
visuales. Planes, precios y procesos de venta **no existen en el código** (ver `references/BUSINESS_MODEL.md`).

## Stack

Next.js 15.1.7 (App Router, `output: "export"`), React 19, TypeScript estricto, Tailwind CSS **3.4**
(¡no v4!), Zod 4, lucide-react, Vitest 5. Node ≥ 22.6 (el generador usa `--experimental-strip-types`).

## Estructura

```
clients/<id>.json            Fuente de verdad de cada cliente (validada por Zod)
src/schemas/client.schema.ts Contrato único (Zod) → tipos en src/types/client.ts
src/config/client-loader.ts  Lee clients/<CLIENT_ID>.json en build time (fs, solo servidor)
src/app/layout.tsx|page.tsx  Metadatos SEO + switch de variante
src/components/shared/       Navbar (client component), ContactSection, Footer, WhatsAppFloatingButton
src/components/variants/     ProfessionalTheme, CommerceTheme, BeautyTheme, ArtistTheme
src/utils/                   whatsapp.ts (wa.me), media.ts (embeds YouTube/Vimeo)
tools/generator/             Editor local: server.mjs (Node http, :3001) + index.html (vanilla JS)
tools/qa/                    QA local: build-all, serve (gzip) y page-audit para verificar con MCP
tests/                       Vitest (producto + guardia de producción)
.claude/                     Skills, settings.json compartido y hooks de seguridad
```

## Comandos

| Comando | Uso |
|---|---|
| `npm run generate` | Editor local en http://localhost:3001 |
| `CLIENT_ID=<id> npm run dev` | Web pública en :3000 para ese cliente |
| `CLIENT_ID=<id> npm run build` | Exportación estática en `out/` |
| `npm test` | Vitest |
| `npm run type-check` | `tsc --noEmit` |
| `npm run lint` | `next lint` |
| `npm run qa:build` / `qa:serve` | Compila todos los clientes en `.qa/` y los sirve para verificar con MCP |

En PowerShell: `$env:CLIENT_ID='demo-artist'; npm run build`. Sin `CLIENT_ID` se usa
**silenciosamente** `demo-professional`. `npm start` no sirve con `output: "export"`; para ver `out/`
usa un servidor estático.

Validación mínima antes de entregar cualquier cambio: `npm test && npm run type-check && npm run lint`
y `npm run build` para **cada** cliente afectado. Además, todo PR que toque código se verifica en navegador
con el MCP de Chrome DevTools antes de abrirse (`references/MCP_VERIFICATION.md` de la Skill `web-esencial`).

## Git y Pull Requests

Repo `LuisFer2504/devWebEsencial` (privado), rama principal `produccion`. **Carga la Skill
`git-workflow`** (`.claude/skills/git-workflow/SKILL.md`) antes de crear ramas, commits o PRs.
Resumen: rama `dev-<descripcion-con-guiones>` (ej. `dev-cambios-nuevos`) desde `origin/produccion`,
Conventional Commits, PR con `.github/pull_request_template.md`. Nunca commit/push a `produccion`,
nunca `gh pr merge` ni aprobar PRs: el merge lo hace solo el propietario.
nunca `gh pr merge` ni aprobar PRs: el merge lo hace solo el propietario. Un hook local
(`.claude/hooks/guard-production.mjs`, ver `.claude/hooks/README.md`) bloquea esas operaciones como
segunda capa; no sustituye la protección de GitHub (pendiente). Si algo se bloquea, no lo eludas: informa.

## Despliegue

Un proyecto Vercel por cliente, mismo repo, env `CLIENT_ID=<id>`. No hay CI, ni scripts de deploy,
ni dominios configurados en el repo. **Nunca despliegues ni publiques sin pedido explícito.**

## Reglas obligatorias

1. **Compatibilidad de clientes**: todo campo nuevo del esquema debe ser `optional()` o tener
   `default()`. Nunca renombres ni elimines campos usados en `clients/*.json`. Tras cambiar el
   esquema, cada JSON de `clients/` debe seguir validando (`npm test` lo cubre para los demos).
2. **Esquema = única fuente**: los tipos salen de `z.infer`; no dupliques interfaces.
3. **Componentes compartidos** (`src/components/shared/`) afectan a TODAS las variantes: revisa las
   4 variantes y compila al menos un cliente por variante tras modificarlos.
4. **Nuevas variantes**: añadir al enum `ClientVariantSchema`, crear `src/components/variants/<X>Theme.tsx`,
   añadir el `case` en `src/app/page.tsx`, el radio en el generador, un `clients/demo-<x>.json` y un
   test de carga. Ver `references/DESIGN_SYSTEM.md`.
5. **Tailwind 3.4**: no uses clases de v4 (`shadow-xs`, `shadow-2xs`, `blur-xs`, `aspect-4/5`,
   `flex-2`, `bg-radial-*`…): no se generan. Usa `aspect-[4/5]`, `shadow-sm`, etc.
6. **Aislamiento**: nada de `tools/` puede importarse desde `src/`. El loader usa `fs` y solo corre en
   build (Server Components); no lo importes en componentes `"use client"`.
7. **Generador**: guarda el JSON *después* de pasar por Zod (que elimina claves desconocidas y aplica
   defaults). Hoy el formulario pierde campos al re-guardar (ver `references/GENERATOR.md`): no
   re-guardes clientes reales desde el editor hasta corregirlo.
8. **Seguridad**: no secretos en `clients/*.json` (todo su contenido termina en HTML público). No
   expongas el generador fuera de `127.0.0.1`. No inventes resultados de pruebas.
9. No añadas dependencias sin justificarlo; no borres código "aparentemente muerto" sin entenderlo.

## Estado

Línea base versionada en `produccion` (commit `9cc3d71`). Problemas conocidos y prioridades:
`.claude/skills/web-esencial/references/ROADMAP.md`.
