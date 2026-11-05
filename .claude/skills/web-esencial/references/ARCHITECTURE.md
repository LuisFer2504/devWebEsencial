# Architecture — Web Esencial

## Vista general

```
                    ┌──────────────────────── tiempo de edición (local) ───────────────────────┐
navegador :3001 ──► tools/generator/index.html ──fetch──► tools/generator/server.mjs (node:http)
                                                            │  import ../../src/schemas/client.schema.ts
                                                            ▼  (Zod safeParse)
                                                       clients/<id>.json
                    └──────────────────────────────────────────────────────────────────────────┘
                    ┌──────────────────────── tiempo de build ─────────────────────────────────┐
CLIENT_ID=<id> next build
   src/app/layout.tsx ── generateMetadata() ─┐
   src/app/page.tsx ─────────────────────────┼─► loadClientConfig() ─► fs.readFileSync(clients/<id>.json)
                                             │                         └► ClientConfigSchema.safeParse
                                             └─► switch(config.variant) → <XTheme config={config}/>
   output: "export" ─► out/index.html + out/_next/static/*  (sitio estático de una página)
                    └──────────────────────────────────────────────────────────────────────────┘
```

## Módulos

| Módulo | Responsabilidad | Notas |
|---|---|---|
| `src/schemas/client.schema.ts` | Contrato Zod de un cliente y sub-esquemas | Única fuente de tipos (`z.infer`). Usado por app, tests y generador |
| `src/types/client.ts` | Re-export de tipos | Solo `export type` |
| `src/config/client-loader.ts` | `getActiveClientId()` (vía `client-id.ts`: `CLIENT_ID` obligatorio en builds) y `loadClientConfig(id)` (id estricto, debe coincidir con el archivo) | Usa `node:fs`; solo en Server Components / build. Se llama 3 veces por build (metadata, layout, page), sin caché |
| `src/app/layout.tsx` | Metadatos (`generateMetadata`), `<html lang="es">`, inyección de `--brand-primary`, `--brand-primary-hover`, `--brand-accent` | Las CSS vars no se usan en ningún componente ni en `tailwind.config.ts` |
| `src/app/page.tsx` | Selección de variante | `default` → Professional |
| `src/components/shared/Navbar.tsx` | Cabecera sticky, menú móvil, CTA WhatsApp | Único `"use client"` (estado del menú). Recibe el `config` completo (todo es público) |
| `src/components/shared/ContactSection.tsx` | WhatsApp, teléfono, email, dirección, mapa, horario, redes | Se oculta si no hay datos o `sectionVisibility.contact === false` |
| `src/components/shared/Footer.tsx` | Pie con enlaces y © | Enlaces fijos por rama artist/no-artist, sin mirar visibilidad |
| `src/components/shared/WhatsAppFloatingButton.tsx` | Botón flotante | Solo si hay `contact.whatsapp` |
| `src/components/variants/*Theme.tsx` | Composición completa de la página por variante | Server Components; cada una compone shared + secciones propias |
| `src/utils/whatsapp.ts` | `buildWhatsAppLink(phone, msg)` → `https://wa.me/<dígitos>?text=` | Quita todo lo no numérico (no añade código de país) |
| `src/utils/media.ts` | `getEmbedVideoUrl(url)` → YouTube nocookie / Vimeo player o `null` | Spotify no se embebe (se muestra enlace externo) |
| `tools/generator/server.mjs` | API local: `GET /`, `GET /api/clients`, `GET /api/client/:id`, `POST /api/save` | `127.0.0.1:3001`, Host local, token de sesión, sin CORS, 1 MB, copias de seguridad |
| `tools/generator/index.html` | UI del editor (10 pestañas), vanilla JS, Tailwind CDN | Ver GENERATOR.md |

## Límites y aislamiento

- **Público vs interno**: `tools/` no se importa desde `src/` (verificado; el build no contiene el
  generador). `tsconfig.json` incluye `**/*.ts` pero `tools/` solo tiene `.mjs`/`.html`.
- **Server vs client**: solo `Navbar` es client component. El loader con `fs` nunca debe llegar al bundle
  cliente.
- **Datos**: todo el contenido del JSON es público (se serializa en el HTML y en el payload RSC de
  `Navbar`). No hay secretos ni variables privadas en el flujo.

## Multi-cliente

- Un build = un cliente, elegido por env var. No hay rutas `/[client]`.
- Despliegue previsto: un proyecto Vercel por cliente con `CLIENT_ID` (README; no hay config de Vercel
  en el repo).
- Sin `CLIENT_ID` válido el build falla (`next.config.ts` → `client-id.ts`): un proyecto mal configurado no publica nada.

## Convenciones observadas

- TypeScript estricto, alias `@/*` → `src/*`.
- Componentes como `export function NombreTheme({ config })`, props tipadas con `ClientConfig`.
- Visibilidad: `sectionVisibility?.x !== false` (ausente = visible) + lista no vacía.
- Títulos: `sectionTitles?.x || "texto por defecto"`.
- Imágenes: `<img>` con `// eslint-disable-next-line @next/next/no-img-element`.
- Enlaces externos: `target="_blank" rel="noopener noreferrer"`.
- Iconos `aria-hidden` en la mayoría de los casos; textos en español.
- Mensajes de error del loader con prefijo `[client-loader]`.

## Deuda técnica estructural

1. Encabezados de sección (subtítulo + h2 + descripción) duplicados en las 4 variantes; candidato a un
   `SectionHeader` compartido.
2. Lógica `show*` repetida por variante.
3. Ramas `isArtist` dentro de componentes compartidos (Navbar, Footer, ContactSection): acoplan los
   shared a una variante concreta.
4. Campos de esquema sin consumidor: `colors.primaryHover/accent/neutralBg` (solo CSS vars sin uso),
   `services[].icon`, `advantages[].icon`, `gallery[].isFeatured`, `videos[].platform`,
   `artistProfile.bioShort`, `about.aboutImage` (solo artist). `services[].duration` solo lo muestra Beauty.
5. `loadClientConfig` se ejecuta tres veces por build (sin memoización).
