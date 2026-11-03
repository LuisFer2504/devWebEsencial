# Project Overview — Web Esencial

> Basado en la auditoría del código (2026-11-02). "Verificado" = comprobado ejecutando comandos o
> leyendo el código; "No verificado" = no se pudo comprobar en esta auditoría.

## Qué es realmente

Un **motor de landing pages de una sola página** construido con Next.js. El contenido de cada
cliente está en `clients/<id>.json`; un build con `CLIENT_ID=<id>` produce un sitio estático
(`out/`) con una de 4 variantes visuales. Un editor local (`npm run generate`, puerto 3001) permite
crear/editar esos JSON mediante formulario.

No es: un SaaS, un CMS, un sistema multi-página, ni una plataforma multi-tenant en runtime. No hay
base de datos, autenticación, backend en producción, formularios con envío, ni panel para clientes.

## Inventario

| Elemento | Cantidad / ubicación |
|---|---|
| Variantes | 4: `professional`, `commerce`, `beauty`, `artist` (`src/components/variants/`) |
| Componentes compartidos | 4: Navbar, ContactSection, Footer, WhatsAppFloatingButton |
| Clientes | 5: 4 demos + `consultoria-proyectos` (professional) |
| Tests | 13 en 2 archivos (Vitest) |
| Editor | `tools/generator/server.mjs` (181 líneas) + `index.html` (1622 líneas) |
| Rutas generadas | `/` y `/_not-found` (más `404.html`) |

## Estado verificado (2026-11-02, Node v22.12.0, npm 10.9.0)

| Comprobación | Resultado |
|---|---|
| `npm test` | 13/13 pasan |
| `npm run type-check` | 0 errores |
| `npm run lint` | sin warnings ni errores |
| `CLIENT_ID=demo-artist npm run build` | OK; `/` = 3.51 kB, First Load JS 109 kB; `out/` = 1.1 MB |
| `npm run generate` | Arranca; `GET /api/clients` lista los 5 clientes |
| Generador fuera del bundle | Verificado: ninguna referencia a `generator`/`api/save` en `out/` |

## Funcionalidades

### Implementadas y verificadas
- Carga y validación estricta del JSON en build time con mensajes de error por campo.
- Sanitización del `CLIENT_ID` contra path traversal (loader y servidor del generador).
- Selección de variante por `config.variant` y exportación estática.
- Metadatos `title`, `description`, `keywords`, Open Graph básico, `robots: index/follow`.
- Enlaces de WhatsApp `wa.me` con mensaje por servicio/producto/paquete.
- Embeds YouTube (dominio `youtube-nocookie.com`) y Vimeo, carga `lazy`.
- Visibilidad de secciones (`sectionVisibility`) y títulos configurables (`sectionTitles`, parcial).
- Navbar responsive con menú móvil; enlaces solo a secciones visibles.
- Generador: listar, cargar, crear, validar con Zod, bloquear sobrescritura sin confirmación.

### Parcialmente implementadas
- **Colores de marca**: solo `colors.primary` se usa (botones principales). `primaryHover`, `accent`,
  `neutralBg` se inyectan como CSS vars que **ningún componente usa**. Los acentos (azul, naranja,
  rosa, ámbar) están fijos por variante.
- **Títulos configurables**: el esquema tiene 22 claves; las variantes usan muchas, pero el editor solo
  edita 4 (`servicesTitle`, `advantagesTitle`, `contactTitle`, `videosTitle`).
- **"Vista previa" del editor**: solo JSON + resumen (variante, color, conteos). No hay preview visual
  del sitio.
- **Edición sin pérdida**: el editor pierde campos al re-guardar (ver GENERATOR.md).
- **Variante artist**: funciona, pero Navbar y Footer son blancos sobre una página oscura; las clases
  `aspect-4/5`, `aspect-4/3`, `blur-xs`, `bg-radial-at-c` no existen en Tailwind 3.4 (verificado en el CSS
  generado: 0 coincidencias), por lo que retrato/galería no tienen la proporción prevista.
- **Eventos**: la fecha es texto libre; el recuadro del mes hace `date.split("-")[1]` y con los datos
  demo ("14 Noviembre 2026") muestra siempre "FECHA". No se ocultan eventos pasados.
- **Imágenes**: solo URLs externas (Unsplash en demos); sin gestión de assets, tamaños ni optimización
  (`images.unoptimized: true`, `<img>` nativo).

### No existen
- Formulario de contacto con envío (solo WhatsApp, `tel:`, `mailto:`).
- `sitemap.xml`, `robots.txt`, URL canónica, `metadataBase`, `og:url`, JSON-LD.
- Favicon/logo por cliente (se publica el favicon por defecto de Next y los SVG de plantilla de
  `public/`: `next.svg`, `vercel.svg`, etc.).
- Analítica, consentimiento de cookies, páginas legales.
- CI, scripts de despliegue, build multi-cliente.
- Versionado/migración del esquema.
- Preview visual en vivo; subida de imágenes.

## Riesgos principales (resumen; detalle en ROADMAP.md)
1. Todo el proyecto está **sin commitear** (solo existe el commit de `create-next-app`).
2. API del generador con `Access-Control-Allow-Origin: *` (verificado): cualquier web abierta en el
   navegador puede escribir/sobrescribir `clients/*.json` mientras el generador corre.
3. El editor pierde datos al re-guardar clientes existentes.
4. Build sin `CLIENT_ID` publica silenciosamente `demo-professional`.
5. `demo-artist` usa un nombre que parece corresponder a un artista real ("Tyler Kealey"; no
   verificado) con biografía y cifras redactadas para el demo, y videos de YouTube de terceros. Sin
   autorización no es apto como portafolio comercial.
6. El test del generador no prueba `server.mjs` sino una copia del handler.
