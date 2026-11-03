# Generator — editor local (`tools/generator/`)

## Arranque

`npm run generate` → `node --experimental-strip-types tools/generator/server.mjs` → http://localhost:3001
(bind `127.0.0.1`, puerto fijo 3001). Requiere Node ≥ 22.6 por la importación directa de
`src/schemas/client.schema.ts`. Emite avisos `ExperimentalWarning` y `MODULE_TYPELESS_PACKAGE_JSON`
(inofensivos, verificados con Node 22.12).

## API (`server.mjs`)

| Método y ruta | Comportamiento |
|---|---|
| `GET /` , `/index.html` | Sirve la UI |
| `GET /api/clients` | Lista `clients/*.json` (sin extensión) |
| `GET /api/client/:id` | Devuelve el JSON tal cual (sin validar); id saneado |
| `POST /api/save` `{config, overwrite}` | Valida slug → `ClientConfigSchema.safeParse` (422 con `details[]`) → comprueba que la ruta quede dentro de `clients/` → 409 si existe y `overwrite` es falso → escribe `JSON.stringify(parsed, null, 2)` |
| `OPTIONS *` | Preflight CORS |

Todas las respuestas JSON llevan `Access-Control-Allow-Origin: *`. Límite de cuerpo 1 MB (`req.destroy()`
sin respuesta). No hay autenticación ni comprobación de `Origin`/`Host`.

## UI (`index.html`)

- Tailwind por CDN (`cdn.tailwindcss.com`) — aceptable para herramienta interna, requiere internet.
- 10 pestañas: Identidad & Rubro, Portada & Hero, Biografía/Nosotros, Servicios/Paquetes,
  Fotos & Videos, Presentaciones, Ventajas, Contacto, Visibilidad/Títulos/SEO, Guardar.
- Estado en memoria `currentConfig`; listas renderizadas con `innerHTML` y botones ▲/▼/✕.
- Al iniciar carga automáticamente `demo-artist`. "+ Nuevo" precarga un artista de ejemplo.
- "Vista previa" = JSON formateado + 4 tarjetas resumen. **No hay preview visual del sitio.**
- Sin persistencia local (recargar la página pierde cambios no guardados).

## Limitaciones verificadas (lectura de código + script sobre `clients/`)

### Pérdida de datos al cargar y volver a guardar
`collectFormData()` reconstruye objetos completos en vez de fusionar. Se pierden o alteran:

| Campo | Efecto |
|---|---|
| `colors.accent`, `colors.neutralBg` | Eliminados (4 de 5 clientes los tienen) |
| `contact.googleMapsUrl` | Eliminado (demo-professional, demo-commerce, demo-beauty) |
| `seo.ogImage`, `about.aboutImage` | Eliminados |
| `sectionTitles` | Solo se conservan 4 de 22 claves |
| `artistProfile` | Se crea **en todas las variantes**; `stageName` = `businessName`; `bio` = `about.description` (sobrescribe la bio de demo-artist); `achievements` = highlights; `bioShort` se pierde |
| `packages[].ctaText/ctaLink` | Eliminados; `visible` forzado a `true` |
| `events[].description` | Eliminado; `visible` forzado a `true`; ids regenerados |
| `videos[]`, `gallery[]` | ids regenerados en cada guardado; `platform` forzado a `youtube`; `isFeatured` eliminado |
| `services[].icon`, `advantages[].icon` | Eliminados |
| `colors.primaryHover` | Siempre presente (lo rellena el formulario) |

Resultado del script de comprobación: `demo-artist`, `demo-beauty`, `demo-commerce` y
`demo-professional` perderían datos al re-guardarse; `consultoria-proyectos` no (salvo la inyección de
`artistProfile`).

### Otros
- Interpolación sin escapar en plantillas `innerHTML` (`value="${...}"`): un texto con comillas `"` se
  corta al re-renderizar la lista; los mensajes de validación (`d.field`, `d.message`) también se insertan
  como HTML. Riesgo de corrupción de datos y XSS local.
- La variante por defecto si no hay radio marcado es `artist`.
- Fecha de evento en texto libre; ids de servicio por defecto `srv-${Date.now()}` (colisionan si se crean
  varios en el mismo ms).
- `tests/generator-api.test.ts` **no** prueba `server.mjs`: reimplementa el handler dentro del test.

## Riesgo de seguridad (verificado)

`OPTIONS /api/save` con `Origin: https://evil.example` responde `Access-Control-Allow-Origin: *`.
Mientras el generador está corriendo, cualquier sitio web abierto en el navegador puede leer los
clientes y escribir/sobrescribir `clients/*.json` (con `overwrite: true`). Mitigación propuesta
(ROADMAP P0): eliminar CORS (la UI es same-origin), validar `Origin`/`Host` contra
`localhost:3001`/`127.0.0.1:3001`, y opcionalmente un token aleatorio por sesión.

## Reglas para modificarlo

1. Un campo nuevo del esquema requiere: control en el HTML, `populateForm`, `collectFormData` y, si es
   lista, `render*` con escape de HTML.
2. Fusionar sobre `currentConfig` (`{...currentConfig.x, ...valoresDelFormulario}`) para no perder
   campos que el formulario no gestiona.
3. No quitar: regex de slug, Zod, chequeo de ruta, 409 de sobrescritura, bind a `127.0.0.1`.
4. El generador nunca debe importarse desde `src/` ni copiarse a `public/`.
5. Tras cambios: `npm run generate`, cargar cada demo, guardar con otro id y comparar el JSON
   resultante con el original (`git diff --no-index`).
