---
name: web-esencial
description: Cómo trabajar correctamente en Web Esencial (generador multi-cliente de landing pages estáticas con Next.js + Zod + JSON por cliente). Úsala para cualquier tarea en este repo que toque clients/*.json, el esquema Zod, variantes visuales (professional, commerce, beauty, artist), componentes compartidos, el editor local tools/generator, build/exportación por CLIENT_ID, despliegue por cliente, SEO, WhatsApp o tests.
---

# Web Esencial — guía de trabajo

## Cuándo activar esta Skill

Cualquier tarea en este repositorio que:
- cree o modifique un cliente (`clients/<id>.json`);
- cambie `src/schemas/client.schema.ts`, `src/config/client-loader.ts`, `src/app/*`;
- toque `src/components/shared/*` o `src/components/variants/*`, o cree una variante nueva;
- modifique el editor local (`tools/generator/server.mjs`, `tools/generator/index.html`);
- prepare un build, una entrega o un despliegue para un cliente;
- evalúe calidad, SEO, accesibilidad o preparación comercial.

## Modelo mental (léelo primero)

```
clients/<id>.json ──(Zod, build time)──> loadClientConfig() ──> layout.tsx (SEO, CSS vars)
                                                         └──> page.tsx switch(variant) ──> <XTheme config>
tools/generator (localhost:3001) ──POST /api/save──(Zod)──> clients/<id>.json
CLIENT_ID=<id> next build ──> out/  (HTML estático de UNA página, un cliente por build)
```

- Un build = un cliente. No hay rutas por cliente ni multi-tenant en runtime.
- El JSON es contenido **público**: todo lo que contiene puede acabar en el HTML.
- La variante decide layout y estilos; los componentes compartidos dan Navbar, Contacto, Footer y botón
  flotante de WhatsApp a todas las variantes.
- El generador es una herramienta interna separada; nunca forma parte del bundle público.

Detalle: `references/ARCHITECTURE.md`.

## 1. Investigar antes de implementar

1. Lee `CLAUDE.md` y la referencia relevante (tabla al final).
2. Localiza todos los consumidores del campo/componente: `Grep` por el nombre del campo en `src/`,
   `tools/generator/index.html` (funciones `collectFormData`, `populateForm`, `render*`) y `clients/`.
3. Para un cambio de esquema, comprueba qué clientes usan el campo:
   `grep -l '"campo"' clients/*.json`.
4. Si algo no está en el código, **no lo des por existente**. Dilo explícitamente.

## 2. Crear o modificar un cliente

- Parte de un demo de la misma variante (`clients/demo-<variant>.json`).
- `id` = slug (`^[a-z0-9]+(-[a-z0-9]+)*$`) e igual al nombre del archivo.
- Campos obligatorios y límites: `references/CLIENT_CONFIGURATION.md`.
- Editar a mano el JSON es hoy **más seguro** que re-guardar desde el editor (el editor pierde campos:
  `colors.accent`, `colors.neutralBg`, `contact.googleMapsUrl`, `seo.ogImage`, la mayoría de
  `sectionTitles`, `packages[].ctaText/ctaLink`, `events[].description`, etc.; ver `references/GENERATOR.md`).
- Valida: `npm test` (si es demo) y siempre `CLIENT_ID=<id> npm run build`.
- No pongas datos privados, claves ni tokens en el JSON.

## 3. Modificar el esquema sin romper clientes

- Campos nuevos: `.optional()` o `.default(...)`. Nunca hagas obligatorio un campo existente opcional.
- No renombres/elimines campos: añade el nuevo, lee ambos en los componentes, migra después.
- Zod `z.object` **elimina claves desconocidas** al parsear: un campo que exista en JSON pero no en el
  esquema desaparece al guardar desde el generador. Añade al esquema antes de usarlo en JSON.
- Actualiza también `src/types/client.ts` (re-export) y el generador (`collectFormData` + `populateForm`).
- Ejecuta la suite completa y compila un cliente por variante.

## 4. Crear una variante visual nueva

Checklist (todos los pasos son necesarios):
1. Añadir el valor a `ClientVariantSchema` en `src/schemas/client.schema.ts`.
2. Crear `src/components/variants/<Nombre>Theme.tsx` con la firma `({ config }: { config: ClientConfig })`,
   reutilizando `Navbar`, `ContactSection`, `Footer`, `WhatsAppFloatingButton`.
3. Respetar contratos: ids de sección (`#inicio`, `#nosotros`, `#servicios`, `#ventajas`, `#contacto`;
   artist usa `#biografia`, `#musica`, `#galeria`, `#fechas`, `#paquetes`), `sectionVisibility` (`!== false`),
   `sectionTitles` con fallback, listas vacías ocultan la sección.
4. Usar `colors.primary` para CTAs (hoy vía `style={{ backgroundColor }}`); no introducir textos fijos
   que no se puedan configurar.
5. Añadir el `case` en `src/app/page.tsx` (el `default` cae en professional).
6. Revisar `Navbar` y `Footer` (tienen ramas por `variant === "artist"`).
7. Añadir el radio de variante en `tools/generator/index.html`.
8. Crear `clients/demo-<variante>.json` y un test de carga en `tests/client-config.test.ts`.
9. Compilar con `CLIENT_ID=demo-<variante>` y revisar en móvil (375 px) y escritorio.

Guía visual y deuda conocida: `references/DESIGN_SYSTEM.md`.

## 5. Modificar componentes compartidos

Afectan a las 4 variantes. Antes de cerrar: compila `demo-professional`, `demo-commerce`,
`demo-beauty`, `demo-artist` y revisa las ramas `isArtist`. `Navbar` es el único `"use client"`:
no importes ahí nada que use `fs` (p. ej. `client-loader`).

## 6. Modificar el generador

- `server.mjs` importa el esquema `.ts` directamente (requiere Node ≥ 22.6).
- La UI es HTML + JS sin framework, con Tailwind por CDN (solo herramienta interna).
- Cualquier campo nuevo debe agregarse en: HTML del tab, `populateForm`, `collectFormData`, y si es
  lista, su `render*`. Preferir **fusionar sobre `currentConfig`** en vez de reconstruir objetos, para no
  perder campos.
- `tests/generator-api.test.ts` prueba una **copia** del handler, no `server.mjs`: si cambias el servidor,
  ese test no lo detecta. Verifica manualmente con `npm run generate` + `curl`.
- No relajes: validación de slug, Zod, comprobación de path, bloqueo de sobrescritura, bind a `127.0.0.1`.

## 7. Validar

```bash
npm test                 # 13 tests (2 archivos)
npm run type-check
npm run lint
CLIENT_ID=<id> npm run build   # por cada cliente/variante afectada
```
PowerShell: `$env:CLIENT_ID='<id>'; npm run build`. Ver `references/TESTING.md`.
Nunca declares algo terminado sin ejecutar esto; nunca inventes resultados. No modifiques código para
ocultar un error preexistente: repórtalo.

### Verificación con MCP (obligatoria antes de cada PR de código)
Todo cambio grande que llegue al sitio o al editor se comprueba en un navegador real con el MCP de
Chrome DevTools antes de abrir el PR: `npm run qa:build` + `npm run qa:serve`, capturas en móvil y
escritorio, `tools/qa/page-audit.js` con `evaluate_script`, consola, Lighthouse y traza de rendimiento; y
si toca el editor, la prueba de cargar/guardar sin pérdidas. El objetivo es que quede **listo para vender**,
no solo que compile. Procedimiento, umbrales y alternativa si el MCP falla:
`references/MCP_VERIFICATION.md`.

## 8. Preparar una entrega a cliente

Checklist en `references/DEPLOYMENT.md` (build limpio, contenido real, imágenes propias, SEO,
WhatsApp probado en móvil, Lighthouse, dominio). No despliegues sin autorización explícita.

## 9. Errores arquitectónicos a evitar

- Importar `tools/` o `fs` en código cliente; meter el editor en el bundle público.
- Hacer obligatorio un campo existente o renombrarlo (rompe clientes).
- Duplicar tipos fuera de Zod; duplicar lógica de WhatsApp/embeds fuera de `src/utils/`.
- Textos o claims fijos en variantes que no aplican a todos los clientes (ej.: la cinta "Envíos
  Rápidos / Garantía" de Commerce ya es deuda).
- Clases Tailwind v4 en un proyecto v3.
- Confiar en el fallback a `demo-professional` cuando falta `CLIENT_ID`.
- Ampliar CORS o escuchar en `0.0.0.0` en el generador.
- Guardar desde el editor un cliente real sin revisar el diff del JSON.

## Referencias

| Documento | Contenido |
|---|---|
| `references/PROJECT_OVERVIEW.md` | Qué es, estado real verificado |
| `references/ARCHITECTURE.md` | Flujo de datos, módulos, límites |
| `references/BUSINESS_MODEL.md` | Modelo comercial: evidencia vs propuesta |
| `references/CLIENT_CONFIGURATION.md` | Esquema campo a campo, reglas por variante |
| `references/DESIGN_SYSTEM.md` | Variantes, tokens, convenciones UI, deuda visual |
| `references/GENERATOR.md` | Editor local: API, UI, limitaciones, riesgos |
| `references/DEPLOYMENT.md` | Build, exportación, Vercel, checklist de entrega |
| `references/TESTING.md` | Suite actual, cobertura, cómo verificar |
| `references/MCP_VERIFICATION.md` | Verificación en navegador con MCP antes de cada PR de código |
| `references/COMMERCIAL_READINESS.md` | Evaluación para venta |
| `references/ROADMAP.md` | P0–P3 con criterios de aceptación |
