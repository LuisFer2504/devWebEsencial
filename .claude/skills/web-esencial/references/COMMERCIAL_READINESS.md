# Commercial Readiness — evaluación (2026-11-02)

Escala: ✅ implementado y verificado · 🟡 parcial · ❌ no existe. "Verificado" significa comprobado con
comandos o lectura de código; la calidad visual **no** se evaluó en navegador en esta auditoría (sin
capturas ni Lighthouse), solo por código y CSS compilado.

| Área | Estado | Evidencia / comentario |
|---|---|---|
| Calidad visual | 🟡 | 4 variantes con composición propia y cuidada en código. Clases Tailwind v4 inexistentes rompen sombras, proporciones y blur; Navbar/Footer blancos en artist; acentos fijos por variante |
| Adaptabilidad móvil | 🟡 | Layouts responsive, menú móvil, barra de conversión en commerce. Solape barra móvil ↔ botón flotante en commerce; captions solo en hover; no probado en dispositivos |
| Experiencia de usuario | 🟡 | CTAs claros a WhatsApp, anclas con `scroll-mt`. Footer enlaza secciones ocultas; eventos muestran "FECHA" en lugar del mes |
| Personalización | 🟡 | Textos, listas, visibilidad, color primario. Acentos/hover/fondo no aplican; textos fijos en Commerce; editor solo expone 4 de 22 títulos |
| Generación de páginas | 🟡 | Build estático por cliente fiable y validado. Editor pierde datos al re-guardar; sin preview visual |
| Gestión de imágenes | ❌ | Solo URLs externas; sin carpeta de assets por cliente, sin optimización, sin dimensiones (riesgo CLS) |
| Formularios y contacto | 🟡 | WhatsApp, `tel:`, `mailto:`, link a Maps. Sin formulario, sin mapa embebido, sin validación de código de país |
| SEO | 🟡 | title, description, keywords, OG básico, `lang="es"`, H1 único por página. Sin canonical, `metadataBase`, `og:url`, sitemap, robots, JSON-LD (LocalBusiness), favicon propio |
| Rendimiento | 🟡 | HTML estático, 109 kB JS de primera carga, iframes `lazy`. Imágenes externas sin optimizar; no medido con Lighthouse |
| Accesibilidad | 🟡 | `aria-label`, `aria-expanded`, `aria-hidden` en iconos, `alt` en imágenes, foco visible en varios enlaces. Contraste no auditado; algunos botones sin estilos de foco; info solo en hover |
| Seguridad | 🟡 | Sitio estático sin backend, sin secretos, `rel="noopener"`, embeds nocookie, saneo de ids. **Generador con CORS `*`**; links de config sin lista blanca de protocolos; `innerHTML` sin escape en el editor |
| Despliegue | 🟡 | Export estático compatible con cualquier hosting; proceso Vercel documentado. Sin CI, sin guard de `CLIENT_ID`, sin build multi-cliente |
| Mantenimiento | 🟡 | Código tipado, lint limpio, esquema central. **Sin commits** del trabajo real; tests del generador no prueban el servidor real; duplicación entre variantes |
| Escalabilidad | 🟡 | Añadir cliente = 1 JSON. Un push redespliega todos; sin versionado de esquema; 1 proyecto Vercel por cliente es manual |
| Entrega al cliente | ❌ | Sin checklist ejecutable, sin acta, sin flujo de cambios, sin dominio/analítica, demos con contenido de terceros |

## Qué necesita una web para entregarse profesionalmente

Mínimo exigible antes de cobrar:
1. Contenido 100 % del cliente (textos, logo, fotos con derechos) — sin placeholders ni Unsplash genérico.
2. Identidad visual reconocible: logo, favicon, colores de marca aplicados más allá de un botón.
3. Contacto funcional y probado (WhatsApp con código de país, teléfono, email, mapa).
4. Perfecta en móvil (sin solapes ni elementos rotos), revisada en dispositivo real.
5. SEO básico completo: title/description propios, canonical, OG con imagen absoluta, sitemap/robots,
   datos estructurados de negocio local.
6. Rendimiento y accesibilidad medidos (Lighthouse móvil ≥ 90 como objetivo propuesto).
7. Dominio propio con HTTPS.
8. Proceso reproducible: JSON versionado en git, build verificado, despliegue sin riesgo de publicar el
   demo equivocado.
9. Capacidad de hacer cambios sin perder datos (editor sin pérdidas o edición manual del JSON).
10. Opcional pero esperado por muchos clientes: analítica y aviso de privacidad.

Prioridades concretas: ver `ROADMAP.md`.
