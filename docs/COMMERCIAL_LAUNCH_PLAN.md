# Web Esencial — Plan de lanzamiento comercial

> Auditoría del 2026-11-05 sobre `produccion` @ `ce72b3e` (PRs #1–#5 fusionados).
> Cada afirmación marcada **[verificado]** se comprobó en esta auditoría con comandos, lectura de código o
> navegador (Chrome DevTools MCP). **[a confirmar]** = depende de condiciones externas (Vercel, legales) que
> no se pueden comprobar desde el repositorio. No se modificó código funcional ni se desplegó nada.

---

## 1. Resumen ejecutivo

**¿Está listo para vender? Todavía no.** Los **sitios** que genera Web Esencial ya tienen calidad de entrega
(100/100/100 en Lighthouse móvil en los 5 clientes, sin errores visuales, WhatsApp correcto). Lo que falta es
todo lo que **rodea** a esos sitios para poder venderlos y operarlos con seguridad:

| Bloqueante | Por qué bloquea |
|---|---|
| Demos con identidades, videos y teléfonos reales de terceros | No se pueden mostrar en público: riesgo legal y de enviar clientes potenciales a desconocidos |
| Editor que borra datos al guardar | Cada cambio de un cliente puede romper su sitio publicado |
| API del generador abierta a cualquier web (CORS `*`) | Cualquier página visitada puede sobrescribir los JSON de clientes |
| Build sin `CLIENT_ID` publica `demo-professional` | Un proyecto Vercel mal configurado publica el sitio equivocado |
| `next@15.1.7` con 9 avisos de seguridad (1 crítico) | Corrección disponible dentro de la misma versión mayor |
| Sin página comercial, galería ni proceso de despliegue documentado | No existe un lugar donde un cliente conozca y contrate el servicio |
| Sin SEO técnico ni identidad por cliente (favicon, og:image, canonical) | Un sitio entregado sin esto parece incompleto en buscadores y redes |

**Siguiente tarea recomendada:** `dev-estabilizacion-tecnica` (Fase 1): editor sin pérdidas + cierre de la
API del generador + `CLIENT_ID` obligatorio en Vercel + actualización de Next a 15.5.x. Son los cuatro
bloqueantes técnicos y no dependen de ninguna decisión comercial. En paralelo, el propietario debe decidir el
contenido ficticio de los demos y el plan de Vercel (ver §9).

---

## 2. Diagnóstico actual (comparado con la auditoría anterior)

| Área | Auditoría anterior | Estado actual | Evidencia |
|---|---|---|---|
| Seguridad del generador | CORS `*`, sin control de origen | **Sigue igual** | `tools/generator/server.mjs` sin cambios desde la línea base; `Access-Control-Allow-Origin: *` en líneas 20 y 31 [verificado] |
| Preservación de campos al editar | Pierde campos | **Sigue igual** | `collectFormData` reconstruye `colors`, `hero`, `about`, `artistProfile`, `contact`, `sectionTitles`, `seo`; 10 campos del esquema sin control en el editor (`googleMapsUrl`, `ogImage`, `trustBadges`, `accent`, `neutralBg`, `aboutImage`, `ctaText`, `ctaLink`, `bioShort`, `isFeatured`); 27 interpolaciones `value="${…}"` sin escapar [verificado] |
| Validación de configuraciones | Zod en build y en editor | **Mejorado** | Test que valida **todos** los `clients/*.json`; nuevo campo opcional `trustBadges` validado [verificado] |
| `CLIENT_ID` obligatorio | Fallback silencioso | **Sigue igual** | `client-loader.ts`: sin `CLIENT_ID` usa `demo-professional` [verificado] |
| Compilación de variantes | OK | **OK** | `npm run qa:build`: 5/5 clientes, 4 variantes [verificado] |
| Aislamiento entre clientes | No comprobado | **OK** | Cada `out/` contiene solo los datos de su cliente [verificado] |
| Responsive / móvil | Barra tapada, clases Tailwind 4 rotas | **Corregido (PR #5)** | MCP: `page-audit` ok en los 5 sitios, sin superposiciones ni desbordes [verificado] |
| Accesibilidad | 90–96 | **100 en los 5 sitios** | Lighthouse móvil vía MCP [verificado] |
| Buenas prácticas | Artist 77 (cookies YouTube) | **100 en los 5 sitios** | Videos diferidos con miniatura [verificado] |
| Rendimiento | Artist LCP 4,3 s en frío | **2,7 s** (objetivo 2,5 s) | Traza Slow 4G + CPU ×4; Commerce ~1,0 s [verificado] |
| WhatsApp | `987 654 321` → Irán | **Corregido** | `normalizeWhatsAppNumber` + tests; todos los enlaces con código de país [verificado] |
| Contacto en demos | — | **Nuevo hallazgo P0** | Demos con teléfonos `+51 987 654 321`, `+51 912 345 678`, `+51 998 877 665` y correos `.pe` que pueden pertenecer a terceros [verificado] |
| Contenido de demos | Persona real y videos ajenos | **Sigue igual** | `demo-artist`: "Tyler Kealey", videos `dQw4w9WgXcQ` (Rick Astley) y `kJQP7kiw5Fk` (Despacito); `demo-commerce` cita marcas reales; redes sociales apuntan a la portada genérica de cada red [verificado] |
| Fechas de eventos | — | **Caducan pronto** | `demo-artist`: 14 y 28 de noviembre de 2026 [verificado] |
| Gestión de imágenes | Solo URLs externas | **Sigue igual** | 5 imágenes, todas de `images.unsplash.com`; ningún cliente tiene `logoUrl` ni `ogImage`; sin carpeta de recursos por cliente [verificado] |
| SEO técnico | Ausente | **Sigue igual** | Ningún sitio genera `robots.txt`, `sitemap.xml`, canonical, `og:url`, `og:image` ni JSON-LD; favicon por defecto de Next; `lang="es"` correcto [verificado] |
| Archivos de plantilla | Publicados | **Sigue igual** | Cada sitio publica `next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg` [verificado] |
| Colores de marca | Solo `primary` | **Parcial** | `primary` en CTAs con texto legible automático; `accent`/`neutralBg` siguen sin uso [verificado] |
| Dependencias | No auditadas | **9 avisos** | `npm audit`: 1 crítico y 2 altos vía `next@15.1.7` (RSC "flight" RCE, `postcss`, `sharp`); corrección en `next@15.5.29` (misma versión mayor) [verificado] |
| Preparación para Vercel | Documentada, no probada | **Parcial** | `output: "export"` compatible; sin `vercel.json`, sin control de qué proyecto recompila, sin guardia de `CLIENT_ID` [verificado]; comportamiento real en Vercel [a confirmar] |
| Tests y QA | 13 tests | **139 tests + QA con MCP** | `npm test`, `qa:build`, `qa:serve`, `tools/qa/page-audit.js` [verificado] |
| Protección de `produccion` | Ninguna | **Hook local** | Barreras de Claude Code activas; GitHub sigue sin protección de rama (plan gratuito) [verificado] |

**Impacto real de las vulnerabilidades:** los sitios se publican como HTML estático; en Vercel no se ejecuta
ningún servidor Next, así que el RCE crítico no es explotable en los sitios publicados. Sí afecta al
servidor de desarrollo (`npm run dev`) y a la cadena de compilación. La actualización es barata y se
clasifica como P0 por higiene y porque un despliegue con `next start` sí quedaría expuesto.

---

## 3. Estado de preparación comercial

| Capacidad | ¿Listo? | Bloqueantes |
|---|---|---|
| Presentarse públicamente | **No** | No existe página comercial ni catálogo (P0) |
| Mostrar demos a clientes | **No** | Contenido de terceros y teléfonos reales en los demos (P0) |
| Recibir pedidos | **No** | No hay canal de cotización ni formulario de recopilación (P1) |
| Personalizar páginas | **Parcial** | El editor pierde datos y no expone todos los campos (P0); editar el JSON a mano funciona |
| Desplegar en producción | **Parcial** | Falta guardia de `CLIENT_ID`, control de recompilación por cliente y plan de Vercel comercial (P0) |
| Entregar sitios a clientes reales | **No** | Imágenes propias, favicon/og:image, SEO técnico y checklist de entrega (P1) |

### Hallazgos clasificados

**P0 — bloquea la venta o compromete la seguridad**
1. Editor que pierde datos al guardar (`tools/generator/index.html`).
2. API del generador con CORS `*` y sin comprobar origen (`tools/generator/server.mjs`).
3. Interpolación HTML sin escapar en el editor (corrupción de datos / XSS local).
4. Fallback silencioso a `demo-professional` sin `CLIENT_ID` (`src/config/client-loader.ts`).
5. `next@15.1.7` con avisos crítico/altos.
6. Demos con persona real, videos ajenos, marcas reales y teléfonos/correos que pueden ser de terceros.
7. No existe página comercial con catálogo de plantillas.
8. Plan de Vercel: los términos del plan gratuito (Hobby) restringen el uso comercial [a confirmar en los términos vigentes] → decisión del propietario antes de publicar sitios de clientes.

**P1 — necesario antes del lanzamiento comercial**
1. Imágenes propias por cliente sin mezclar recursos entre clientes.
2. SEO técnico: `siteUrl`, canonical, `og:url`, `og:image`, `robots.txt`, `sitemap.xml`, JSON-LD.
3. Favicon e identidad por cliente; retirar SVG de plantilla de `public/`.
4. Recompilación selectiva por cliente en Vercel (evitar que un cambio de un cliente redespliegue todos).
5. Canal de cotización y formulario de recopilación de datos.
6. Checklist de entrega y procedimiento de alta/actualización/baja documentados y probados.
7. Test real de `server.mjs` (hoy se prueba una copia).
8. Editor: exponer todos los campos (`googleMapsUrl`, `ogImage`, `trustBadges`, títulos, etc.) y mensajes de error comprensibles.
9. Fechas de eventos: ocultar eventos pasados.
10. Textos legales mínimos (aviso de privacidad) [a confirmar con asesoría].

**P2 — mejora posterior**
1. Colores secundarios (`accent`) aplicados en las variantes.
2. Vista previa visual en el editor.
3. Analítica opcional por cliente.
4. Formulario de contacto propio (además de WhatsApp).
5. Nuevas variantes (restaurante, salud…).
6. CI en GitHub Actions (tests + `qa:build`).
7. Versionado del esquema y migraciones.

---

## 4. Arquitectura recomendada

Principio rector: **un único mecanismo para todo**. Web Esencial ya sabe hacer una cosa muy bien, que es
generar una página estática a partir de un JSON. La página comercial, los demos y los sitios de clientes
deben ser **el mismo tipo de artefacto**: un `clients/<id>.json` compilado con su `CLIENT_ID` en su propio
proyecto de Vercel. Sin CMS, sin multi-tenant y sin una segunda base de código.

```
                         mismo repositorio (privado)
                    ┌────────────────────────────────────┐
 clients/web-esencial.json ──► Vercel "web-esencial"  ──► webesencial.pe   (página comercial + galería)
 clients/demo-professional.json ► Vercel "demo-professional" ► demo-professional.webesencial.pe
 clients/demo-commerce.json ───► Vercel "demo-commerce" ──► demo-commerce.webesencial.pe
 clients/demo-beauty.json ─────► Vercel "demo-beauty" ────► demo-beauty.webesencial.pe
 clients/demo-artist.json ─────► Vercel "demo-artist" ────► demo-artist.webesencial.pe
 clients/<cliente>.json ───────► Vercel "<cliente>" ──────► <cliente>.vercel.app → dominio propio
                    └────────────────────────────────────┘
       cada proyecto: env CLIENT_ID=<id>, compila solo su JSON, publica solo su out/
```

(Los dominios son ejemplos: el dominio comercial no existe todavía.)

### Por qué así
- **Cero infraestructura nueva:** la página comercial y los demos se despliegan exactamente igual que un cliente.
- **Los demos prueban el producto:** lo que el cliente ve en el demo es lo mismo que recibirá.
- **Aislamiento natural:** cada proyecto Vercel tiene su propia salida; ya se verificó que cada `out/`
  contiene solo los datos de su cliente.
- **Mantenimiento mínimo:** una mejora en un componente compartido llega a todos los sitios con el próximo build.

---

## 5. Flujo de demostraciones

### Alternativas evaluadas

| Alternativa | Ventajas | Inconvenientes | Decisión |
|---|---|---|---|
| Web comercial en un proyecto aparte (otro repo/stack) con enlaces a demos | Libertad total de diseño | Segunda base de código, dos sistemas de diseño, más mantenimiento | Descartada |
| Galería integrada en este proyecto con rutas `/demos/[variante]` en un solo build | Un solo despliegue | Rompe el modelo "un build = un cliente"; mezcla datos de todos los demos en una salida; complica el loader | Descartada |
| **Página comercial como un cliente más + cada demo como proyecto Vercel independiente** | Reutiliza el pipeline existente; los demos son idénticos a lo que se vende; aislamiento | Requiere una sección nueva tipo "catálogo" en el esquema y 5 proyectos Vercel | **Elegida** |

### Diseño
1. **`clients/web-esencial.json`** con la variante `professional` (la más sobria): qué es el servicio, cómo
   funciona, precios o "desde S/ …" (decisión comercial), preguntas frecuentes y botón de cotizar por WhatsApp
   con el número del propietario.
2. **Sección nueva opcional `showcase`** en el esquema (genérica, reutilizable también por clientes reales
   como "portafolio"): tarjetas con imagen, título, rubros, descripción y enlace externo.
   ```jsonc
   "showcase": {
     "items": [
       { "title": "Professional", "description": "Consultorías, estudios…", "image": "/client-assets/demo-professional.webp",
         "url": "https://demo-professional.<dominio>", "tags": ["Contabilidad", "Legal"] }
     ]
   }
   ```
   Solo se muestra si existe; ningún cliente actual cambia.
3. **Cuatro proyectos Vercel de demo** (`demo-professional`, `demo-commerce`, `demo-beauty`, `demo-artist`),
   cada uno con su `CLIENT_ID`.
4. **Contenido ficticio y seguro en los demos:** nombres inventados, imágenes con licencia libre, sin marcas
   reales ni videos ajenos, redes sociales vacías u ocultas, y todos los contactos del demo apuntando al
   **WhatsApp de Web Esencial** con un mensaje del tipo "Hola, vi el demo Commerce y quiero una web así".
   Así, cada demo genera ventas en lugar de enviar mensajes a desconocidos.
5. **Distintivo de demo:** un banner opcional (`demoBanner`) "Sitio de demostración — crea el tuyo con Web
   Esencial" con enlace a la página comercial. Se activa solo en los JSON de demo.
6. **Capturas para la galería:** se generan con el MCP (`take_screenshot` a 375 px y 1280 px) y se
   guardan como recursos de `web-esencial`.

---

## 6. Flujo de despliegues individuales

### Pasos y responsables

| # | Paso | Cómo (herramienta existente o propuesta) | Resultado |
|---|---|---|---|
| 1 | Elegir plantilla | Cliente elige en la galería; el operador confirma rubro | Variante decidida |
| 2 | Crear configuración | Rama `dev-cliente-<id>`; `clients/<id>.json` desde el demo de la variante (editor o a mano) | JSON del cliente |
| 3 | Recursos | `clients/<id>/assets/` (logo, favicon, fotos optimizadas) **[propuesto]** | Imágenes propias |
| 4 | Validar | `npm test` (valida todos los clientes) + `CLIENT_ID=<id> npm run build` | Config correcta |
| 5 | QA | `npm run qa:build -- <id>` + `qa:serve` + MCP (`MCP_VERIFICATION.md`) | Calidad comprobada |
| 6 | Vista previa | PR → despliegue de *preview* del proyecto Vercel del cliente | URL de vista previa |
| 7 | Aprobación | El cliente revisa la URL y aprueba por escrito (WhatsApp/correo) | Aprobación registrada |
| 8 | Publicación | El propietario fusiona el PR → Vercel compila **solo** ese proyecto | Sitio en producción |
| 9 | Dominio | Añadir dominio en el proyecto Vercel + DNS del cliente (CNAME/A) | Dominio propio con HTTPS |
| 10 | Actualizar | Nueva rama → PR → preview → aprobación → merge | Cambio publicado |
| 11 | Retirar | Pausar/eliminar el proyecto Vercel y archivar el JSON (`clients/_archivo/`) | Sitio retirado sin borrar historial |

### Configuración de cada proyecto Vercel (propuesta)
- Mismo repositorio, *Production Branch* = `produccion`, *Framework* = Next.js, *Build Command* = `npm run build`.
- Variable de entorno `CLIENT_ID=<id>` en Production y Preview.
- **Guardia de `CLIENT_ID`:** el build falla si `VERCEL=1` o `CI` y no hay `CLIENT_ID` (elimina el fallback
  silencioso).
- **Recompilación selectiva** (*Ignored Build Step*): un script `tools/deploy/should-build.mjs` que compara
  el commit anterior con el actual y solo devuelve "compilar" si cambió `clients/<id>.json`,
  `clients/<id>/assets/**`, `src/**`, `package*.json`, `next.config.ts` o `tailwind.config.ts`. Así, editar
  el JSON de un cliente no redespliega los demás [mecanismo de Vercel a confirmar al implementar].
- **Sin sobrescrituras entre clientes:** cada proyecto tiene su propia salida en Vercel; nada se escribe en
  una carpeta compartida. Localmente, `qa:build` ya separa cada cliente en `.qa/sites/<id>/`.

### Imágenes por cliente sin mezclar
Hoy todo `public/` se copia a cada sitio. Si se ponen ahí las fotos de todos los clientes, **cada sitio
publicaría las imágenes de los demás**. Propuesta: guardar los recursos en `clients/<id>/assets/` (fuera de
`public/`) y, en un paso `prebuild`, copiar solo los del `CLIENT_ID` activo a `public/client-assets/`
(ignorado por git). El JSON los referencia como `/client-assets/<archivo>`.

### Privacidad y secretos
- Todo el contenido del JSON es **público** (termina en el HTML): no incluir datos que el cliente no quiera
  publicar, ni claves, tokens o credenciales.
- Los datos de recopilación (DNI/RUC, contratos, facturación) **nunca** van al repositorio.
- El repositorio es privado, pero se trata como si su contenido de `clients/` fuera público.
- Variables de entorno de Vercel: solo `CLIENT_ID` (no es secreto). Si en el futuro hay formularios o
  analítica con claves, irían como variables de entorno, nunca en el JSON.

### Plan de Vercel [a confirmar]
Según los términos de Vercel, el plan Hobby está pensado para uso personal y no comercial. Antes de publicar
sitios de clientes de pago hay que confirmar el plan adecuado (p. ej. Pro), los límites de proyectos y
dominios y el coste por proyecto. También hay que confirmar cómo compartir URLs de *preview* con clientes:
la protección de despliegues puede exigir iniciar sesión.

---

## 7. Experiencia del cliente

```
Conoce (redes/WhatsApp/recomendación)
  → Página comercial (qué es, precios, cómo funciona)
  → Galería de plantillas → Demo funcional (botón "Quiero una así")
  → Cotización por WhatsApp
  → Pago/aceptación (fuera del sistema)
  → Formulario de recopilación (textos, servicios, horarios, redes, logo, fotos, colores)
  → Personalización (operador: JSON + recursos)
  → Vista previa (URL de preview) → Ajustes (máx. N rondas)
  → Aprobación escrita
  → Publicación (*.vercel.app) → Dominio propio (opcional)
  → Entrega (acta: URL, qué incluye, cómo pedir cambios)
  → Mantenimiento (cambios por WhatsApp → PR → preview → publicación)
```

| Etapa | MVP comercial | Puede esperar |
|---|---|---|
| Página comercial | `web-esencial` con la variante professional + sección `showcase` | Blog, casos de éxito, multi-idioma |
| Catálogo y demos | 4 demos ficticios, cada uno en su proyecto Vercel | Más variantes; filtro por rubro |
| Cotización | Botón de WhatsApp con mensaje prellenado por plantilla | Calculadora de precios |
| Recopilación | Formulario externo sin código (p. ej. Google Forms o Tally) cuyas preguntas sigan el esquema [decisión del propietario] | Formulario propio; subida de archivos integrada |
| Personalización | Editor sin pérdidas o edición del JSON + `qa:build` | Vista previa visual en el editor |
| Vista previa | URL de preview de Vercel o captura del MCP si la preview requiere login | Enlace de preview público y estable |
| Aprobación | Confirmación escrita por WhatsApp/correo | Firma digital |
| Publicación | Merge del propietario → despliegue automático | Script de alta de proyecto Vercel por API |
| Dominio | Guía paso a paso para el cliente o gestión del DNS por el operador | Compra de dominio integrada |
| Mantenimiento | Cambios por PR; plan mensual opcional | Panel del cliente (fuera de alcance: no CMS) |

---

## 8. Roadmap

Formato: **Problema · Archivos · Dependencias · Aceptación · Pruebas · Riesgos**. Cada tarea es una rama
`dev-…` con su PR y su verificación MCP cuando toca código.

### Fase 1 — Estabilización técnica (P0)

**1.1 Editor sin pérdidas y con escape HTML**
- *Problema:* guardar desde el editor borra `googleMapsUrl`, `accent`, `ogImage`, títulos, `ctaText`, etc. e inyecta `artistProfile` en cualquier variante; los textos con comillas se corrompen.
- *Archivos:* `tools/generator/index.html`.
- *Dependencias:* ninguna.
- *Aceptación:* cargar y guardar sin cambios cada `clients/*.json` produce el mismo JSON (salvo defaults de Zod y orden de claves); los textos con `"`, `<` y `&` se conservan.
- *Pruebas:* test de ida y vuelta en jsdom/happy-dom (nueva devDependency justificada) o con el MCP según `MCP_VERIFICATION.md` §3; diff de los 5 JSON.
- *Riesgos:* medio (UI sin framework). Mitigación: fusionar sobre `currentConfig` en lugar de reconstruir.

**1.2 Cerrar la API del generador**
- *Problema:* cualquier web abierta en el navegador puede leer o sobrescribir clientes.
- *Archivos:* `tools/generator/server.mjs`, `tests/generator-api.test.ts`.
- *Dependencias:* exportar el *handler* para testear el servidor real.
- *Aceptación:* peticiones con `Origin`/`Host` distintos de `localhost:3001`/`127.0.0.1:3001` → 403; sin cabeceras CORS; cuerpo > 1 MB → 413; la UI sigue funcionando.
- *Pruebas:* test del `server.mjs` real; `curl` con `Origin: https://evil.example`.
- *Riesgos:* bajo.

**1.3 `CLIENT_ID` obligatorio en entornos de despliegue**
- *Problema:* un proyecto sin la variable publica el demo profesional.
- *Archivos:* `src/config/client-loader.ts`, `tests/client-config.test.ts`.
- *Dependencias:* ninguna.
- *Aceptación:* con `VERCEL=1` o `CI=1` y sin `CLIENT_ID` el build falla con un mensaje claro; en local se mantiene el fallback con aviso.
- *Pruebas:* tests unitarios de `getActiveClientId`; `CI=1 npm run build` falla.
- *Riesgos:* bajo.

**1.4 Actualizar Next a 15.5.x**
- *Problema:* 9 avisos de seguridad (1 crítico).
- *Archivos:* `package.json`, `package-lock.json`, `eslint-config-next`.
- *Dependencias:* ninguna.
- *Aceptación:* `npm audit` sin críticos ni altos en dependencias de producción; build, tests y lint en verde.
- *Pruebas:* `qa:build` de los 5 clientes + MCP (los 5 siguen en 100 y sin regresiones visuales).
- *Riesgos:* medio (cambios menores de comportamiento entre 15.1 y 15.5). Sin cambio de versión mayor.

**1.5 Exponer en el editor todos los campos del esquema**
- *Problema:* `googleMapsUrl`, `ogImage`, `trustBadges`, los 22 títulos y otros campos solo se editan a mano.
- *Archivos:* `tools/generator/index.html`.
- *Dependencias:* 1.1.
- *Aceptación:* cada campo con consumidor en `src/` tiene un control; los errores de validación se muestran en lenguaje claro y llevan a la pestaña y al campo.
- *Pruebas:* matriz campo ↔ control; ida y vuelta sin pérdidas.
- *Riesgos:* bajo.

### Fase 2 — Experiencia comercial y demos (P0/P1)

> **Estado (rama `dev-fase2-demos-comerciales`):** 2.1, 2.2 y 2.3 implementadas. Pendiente del propietario: número de WhatsApp comercial, URLs publicadas de los demos y precios. LCP en frío ≈ 3,0 s (Slow 4G + CPU ×4) en la página comercial, igual que la línea base de `produccion` (≈ 3,1 s): mejora de rendimiento pendiente, no introducida por esta fase.

**2.1 Demos ficticios y seguros** (P0, requiere decisión de contenido)
- *Problema:* persona real, videos ajenos, marcas reales y teléfonos de terceros.
- *Archivos:* `clients/demo-*.json`, `tests/client-config.test.ts` (fija `businessName`).
- *Dependencias:* nombres, textos e imágenes con licencia elegidos por el propietario.
- *Aceptación:* ningún nombre de persona o empresa real; videos propios, con licencia o eliminados; todos los contactos apuntan a Web Esencial; redes ocultas o propias; eventos con fechas futuras o configurados para ocultarse.
- *Pruebas:* `npm test`; `page-audit` (números con código de país); revisión visual con el MCP.
- *Riesgos:* bajo.

**2.2 Sección `showcase` y banner de demo**
- *Problema:* no hay forma de mostrar un catálogo ni de distinguir un demo de un sitio real.
- *Archivos:* `src/schemas/client.schema.ts`, `src/components/shared/Showcase.tsx` (nuevo), variantes, `tests/`.
- *Dependencias:* 2.1.
- *Aceptación:* campos opcionales `showcase` y `demoBanner`; sin ellos ningún sitio cambia; tarjetas accesibles y responsive.
- *Pruebas:* tests de esquema; MCP en los 5 sitios existentes (sin regresión) + uno con `showcase`.
- *Riesgos:* bajo (campos opcionales).

**2.3 Página comercial `web-esencial`**
- *Problema:* no existe un sitio donde conocer y contratar el servicio.
- *Archivos:* `clients/web-esencial.json`, recursos y capturas de los demos.
- *Dependencias:* 2.2, 3.1 (imágenes), decisión de precios y del número de WhatsApp comercial.
- *Aceptación:* explica el servicio, muestra las 4 plantillas con enlace al demo y tiene CTA de cotización; Lighthouse 100/100/100; LCP ≤ 2,5 s.
- *Pruebas:* `qa:build -- web-esencial` + MCP completo.
- *Riesgos:* bajo.

### Fase 3 — Infraestructura de producción (P0/P1)

**3.1 Recursos por cliente sin mezcla**
- *Problema:* imágenes externas que pueden desaparecer (ya pasó con un 404) y riesgo de publicar recursos de otros clientes si se usa `public/`.
- *Archivos:* `clients/<id>/assets/`, script `prebuild` en `tools/`, `package.json`, `.gitignore`, `CLIENT_CONFIGURATION.md`.
- *Dependencias:* ninguna.
- *Aceptación:* el `out/` de un cliente contiene solo sus recursos; las rutas `/client-assets/...` funcionan en dev y build; guía de tamaños (≤ 200 KB por foto, WebP).
- *Pruebas:* test que compila dos clientes y comprueba que no comparten recursos; MCP (LCP ≤ 2,5 s en Artist con imagen local).
- *Riesgos:* medio (ruta de build nueva).

**3.2 SEO técnico e identidad por cliente**
- *Problema:* sin canonical, `og:url`, `og:image`, `robots.txt`, `sitemap.xml`, JSON-LD ni favicon propio.
- *Archivos:* esquema (`seo.siteUrl`, `favicon` opcionales), `src/app/layout.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`, `public/` (retirar SVG de plantilla).
- *Dependencias:* 3.1.
- *Aceptación:* con `siteUrl` se generan canonical, `og:url`, `robots.txt` y `sitemap.xml`; JSON-LD `LocalBusiness`/`MusicGroup` válido; sin `siteUrl` el build no falla; ningún SVG de plantilla en `out/`.
- *Pruebas:* inspección de `out/`; validador de datos estructurados; Lighthouse SEO 100.
- *Riesgos:* bajo.

**3.3 Recompilación selectiva y guía de alta en Vercel**
- *Problema:* un push a `produccion` recompila todos los proyectos; no hay procedimiento de alta.
- *Archivos:* `tools/deploy/should-build.mjs` (nuevo), `DEPLOYMENT.md`, `docs/`.
- *Dependencias:* 1.3, decisión de plan de Vercel.
- *Aceptación:* un cambio en `clients/a.json` solo despliega el proyecto `a`; un cambio en `src/` despliega todos; guía de alta paso a paso probada con un demo.
- *Pruebas:* tests unitarios del script con listas de archivos; prueba real en un proyecto de demo **solo con autorización del propietario**.
- *Riesgos:* medio (comportamiento de Vercel a confirmar).

**3.4 CI mínima** (P2, recomendable)
- *Problema:* las regresiones solo se detectan si alguien ejecuta los comandos.
- *Archivos:* `.github/workflows/ci.yml`.
- *Aceptación:* cada PR ejecuta tests, type-check, lint y `qa:build`.
- *Riesgos:* bajo; consumo de minutos de GitHub Actions.

### Fase 4 — Flujo de clientes y entrega (P1)

**4.1 Formulario de recopilación alineado con el esquema**
- *Problema:* sin un formulario, cada cliente entrega datos incompletos o desordenados.
- *Archivos:* `docs/CLIENT_INTAKE.md` (preguntas ↔ campos del JSON); formulario externo [decisión del propietario].
- *Aceptación:* cada campo obligatorio del esquema tiene su pregunta; incluye permisos de uso de imágenes.
- *Riesgos:* privacidad de los datos recopilados (fuera del repo).

**4.2 Checklist de entrega y acta**
- *Problema:* no hay criterios uniformes para dar un sitio por terminado.
- *Archivos:* `docs/DELIVERY_CHECKLIST.md`, `DEPLOYMENT.md`.
- *Aceptación:* checklist con pruebas MCP, WhatsApp probado en móvil real, dominio y HTTPS, y plantilla de acta de entrega.

**4.3 Procedimiento de cambios, mantenimiento y baja**
- *Problema:* no está definido cómo se piden cambios ni cómo se retira un sitio.
- *Archivos:* `docs/OPERATIONS.md`, `clients/_archivo/`.
- *Aceptación:* flujo de cambio por PR con preview; baja sin borrar historial; tiempos de respuesta definidos (decisión comercial).

**4.4 Ocultar eventos pasados y avisos legales mínimos**
- *Archivos:* `src/utils/dates.ts`, `ArtistTheme.tsx`; texto legal [a confirmar].
- *Aceptación:* un evento con fecha pasada no se muestra (fecha del build); aviso de privacidad enlazado desde el pie si se usa analítica o formulario.

---

## 9. Decisiones que necesita el propietario

1. **Plan de Vercel** para uso comercial y presupuesto por cliente.
2. **Dominio comercial** de Web Esencial (para la página comercial y los demos).
3. **Contenido de los demos:** nombres ficticios, imágenes con licencia, videos (propios, con licencia o eliminarlos).
4. **Número de WhatsApp comercial** al que apuntan la página comercial y los demos.
5. **Precios o rangos** que se mostrarán (o "cotiza por WhatsApp").
6. **Herramienta del formulario de recopilación** (sin código propio en el MVP).
7. **Protección de la rama `produccion` en GitHub** (requiere plan Pro o repo público).

---

## 10. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Publicar datos o recursos de un cliente en el sitio de otro | Baja (verificado el aislamiento del JSON) / Media al añadir imágenes | Alto | Recursos en `clients/<id>/assets` + copia selectiva (3.1); test de aislamiento |
| Proyecto Vercel sin `CLIENT_ID` | Media | Alto | Guardia 1.3 |
| Un cambio compartido rompe todos los sitios | Media | Alto | Tests + `qa:build` de todos + MCP obligatorio + recompilación selectiva |
| Editor corrompe un cliente real | Alta hoy | Alto | 1.1 antes de usar el editor con clientes reales |
| Uso comercial no permitido por el plan de hosting | [a confirmar] | Alto | Decisión 9.1 antes de publicar |
| Contenido de terceros en demos | Alta hoy | Alto (legal/reputación) | 2.1 |
| Imágenes externas que desaparecen | Media | Medio | 3.1 |
| Push o merge accidental a `produccion` | Baja (hook local) | Alto | Protección de rama en GitHub (decisión 9.7) |
| Dependencia de una sola persona para operar | Alta | Medio | Documentación de operaciones (4.3) y Skills del proyecto |

---

## 11. Criterios de lanzamiento

Web Esencial puede **mostrarse públicamente y vender** cuando se cumpla todo esto:

- [ ] Fase 1 completa: editor sin pérdidas, API del generador cerrada, `CLIENT_ID` obligatorio en despliegue, `npm audit` sin críticos ni altos en producción.
- [ ] Demos sin contenido de terceros, con contactos de Web Esencial y banner de demo.
- [ ] Página comercial publicada con galería y CTA de cotización.
- [ ] Recursos por cliente sin mezcla, favicon y `og:image` propios, SEO técnico (canonical, sitemap, robots, JSON-LD).
- [ ] Lighthouse móvil ≥ 95 en Accesibilidad, Buenas prácticas y SEO, y LCP ≤ 2,5 s (Slow 4G + CPU ×4) en la página comercial y los 4 demos, verificado con el MCP.
- [ ] Plan de Vercel comercial confirmado y guía de alta probada con un demo.
- [ ] Formulario de recopilación, checklist de entrega y procedimiento de cambios documentados.
- [ ] Un **cliente piloto** completó el recorrido de punta a punta (de la cotización al sitio publicado con dominio).

Para **entregar sitios a clientes reales** además:
- [ ] WhatsApp, teléfono, correo y mapa probados en un móvil real.
- [ ] Contenido e imágenes del cliente con permiso de uso.
- [ ] Aprobación escrita del cliente antes de publicar.
