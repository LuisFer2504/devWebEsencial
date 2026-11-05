# Testing

## Comandos

| Comando | Qué hace | Resultado 2026-11-02 |
|---|---|---|
| `npm test` | `vitest run` (sin `vitest.config`, defaults) | 2 archivos, **13/13 pasan** (~1.6 s) |
| `npm run type-check` | `tsc --noEmit` sobre `**/*.ts(x)` | **0 errores** |
| `npm run lint` | `next lint` (`next/core-web-vitals`, `next/typescript`) | **Sin warnings ni errores** |
| `CLIENT_ID=<id> npm run build` | Build + lint + types + export | OK con `demo-artist` |

## Suite actual (rama `dev-estabilizacion-tecnica`)

| Archivo | Qué cubre |
|---|---|
| `tests/client-config.test.ts` | Carga y validación de cada demo; config mínima; ids y emails inválidos; cliente inexistente |
| `tests/client-id.test.ts` | `CLIENT_ID` obligatorio en producción/Vercel/CI; formatos inválidos; inexistente; contradicción con `NEXT_PUBLIC_CLIENT_ID`; fallback solo en desarrollo; `id` del JSON = nombre de archivo; **`next build` real** se detiene sin `CLIENT_ID` |
| `tests/generator-form.test.ts` | Modelo del editor: ida y vuelta **idéntica** de todos los `clients/*.json`; conservación de campos sin control; ediciones; vaciado de opcionales; textos con comillas/`<`/`&`; elementos vacíos e incompletos; ids únicos; `escapeHtml` |
| `tests/generator-api.test.ts` | **Servidor real** (`createGeneratorServer`) sobre una copia temporal de `clients/`: Host, token, Origin, Sec-Fetch-Site, CORS, métodos, lista blanca de archivos, ids y rutas maliciosas, 413/415/400/422/409, copia de seguridad, escritura atómica, enlaces simbólicos, `clients/` real intacto |
| `tests/utils.test.ts` | WhatsApp, fechas, videos, navegación, contraste, todos los clientes |
| `tests/guard-production.test.ts` | Hook de protección de `produccion` |

## Cómo verificar un cambio

1. `npm test && npm run type-check && npm run lint`.
2. Build de cada variante afectada:
   ```bash
   for id in demo-professional demo-commerce demo-beauty demo-artist; do CLIENT_ID=$id npm run build || break; done
   ```
3. Para cambios de estilos: comprobar que las clases existen en `out/_next/static/css/*.css`.
4. Para cambios del generador: `npm run generate`, cargar/guardar con otro id y comparar JSON.
5. Abrir `out/index.html` vía servidor estático y revisar móvil/escritorio.
6. Reportar resultados reales (salida de comandos). Si algo falla y es preexistente, decirlo; no
   ocultarlo modificando código funcional.

## Tests recomendados (no implementados)
- Smoke de render por variante con `react-dom/server` (`renderToString`) y aserciones de secciones/ids.
- Ida y vuelta del editor a nivel de DOM (hoy se prueba el modelo `form-model.js` con tests y el DOM con
  el MCP; un test en jsdom/happy-dom exigiría una devDependency nueva).
- Tests del futuro `tools/deploy/should-build.mjs` (ver `docs/VERCEL_DEPLOYMENTS.md`).
