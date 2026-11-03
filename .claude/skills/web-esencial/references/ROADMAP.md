# Roadmap — Web Esencial (2026-11-02)

P0 = bloquea la venta · P1 = necesario para una entrega profesional · P2 = mejoras importantes ·
P3 = futuro. Nada de esto está implementado. Cada tarea debe cerrar con `npm test`,
`npm run type-check`, `npm run lint` y el build de los clientes afectados.

---

## P0 — bloqueantes para vender

### P0-1 Línea base en git
- **Descripción**: commitear el estado actual (todo salvo el scaffold está sin versionar) en una rama.
- **Problema**: cualquier error o borrado es irrecuperable; no hay forma de revisar cambios.
- **Archivos**: todo el repo (`clients/`, `src/`, `tools/`, `tests/`, docs).
- **Dependencias**: ninguna. **Riesgo**: bajo.
- **Aceptación**: `git status` limpio; rama por defecto coherente (hoy `master` local vs `main` principal).
- **Verificación**: `git log` muestra el commit; `git status` vacío.

### P0-2 Cerrar la API del generador a otros orígenes
- **Descripción**: quitar `Access-Control-Allow-Origin: *`, rechazar peticiones cuyo `Origin`/`Host` no sea
  `localhost:3001`/`127.0.0.1:3001`, responder 413 al superar 1 MB.
- **Problema**: verificado que cualquier web puede escribir `clients/*.json` mientras el editor corre.
- **Archivos**: `tools/generator/server.mjs`, `tests/generator-api.test.ts`.
- **Dependencias**: P0-6 facilita testearlo. **Riesgo**: bajo (la UI es same-origin).
- **Aceptación**: preflight desde `https://evil.example` → sin cabecera CORS y 403; la UI sigue guardando.
- **Verificación**: `curl -i -X POST -H "Origin: https://evil.example" .../api/save` → 403; test automatizado.

### P0-3 Editor sin pérdida de datos
- **Descripción**: `collectFormData` debe fusionar sobre `currentConfig`; conservar ids existentes; crear
  `artistProfile` solo en variante artist; no forzar `visible`/`platform`; escapar HTML en `render*` y en
  `showAlert`.
- **Problema**: re-guardar 4 de 5 clientes borra/altera campos (ver GENERATOR.md).
- **Archivos**: `tools/generator/index.html`.
- **Dependencias**: P0-1. **Riesgo**: medio (UI sin tests).
- **Aceptación**: cargar y guardar sin cambios cada `clients/*.json` produce un JSON idéntico salvo
  defaults de Zod.
- **Verificación**: guardar cada demo con otro id y `git diff --no-index clients/a.json clients/b.json`;
  test round-trip en jsdom (P2-1).

### P0-4 Corregir clases Tailwind inexistentes
- **Descripción**: sustituir `shadow-2xs`, `shadow-xs`, `blur-xs`, `backdrop-blur-xs`, `aspect-4/5`,
  `aspect-4/3`, `bg-radial-at-c`, `flex-2` por equivalentes de Tailwind 3.4 (`shadow-sm`, `blur-sm`,
  `aspect-[4/5]`, `flex-[2]`, gradiente arbitrario).
- **Problema**: retrato/galería del artista sin proporción, sombras y blur ausentes.
- **Archivos**: `src/components/variants/*.tsx`.
- **Dependencias**: ninguna. **Riesgo**: bajo (cambio visual intencionado).
- **Aceptación**: `grep` de esas clases en `src/` = 0; las nuevas presentes en el CSS compilado.
- **Verificación**: build de los 4 demos; inspección visual de galería y retrato.

### P0-5 Build seguro por cliente
- **Descripción**: si `process.env.VERCEL` o `CI` están definidos y falta `CLIENT_ID`, fallar el build;
  mantener el fallback solo en desarrollo local.
