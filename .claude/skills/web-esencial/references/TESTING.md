# Testing

## Comandos

| Comando | Qué hace | Resultado 2026-11-02 |
|---|---|---|
| `npm test` | `vitest run` (sin `vitest.config`, defaults) | 2 archivos, **13/13 pasan** (~1.6 s) |
| `npm run type-check` | `tsc --noEmit` sobre `**/*.ts(x)` | **0 errores** |
| `npm run lint` | `next lint` (`next/core-web-vitals`, `next/typescript`) | **Sin warnings ni errores** |
| `CLIENT_ID=<id> npm run build` | Build + lint + types + export | OK con `demo-artist` |

## Suite actual

### `tests/client-config.test.ts` (9 tests)
- Carga y valida los 5 clientes de `clients/` (comprueba `id`, `businessName`, `variant`, listas no vacías).
- Config mínima válida (sin redes, horarios, imágenes).
- Rechaza `id` inválido y email inválido.
- Error claro si el cliente no existe.

Nota: los tests de los demos fijan `businessName` (p. ej. `"Tyler Kealey"`); cambiar el contenido de un
demo exige actualizar el test.

### `tests/generator-api.test.ts` (4 tests)
- Levanta un servidor en `127.0.0.1:3099` **con una copia del handler** (no importa `server.mjs`).
- Lista clientes, rechaza `../hack-escape` (400), 409 al sobrescribir sin confirmación, guarda un cliente
  nuevo y lo borra en `afterAll`.
- Escribe en el `clients/` real (archivo `test-temporal-generador.json`); si el test se interrumpe,
  el archivo puede quedar.

## Huecos de cobertura

| Área | Cobertura |
|---|---|
| `server.mjs` real (CORS, límite 1 MB, 422 con detalles) | Ninguna (el test usa una copia) |
| UI del generador (`collectFormData`/`populateForm`, round-trip) | Ninguna |
| `src/utils/whatsapp.ts`, `src/utils/media.ts` | Ninguna directa |
| Renderizado de variantes / componentes | Ninguno (sin Testing Library ni snapshots) |
| Build de todos los clientes | Manual |
| Visual / responsive / accesibilidad / Lighthouse | Manual, sin registro |

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
- Unitarios de `buildWhatsAppLink` y `getEmbedVideoUrl` (casos válidos, inválidos, Shorts, Vimeo).
- Exportar el handler de `server.mjs` (p. ej. `createGeneratorServer()`) y testear el real, incluido CORS.
- Round-trip del editor: `populateForm(demo) → collectFormData()` en jsdom/happy-dom debe conservar campos.
- Smoke de render por variante con `react-dom/server` (`renderToString`) y aserciones de secciones/ids.
- Script que valide **todos** `clients/*.json` (no solo los nombrados en tests).
