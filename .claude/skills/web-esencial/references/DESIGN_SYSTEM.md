# Design System — variantes y convenciones visuales

> No existe un design system formal (sin tokens en `tailwind.config.ts`, sin componentes base de UI).
> Lo que sigue describe las convenciones **observadas** en el código y la deuda visual detectada.

## Fundamentos actuales

- **Tailwind CSS 3.4.x** (`tailwind.config.ts` solo añade `background`/`foreground` sin uso real).
  `content` cubre `src/app`, `src/components`, `src/pages`.
- Tipografía: pila de sistema (`globals.css`); sin fuentes web.
- Contenedor: `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` (algunas secciones `max-w-5xl/6xl`).
- Secciones: `py-20`/`py-24`, `scroll-mt-20` para compensar la Navbar sticky (`h-20`).
- Encabezado de sección: subtítulo `text-xs uppercase tracking-wider` + `h2 text-3xl sm:text-4xl` +
  descripción opcional.
- Tarjetas: `rounded-2xl border bg-white p-6/8 shadow-sm`.
- Breakpoints: móvil primero; `sm`, `md`, `lg`.
- Iconos: `lucide-react`.
- Color de marca: solo `colors.primary`, aplicado con `style={{ backgroundColor }}` en el CTA principal
  (y en el CTA de Navbar solo para artist).

## Variantes

| Variante | Paleta fija | Hero | Secciones (orden) | Rasgos |
|---|---|---|---|---|
| `professional` | slate + azul (`blue-700`) | Izq. texto, der. `heroImage` o panel de highlights (≥ 2) | Nosotros → Servicios (2 col) → Ventajas (4 col) → Contacto | Iconos de ventajas rotan de una lista fija |
| `commerce` | stone + naranja (`orange-600`) | Centrado + **cinta fija de 4 "facilidades"** | Servicios/catálogo (4 col) → Nosotros + tarjeta WhatsApp → Ventajas numeradas → Contacto | Barra fija móvil Llamar/WhatsApp |
| `beauty` | rosa/pink, tipografía `font-light` | Centrado, highlights (máx. 3) bajo los CTA | Carta de servicios (lista con duración y precio) → Nosotros → Ventajas → Contacto | CTA "Reservar Cita" por servicio |
| `artist` | zinc-950 oscuro + ámbar | Pantalla casi completa, `heroImage` de fondo, H1 = `stageName` | Biografía (+ retrato, hitos) → Videos → Galería → Fechas → Paquetes → Contacto | Embeds YouTube/Vimeo |

Comunes a todas: `Navbar` (blanca), `ContactSection` (slate-900 con acentos emerald/indigo/amber),
`Footer` (blanco), `WhatsAppFloatingButton` (emerald, abajo a la derecha).

## Deuda visual detectada (verificada)

1. **Clases Tailwind v4 que no existen en 3.4** (0 coincidencias en el CSS compilado):
   `shadow-2xs` (Professional, Beauty), `shadow-xs` (Commerce, Beauty), `blur-xs`, `backdrop-blur-xs`,
   `aspect-4/5`, `aspect-4/3`, `bg-radial-at-c` (Artist), `flex-2` (Commerce). Efecto: sombras ausentes,
   retrato y galería del artista sin proporción fija, desenfoque del hero ausente.
2. **Colores de marca casi sin efecto**: los acentos están fijos por variante (azul, naranja, rosa,
   ámbar). Dos clientes de la misma variante solo se diferencian por el color del botón principal.
3. **Artist**: Navbar y Footer blancos sobre una página oscura.
4. **Commerce**: textos fijos "Envíos Rápidos / Facilidades de Pago / Garantía Directa / Atención
   Directa" para todos los clientes (contradice "sin textos fijos" del README).
5. **Commerce móvil**: barra fija inferior + botón flotante de WhatsApp (`bottom-6`) se solapan; la
   página no tiene padding inferior para la barra.
6. **Galería**: el `caption` solo aparece en hover (invisible en táctil).
7. **Footer**: enlaces a `#servicios`, `#musica`, etc. aunque la sección esté oculta.
8. CTA principal de commerce/beauty/artist ignora `hero.ctaPrimary.link` si hay WhatsApp (decisión de
   producto implícita; documentarla en el editor).
9. Contraste no auditado (p. ej. `text-zinc-500` sobre `zinc-900`, `text-amber-400/90`): pendiente.

## Reglas para nuevas variantes y cambios visuales

1. Solo clases que existan en Tailwind 3.4 (o valores arbitrarios `aspect-[4/5]`). Verifica en el CSS
   de `out/_next/static/css/` si dudas.
2. Ningún texto visible fijo que afirme algo sobre el negocio (envíos, garantía, años…). Todo lo
   afirmativo viene del JSON; los textos por defecto deben ser genéricos y sobreescribibles vía
   `sectionTitles`.
3. Reutiliza `Navbar`, `ContactSection`, `Footer`, `WhatsAppFloatingButton`; si una variante necesita
   otro aspecto, añade props o una prop de "tono" (`light`/`dark`) en vez de otra rama `variant === …`.
4. Respeta ids de anclas y `scroll-mt-20`.
5. Usa `colors.primary` para el CTA principal como mínimo. Objetivo (ROADMAP P1): exponer
   `--brand-*` como colores de Tailwind (`brand-primary`, etc.) y usarlos en acentos.
6. Imágenes: siempre `alt` significativo, `loading="lazy"` fuera del hero, contenedor con proporción
   fija para evitar CLS.
7. Prueba a 375 px, 768 px y 1280 px; con y sin imágenes; con listas vacías; con textos largos.
8. Variante nueva = demo JSON + test de carga + radio en el generador (ver SKILL.md §4).