- **Problema**: un proyecto mal configurado publica `demo-professional` sin aviso.
- **Archivos**: `src/config/client-loader.ts`, `tests/client-config.test.ts`, DEPLOYMENT.md.
- **Dependencias**: ninguna. **Riesgo**: bajo.
- **Aceptación**: `CI=1 npm run build` sin `CLIENT_ID` falla con mensaje claro; con `CLIENT_ID` funciona.
- **Verificación**: ambos comandos + test unitario de `getActiveClientId`.

### P0-6 Demos comercialmente seguros
- **Descripción**: reemplazar en `demo-artist` el nombre/biografía de una persona aparentemente real y los
  videos de terceros por contenido ficticio propio o autorizado; revisar el resto de demos (marcas como
  "Cemento Sol", "Pavco", "Indeco" en commerce) y enlaces de redes genéricos.
- **Problema**: los demos serán el portafolio de venta; usar identidades reales sin permiso es un riesgo
  legal y reputacional.
- **Archivos**: `clients/demo-*.json`, `tests/client-config.test.ts` (fija `businessName`).
- **Dependencias**: ninguna. **Riesgo**: bajo.
- **Aceptación**: ningún nombre de persona real ni contenido de terceros sin licencia en los demos.
- **Verificación**: revisión manual + tests actualizados en verde.

### P0-7 SEO técnico mínimo por cliente
- **Descripción**: añadir `seo.siteUrl` opcional → `metadataBase`, canonical, `og:url`; generar
  `robots.txt` y `sitemap.xml` (`app/robots.ts`, `app/sitemap.ts`); JSON-LD `LocalBusiness`/`MusicGroup`;
  favicon por cliente; retirar SVG de plantilla de `public/`.
- **Problema**: sitios entregados sin indexación correcta ni identidad en la pestaña.
- **Archivos**: `src/schemas/client.schema.ts`, `src/app/layout.tsx`, `src/app/robots.ts` y
  `sitemap.ts` (nuevos), `public/`, generador (pestaña SEO).
- **Dependencias**: P0-3 (para editar los campos nuevos sin pérdidas). **Riesgo**: bajo-medio (campo
  opcional, compatible).
- **Aceptación**: `out/` contiene `robots.txt`, `sitemap.xml`, `<link rel="canonical">`, JSON-LD válido;
  clientes sin `siteUrl` siguen compilando.
- **Verificación**: build + inspección de `out/index.html`; validador de datos estructurados.

### P0-8 Solape en móvil (commerce)
- **Descripción**: ocultar el botón flotante cuando existe la barra fija o elevarlo; añadir padding
  inferior a la página.
- **Problema**: el CTA principal en móvil queda tapado.
- **Archivos**: `CommerceTheme.tsx`, `WhatsAppFloatingButton.tsx` (prop opcional).
- **Dependencias**: ninguna. **Riesgo**: bajo.
- **Aceptación**: a 375 px no hay solape y el footer es completamente visible.
- **Verificación**: DevTools en modo móvil con `demo-commerce`.

---

## P1 — entrega profesional

### P1-1 Colores de marca reales
- **Descripción**: exponer `--brand-primary`, `--brand-primary-hover`, `--brand-accent` como colores en
  `tailwind.config.ts` y reemplazar acentos fijos (blue/orange/pink/amber) por tokens de marca con
  valores por defecto por variante.
- **Problema**: dos clientes de la misma variante se ven casi iguales.
- **Archivos**: `tailwind.config.ts`, `layout.tsx`, variantes, shared.
- **Dependencias**: P0-4. **Riesgo**: medio (cambio visual en todos los clientes; definir defaults iguales
  al aspecto actual).
- **Aceptación**: cambiar `primary`/`accent` en el JSON cambia acentos, badges y enlaces.
- **Verificación**: build de cada demo con colores alternativos; comparación visual.

### P1-2 Gestión de imágenes por cliente
- **Descripción**: convención `public/clients/<id>/…` (o carpeta fuera de `public/` copiada en build
  solo para el cliente activo), rutas relativas en el JSON, dimensiones/proporciones fijas, guía de
  tamaños y compresión.
