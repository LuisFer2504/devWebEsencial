# Business Model — Web Esencial

> El código casi no contiene información comercial. Este documento separa lo que **tiene evidencia en
> el repositorio** de lo que es **propuesta** (no implementado, a validar con el dueño del producto).

## Con evidencia en el repositorio

| Aspecto | Evidencia |
|---|---|
| Público objetivo | README: "pequeños negocios, consultorías y artistas musicales en Perú y el mundo". Demos: estudio contable, ferretería, spa, músico, consultora de software |
| Propuesta de valor | Sitios estáticos "de alta conversión", rápidos y seguros, reutilizando variantes |
| Canal de conversión principal | WhatsApp: CTA en Navbar, hero (commerce/beauty/artist), cada servicio/producto/paquete, botón flotante, barra móvil (commerce) |
| Mercado local | Ejemplos con Yape/Plin, soles (`S/`), distritos de Lima, números `+51`; `lang="es"` fijo |
| Modelo de entrega | Un JSON por cliente + un proyecto Vercel por cliente (README §6) |
| Herramienta interna | Editor local para que el operador (no el cliente final) configure el sitio |
| Cliente propio posible | `clients/consultoria-proyectos.json` parece ser el sitio del propio negocio (no confirmado) |

## No existe en el código

Planes, precios, contratos, facturación, dominios, hosting gestionado, panel de cliente, flujo de
solicitud de cambios, SLA, mantenimiento recurrente, métricas de conversión.

## Propuesta (a validar — NO implementado)

Estas ideas encajan con la arquitectura actual; ninguna existe hoy:

1. **Paquetes por variante**: "Esencial" (landing de una variante, contenido del cliente, dominio
   propio), "Pro" (+ imágenes optimizadas, SEO local con JSON-LD, analítica), "Mantenimiento mensual"
   (cambios de contenido vía JSON).
2. **Costo marginal bajo**: un cliente nuevo = un JSON + imágenes + un proyecto de hosting estático.
   Valida el modelo de "entrega eficiente" siempre que el editor no pierda datos y existan imágenes
   gestionadas por cliente.
3. **Portafolio de demos** con contenido 100 % ficticio y propio (ver ROADMAP P0).
4. **Proceso de entrega estándar**: formulario de recolección de datos ⇄ campos del esquema, checklist
   de DEPLOYMENT.md, acta de entrega.
5. **Nuevas verticales** (restaurantes, salud, educación) como variantes adicionales cuando haya
   demanda; cada variante debe justificarse por necesidades de layout distintas, no solo de color.

## Implicaciones para el desarrollo

- Cada hora invertida en el **editor sin pérdidas** y en **plantillas configurables sin textos fijos**
  reduce el costo por cliente.
- La calidad percibida depende sobre todo de: imágenes reales del cliente, colores de marca aplicados
  de verdad (hoy solo el botón principal), y un sitio sin elementos de plantilla genéricos (favicon de
  Next, textos fijos de Commerce).
- WhatsApp es crítico: un número mal escrito anula la conversión. Debe probarse en cada entrega.
