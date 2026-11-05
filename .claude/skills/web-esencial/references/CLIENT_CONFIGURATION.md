# Client Configuration — `clients/<id>.json`

Contrato: `src/schemas/client.schema.ts` (`ClientConfigSchema`). Cargado por
`src/config/client-loader.ts`. Este documento resume el esquema; ante dudas, **el esquema manda**.

## Reglas generales

- Nombre de archivo = `id` + `.json`. `id`: `^[a-z0-9]+(-[a-z0-9]+)*$`.
- El loader sanea el `CLIENT_ID` (`[^a-z0-9-]` se elimina, minúsculas) antes de buscar el archivo.
- Zod **elimina claves desconocidas** y **aplica defaults** al parsear. El generador guarda el resultado
  parseado, por lo que reescribe el archivo normalizado.
- Todo el contenido es público.
- URLs de imágenes y enlaces son strings libres (salvo redes sociales, `googleMapsUrl`: `url()`).

## Campos raíz

| Campo | Tipo / regla | Obligatorio | Uso real |
|---|---|---|---|
| `id` | slug | sí | Nombre de archivo |
| `businessName` | string ≥ 2 | sí | Navbar, Footer, títulos por defecto, mensajes WhatsApp |
| `tagline` | string ≥ 3 | sí | Navbar (sin logo), Footer, quote fallback (artist) |
| `variant` | `professional`\|`commerce`\|`beauty`\|`artist` | sí | `page.tsx` |
| `colors.primary` | hex `#rgb`/`#rrggbb` | sí | Fondo de CTAs principales |
| `colors.primaryHover`, `accent`, `neutralBg` | hex | no | Solo CSS vars sin consumidor (sin efecto visual) |
| `logoUrl` | string | no | Navbar (reemplaza nombre + tagline) |
| `hero.badge` | string | no | Etiqueta del hero (artist: `genre` tiene prioridad) |
| `hero.title` | ≥ 5 | sí | H1 (artist usa `stageName` como H1 y no muestra `hero.title`) |
| `hero.description` | ≥ 10 | sí | Párrafo del hero |
| `hero.ctaPrimary.{text,link}` | ≥ 2 / ≥ 1 | sí | En commerce/beauty/artist, si hay WhatsApp, **el link se reemplaza** por WhatsApp |
| `hero.ctaSecondary` | `{text,link}` | no | Botón secundario |
| `hero.cta*.link = "whatsapp"` | valor especial | — | Se convierte en el chat de WhatsApp con `contact.whatsappDefaultMessage`. **Sin `contact.whatsapp` el botón no se muestra** (nunca genera un enlace roto) |
| `hero.heroImage` | string | no | Professional (panel lateral), Artist (fondo). Commerce/Beauty lo ignoran |
| `about.title` | ≥ 2 | sí | H2 de "nosotros"; Professional lo usa también en el panel lateral |
| `about.description` | ≥ 10 | sí | Texto (artist: `artistProfile.bio` tiene prioridad) |
| `about.highlights` | string[] | no | Lista destacada (Professional ≥ 2 → panel lateral del hero; Beauty → primeros 3 en hero) |
| `about.aboutImage` | string | no | Solo Artist (fallback de `portraitImage`) |
| `services[]` | `{id, title≥2, description≥5, price?, duration?, badge?, icon?}` | default `[]` | Professional, Commerce, Beauty. `icon` sin uso; `duration` solo Beauty |
| `advantages[]` | `{title≥2, description≥5, icon?}` | default `[]` | Professional, Commerce, Beauty. `icon` sin uso |
| `artistProfile` | `{stageName?, genre?, bookingZone?, bio?, bioShort?, portraitImage?, quote?, achievements?}` | no | Solo Artist. `bioShort` sin uso |
| `gallery[]` | `{id, url≥3, alt≥2, caption?, isFeatured?}` | no | Solo Artist. `isFeatured` sin uso |
| `videos[]` | `{id, title≥2, url≥5, description?, platform(default youtube)}` | no | Solo Artist. `platform` sin uso (se detecta por URL) |
| `events[]` | `{id, title, date≥3 (texto libre), time?, venue, city, description?, ticketUrl?, visible(default true)}` | no | Solo Artist. Si `date` incluye año (`2027-03-20`, `20/03/2027`, `20 Marzo 2027`) y ya pasó **al compilar**, el evento se oculta; sin año se muestra siempre |
| `packages[]` | `{id, title, description, price?, currency?, duration?, features?, ctaText?, ctaLink?, visible(default true)}` | no | Solo Artist. `ctaLink` solo si no hay WhatsApp |
| `showcase` | `{navLabel?, subtitle?, title?, description?, pendingLinkText?, items[≥1]: {title, description, image?, imageAlt?, url?, linkLabel?, tags?(≤6)}}` | no | Solo Professional: catálogo de tarjetas (`#plantillas`) antes de Servicios. `url` solo `http(s)://`; sin `url` se muestra `pendingLinkText` (nunca un enlace vacío). `image`: `https://` o ruta `/…` |
| `faq` | `{navLabel?, subtitle?, title?, items[≥1]: {question, answer}}` | no | Solo Professional: preguntas frecuentes (`#preguntas`) antes de Contacto |
| `demoBanner` | `{message, templateName, linkText?, url?}` | no | Todas las variantes: aviso superior "Estás viendo una demostración…". Además, **activa el modo demo**: los mensajes de WhatsApp por servicio/paquete/evento usan `whatsappDefaultMessage` (o "…demo de la plantilla <templateName>…") + el elemento consultado, en vez de dirigirse al negocio ficticio. Solo para los `demo-*` |
| `sectionTitles` | 22 claves opcionales `<seccion>{Subtitle,Title,Description}` | no | Ver abajo |
| `sectionVisibility` | `{about, services, advantages, contact, schedule, gallery, videos, events, packages}` booleanos, default `true` | no | Todas las variantes |
| `contact` | ver abajo | sí (objeto, puede ser `{}`) | ContactSection, Navbar, botones |
| `seo.title` | ≥ 5 | sí | `<title>`, `og:title` |
| `seo.description` | ≥ 15 | sí | meta description, `og:description` |
| `seo.keywords` | string[] | no | meta keywords |
| `seo.ogImage` | string | no | `og:image` (sin `metadataBase`: usar URL absoluta) |