- **Problema**: dependencia de URLs externas, CLS, imágenes sin derechos.
- **Archivos**: `next.config.ts`, script de build, variantes, generador, CLIENT_CONFIGURATION.md.
- **Dependencias**: P0-1. **Riesgo**: medio (no publicar imágenes de otros clientes en cada build).
- **Aceptación**: el `out/` de un cliente contiene solo sus imágenes; sin CLS apreciable.
- **Verificación**: listar `out/`; Lighthouse CLS.

### P1-3 Tema oscuro coherente en artist
- **Descripción**: prop de tono (`light`/`dark`) para Navbar y Footer en vez de ramas por variante.
- **Problema**: header y footer blancos sobre página oscura.
- **Archivos**: `Navbar.tsx`, `Footer.tsx`, `ArtistTheme.tsx`.
- **Dependencias**: ninguna. **Riesgo**: bajo.
- **Aceptación**: artist con header/footer oscuros; otras variantes sin cambios.
- **Verificación**: build de los 4 demos.

### P1-4 Eliminar textos fijos comerciales
- **Descripción**: hacer configurable (o eliminar si está vacía) la cinta de "facilidades" de Commerce y
  el texto de la tarjeta WhatsApp; revisar otros textos fijos afirmativos.
- **Problema**: afirmaciones falsas para clientes que no ofrecen envíos/garantía.
- **Archivos**: `client.schema.ts` (campo opcional, p. ej. `features[]`), `CommerceTheme.tsx`, generador.
- **Dependencias**: P0-3. **Riesgo**: bajo si el default mantiene el comportamiento actual.
- **Aceptación**: cliente sin el campo se ve igual que hoy o sin la cinta (decisión de producto).
- **Verificación**: build con y sin el campo.

### P1-5 Eventos con fecha estructurada
- **Descripción**: aceptar fecha ISO opcional (`dateIso`) para ordenar, mostrar mes/día y ocultar eventos
  pasados en build; mantener `date` libre como texto de presentación.
- **Problema**: el recuadro muestra "FECHA"; eventos vencidos seguirían visibles.
- **Archivos**: esquema, `ArtistTheme.tsx`, generador (`<input type="date">`).
- **Dependencias**: P0-3. **Riesgo**: bajo (campo opcional).
- **Aceptación**: con `dateIso` se muestra el mes; eventos pasados no aparecen.
- **Verificación**: test unitario del helper de fechas + build.

### P1-6 Preview visual en el editor
- **Descripción**: botón que guarda en un id temporal y abre `next dev` con ese cliente (o renderiza la
  variante en un iframe vía un endpoint local), sin incluir nada en el bundle público.
- **Problema**: el operador guarda a ciegas.
- **Archivos**: `tools/generator/*`, posible script `scripts/preview.mjs`.
- **Dependencias**: P0-2, P0-3. **Riesgo**: medio.
- **Aceptación**: ver el sitio actualizado en < 10 s tras un cambio.
- **Verificación**: manual; el build de producción no contiene nada del preview.

### P1-7 Editor completo para el esquema
- **Descripción**: exponer los 22 `sectionTitles`, `googleMapsUrl`, `ogImage`, `accent`, `ctaText/ctaLink`,
  `events[].description`, visibilidad por ítem.
- **Problema**: obliga a editar JSON a mano.
- **Archivos**: `tools/generator/index.html`.
- **Dependencias**: P0-3. **Riesgo**: bajo.
- **Aceptación**: todo campo con consumidor en `src/` es editable.
- **Verificación**: matriz campo ↔ control revisada; round-trip sin pérdidas.

### P1-8 Accesibilidad y Lighthouse de base
- **Descripción**: auditar contraste, foco visible en todos los interactivos, captions de galería visibles
  en táctil, enlaces del Footer según visibilidad, `aria-label` de redes.
- **Archivos**: shared y variantes.
- **Dependencias**: P0-4, P1-3. **Riesgo**: bajo.
- **Aceptación**: Lighthouse móvil Accessibility ≥ 95 y SEO ≥ 95 en los 4 demos (objetivo propuesto).
- **Verificación**: Lighthouse/axe con reporte guardado.

