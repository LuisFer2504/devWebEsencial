# Generator — editor local (`tools/generator/`)

Herramienta **interna** para crear y editar `clients/<id>.json`. Nunca se despliega ni se importa desde
`src/`. Actualizado en la rama `dev-estabilizacion-tecnica`.

## Arranque

`npm run generate` → `node --experimental-strip-types tools/generator/server.mjs` → http://localhost:3001
(solo `127.0.0.1`; puerto configurable con `GENERATOR_PORT`). Requiere Node ≥ 22.6 por la importación
directa de `src/schemas/client.schema.ts`.

## Archivos

| Archivo | Función |
|---|---|
| `server.mjs` | Servidor HTTP; exporta `createGeneratorServer({ clientsDir, backupsDir, token })` (usado por los tests) y arranca solo si se ejecuta directamente |
| `form-model.js` | Lógica pura del formulario (sin DOM), usable en navegador (`window.FormModel`) y en Node (`require`) |
| `index.html` | Interfaz: conecta inputs ↔ `FormModel`; Tailwind por CDN (solo herramienta local) |

## API

| Método y ruta | Comportamiento |
|---|---|
| `GET /`, `/index.html` | Editor con el token de sesión inyectado en `<meta name="generator-token">` |
| `GET /form-model.js` | Modelo del formulario |
| `GET /api/clients` | Lista de ids válidos de `clients/` |
| `GET /api/client/:id` | JSON del cliente (id estricto; 400 inválido, 404 inexistente, 422 JSON corrupto) |
| `POST /api/save` `{ config, overwrite? }` | Valida y guarda (ver abajo) |

Cualquier otra ruta → 404; métodos no permitidos → 405.

## Seguridad (capas)

1. **Solo local:** escucha en `127.0.0.1`; la cabecera `Host` debe ser `127.0.0.1:<puerto>`,
   `localhost:<puerto>` o `[::1]:<puerto>` → bloquea *DNS rebinding* (403).
2. **Autorización:** token aleatorio de 256 bits por sesión, exigido en la cabecera `X-Generator-Token`
   en toda `/api/*` (401 si falta o no coincide; comparación en tiempo constante). Una web externa no
   puede leer el token (no hay CORS) ni enviar cabeceras personalizadas sin un *preflight*, que se rechaza.
3. **Mismo origen:** se rechaza (403) un `Origin` distinto del propio y `Sec-Fetch-Site` distinto de
   `same-origin`/`none`. No se envía ninguna cabecera `Access-Control-*`.
4. **Validación de peticiones:** `Content-Type: application/json` (415), cuerpo ≤ 1 MB (413), JSON válido
   (400), `config` objeto y `overwrite` booleano (400), id `^[a-z0-9]+(-[a-z0-9]+)*$` sin transformarlo
   (400), esquema Zod (422 con `details[]` por campo).
5. **Escritura de archivos:** ruta resuelta y confinada a `clients/` (comparación de carpeta real), rechazo de
   enlaces simbólicos y no-archivos (403), escritura **atómica** (temporal + `rename`), **copia de
   seguridad** del archivo anterior en `.generator-backups/<id>.<fecha>.json` (ignorado por git) y
   confirmación explícita para sobrescribir (409 sin `overwrite: true`).
6. **Interfaz:** lista blanca de archivos servidos; cabeceras `Content-Security-Policy`
   (`frame-ancestors 'none'`, `connect-src 'self'`…), `X-Frame-Options: DENY`, `nosniff`,
   `Referrer-Policy: no-referrer`, `Cache-Control: no-store`; todo texto dinámico se escapa (`esc()`).

Modelo de amenaza: herramienta de un solo usuario en su propio equipo. El token protege frente a páginas
web abiertas en el mismo navegador; no frente a malware que ya controle el equipo.

## Conservación de datos

`buildConfig(base, form, drafts)` parte del JSON cargado y solo modifica los campos que el formulario
muestra:
- campos sin control en el editor (`colors.accent`, `neutralBg`, `contact.googleMapsUrl`, `seo.ogImage`,
  `trustBadges`, los títulos no editables, `about.aboutImage`, `artistProfile.bio/stageName/bioShort`…) se
  conservan tal cual;
- cada elemento de lista conserva todos sus campos (`id`, `icon`, `visible`, `platform`, `ctaText`,
  `ctaLink`, `description` de eventos, `isFeatured`…);
- un campo opcional vaciado se elimina; uno obligatorio vaciado llega a Zod, que lo reporta;
- no se añaden claves que el original no tenía (`artistProfile` solo en artist o si ya existía;
  `sectionVisibility` solo si existía o se oculta algo);
- al guardar se descartan solo los elementos **totalmente vacíos**; los incompletos se reportan;
- en artist, los destacados se guardan en `artistProfile.achievements`; en el resto, en `about.highlights`;
- características de paquetes: **una por línea** (pueden contener comas).

Las acciones ▲/▼/✕/Agregar sincronizan primero los inputs con el modelo, sin filtrar elementos.

Verificado en `tests/generator-form.test.ts`: cargar y guardar sin cambios cada `clients/*.json` produce un
objeto **idéntico** al original.

## Limitaciones conocidas (pendientes, Fase 1.5 del plan comercial)
- Muchos campos del esquema no tienen control en el editor (se conservan, pero se editan a mano).
- En artist, `about.description` y `artistProfile.bio` son independientes: el sitio muestra `bio` si
  existe, pero el editor solo edita `about.description`.
- "+ Nuevo" parte siempre de una plantilla de artista.
- La lista de clientes no se refresca si se borra un archivo fuera del editor.
- Sin vista previa visual (solo JSON y resumen).

## Reglas para modificarlo
1. Un campo nuevo editable: control en el HTML + `formFromConfig`/`buildConfig` (o `LISTS`) + test.
2. Nunca reconstruir objetos: fusionar sobre el original con `setOrDelete`.
3. Todo `innerHTML` con datos pasa por `esc()`.
4. No quitar ninguna capa de seguridad; cualquier cambio en `server.mjs` debe ir con su test.
5. Tras cambios: `npm test` y verificación MCP (`MCP_VERIFICATION.md` §3: cargar y guardar cada cliente).