### `contact`

| Campo | Regla | Notas |
|---|---|---|
| `whatsapp` | `^\+?[0-9\s-]{8,18}$` | Incluir código de país (`+51…`): `wa.me` necesita formato internacional y el código no se añade solo |
| `whatsappDefaultMessage` | string | Mensaje del CTA general |
| `phone` | string | `tel:` |
| `email` | email | `mailto:` |
| `address`, `city` | string | |
| `googleMapsUrl` | url | Enlace "Abrir en Google Maps" (no embebe mapa) |
| `schedule` | string[] | Horario; oculto si vacío o `sectionVisibility.schedule === false` |
| `socialLinks` | `{facebook, instagram, tiktok, linkedin, spotify, youtube, appleMusic, soundcloud}` (url) | No hay X/Twitter ni web propia |

### `sectionTitles` — uso por variante

Professional usa `about*`, `services*`, `advantages*`; ojo: `aboutTitle` titula la **caja de
highlights**, no la sección (el H2 viene de `about.title`). Commerce y Beauty: `aboutSubtitle`,
`services*`, `advantages{Subtitle,Title}`. Artist: `aboutSubtitle`, `videos*`, `gallery{Subtitle,Title}`,
`events*`, `packages*`. ContactSection: `contact*` (todas). `galleryDescription` no se usa.

### Demos y página comercial (Fase 2)

- `clients/demo-*.json` son negocios **ficticios** (Horizonte Contable, Ferretería Martillo Azul, Brisa Serena
  Spa, Elio Marén): sin teléfonos, correos, direcciones, redes ni videos de terceros, con `demoBanner`.
- `clients/web-esencial.json` es la página comercial (Professional + `showcase` + `faq`).
- **WhatsApp comercial pendiente**: cuando el propietario defina el número, añadir
  `"whatsapp": "+51 9XX XXX XXX"` dentro de `contact` en los 4 demos y en `web-esencial.json` (mismo
  número; `tests/demos-showcase.test.tsx` lo exige). No hace falta tocar componentes: aparecen solos el
  CTA "Solicitar cotización", el botón flotante y los botones por servicio/paquete.
- **URLs de demos pendientes**: añadir `url` a cada `showcase.items[]` cuando estén publicadas.
- Si no hay WhatsApp ni teléfono/correo visibles, los botones por elemento ("Consultar", "Reservar", paquetes)
  **no se muestran** (antes apuntaban a `#contacto` aunque no hubiera forma de contactar).

## Defaults de visibilidad efectivos

Sección visible si `sectionVisibility.<x> !== false` **y** hay datos. Contacto se oculta solo si no hay
ningún dato de contacto, ubicación, horario ni redes.

## Mínimo válido (probado en `tests/client-config.test.ts`)

`id`, `businessName`, `tagline`, `variant`, `colors.primary`, `hero.{title,description,ctaPrimary}`,
`about.{title,description}`, `contact` (puede ser `{}`), `seo.{title,description}`.

## Checklist para un cliente nuevo

1. Copiar `clients/demo-<variante>.json` → `clients/<id>.json`, cambiar `id`.
2. Reemplazar **todo** el contenido demo (textos, imágenes Unsplash, enlaces de redes genéricos).
3. WhatsApp con código de país y probado en un móvil.
4. `seo.title` ≤ 60 y `seo.description` ≤ 160 caracteres (el editor lo cuenta; Zod no lo limita).
5. `CLIENT_ID=<id> npm run build` sin errores; revisar `out/index.html` en navegador.