### P1-9 Validación de URLs y protocolos
- **Descripción**: helper de esquema para links (`#ancla`, `https://`, `mailto:`, `tel:`) usado en CTAs,
  `ticketUrl`, `ctaLink`, imágenes.
- **Problema**: hoy cualquier string pasa (p. ej. `javascript:` o rutas rotas).
- **Archivos**: `client.schema.ts`, tests.
- **Dependencias**: comprobar que todos los clientes actuales siguen validando. **Riesgo**: medio
  (endurecer validación puede romper clientes: hacerlo con migración/aviso).
- **Aceptación**: los 5 clientes validan; `javascript:alert(1)` es rechazado.
- **Verificación**: tests nuevos.

### P1-10 Documentación y scripts de entrega
- **Descripción**: corregir README (Node ≥ 22.6, `npm start`, comandos PowerShell), script
  `npm run build:all` que compile cada `clients/*.json`, campo `engines` en `package.json`.
- **Dependencias**: ninguna. **Riesgo**: bajo.
- **Aceptación**: `npm run build:all` informa éxito/fallo por cliente.
- **Verificación**: ejecución del script.

---

## P2 — mejoras importantes

| Id | Tarea | Problema | Archivos | Riesgo | Aceptación / verificación |
|---|---|---|---|---|---|
| P2-1 | Tests reales del generador (exportar handler de `server.mjs`) + round-trip en jsdom | Tests actuales prueban una copia | `server.mjs`, `tests/` | Bajo | Romper `server.mjs` hace fallar un test |
| P2-2 | CI (GitHub Actions): test, type-check, lint, build:all | Regresiones invisibles en clientes no compilados | `.github/workflows/` | Bajo | PR con error falla en CI |
| P2-3 | Tests de render por variante (`renderToString`) | Sin cobertura de UI | `tests/` | Bajo | Ids de sección y CTAs presentes por demo |
| P2-4 | `SectionHeader` y helpers de visibilidad compartidos | Duplicación en 4 variantes | `shared/`, variantes | Medio | Mismo HTML antes/después (diff de `out/`) |
| P2-5 | Versionado de esquema (`schemaVersion`) y migraciones | Cambios futuros pueden romper clientes | esquema, loader, `scripts/` | Medio | Clientes v1 se migran y validan |
| P2-6 | Usar campos ya definidos sin consumidor (`icon`, `isFeatured`, `bioShort`, `aboutImage` fuera de artist) o retirarlos con migración | Expectativas falsas en el editor | esquema, variantes | Bajo | Cada campo tiene consumidor o está documentado como obsoleto |
| P2-7 | Analítica opcional por cliente (sin cookies o con consentimiento) | Sin métricas de conversión para el cliente | layout, esquema | Medio (privacidad) | Script solo si el campo existe |
| P2-8 | Formulario de contacto vía servicio externo (Formspree/Web3Forms o similar) | Clientes sin WhatsApp | ContactSection, esquema | Medio (dependencia externa, spam) | Envío probado; sin claves en el repo |
| P2-9 | Mapa embebido opcional | Solo enlace a Maps | ContactSection | Bajo | iframe `lazy` con título accesible |
| P2-10 | Memoizar `loadClientConfig` | 3 lecturas por build | `client-loader.ts` | Bajo | Una lectura por build |

## P3 — futuro

| Id | Tarea |
|---|---|
| P3-1 | Nuevas variantes por vertical (restaurante con carta, salud con citas, educación) |
| P3-2 | Sitios multipágina (servicios individuales, blog) |
| P3-3 | Multi-idioma por cliente (`lang` configurable, textos por defecto traducibles) |
| P3-4 | Panel para que el cliente final proponga cambios (requiere backend y auth: decisión de producto) |
| P3-5 | Automatización de alta en hosting/dominio (API de Vercel) |
| P3-6 | Upgrade a Tailwind 4 / versiones mayores de Next con plan de migración y comparación visual |
| P3-7 | Catálogo/galería para commerce con imágenes de producto |
