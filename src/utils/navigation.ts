import type { ClientConfig } from "@/types/client";
import { isUpcomingEvent } from "@/utils/dates";

export interface NavLink {
  name: string;
  href: string;
}

/** Ids de las secciones opcionales compartidas (también usados por los componentes). */
export const SHOWCASE_SECTION_ID = "plantillas";
export const FAQ_SECTION_ID = "preguntas";

/** Variantes que hoy renderizan las secciones opcionales showcase y faq. */
const VARIANTS_WITH_EXTRA_SECTIONS = new Set(["professional"]);

export function showsShowcase(config: ClientConfig): boolean {
  return VARIANTS_WITH_EXTRA_SECTIONS.has(config.variant) && (config.showcase?.items.length ?? 0) > 0;
}

export function showsFaq(config: ClientConfig): boolean {
  return VARIANTS_WITH_EXTRA_SECTIONS.has(config.variant) && (config.faq?.items.length ?? 0) > 0;
}

/** Eventos visibles: no ocultos y no pasados (fecha del build). */
export function visibleEvents(config: ClientConfig, now: Date = new Date()) {
  return (config.events ?? []).filter((e) => e.visible !== false && isUpcomingEvent(e.date, now));
}

/**
 * Enlaces de navegación según la variante y las secciones realmente visibles.
 * Compartido por Navbar y Footer para que nunca apunten a secciones ocultas o inexistentes.
 */
export function getNavLinks(config: ClientConfig): NavLink[] {
  const vis = config.sectionVisibility;
  const links: NavLink[] = [{ name: "Inicio", href: "#inicio" }];

  if (config.variant === "artist") {
    if (vis?.about !== false) links.push({ name: "Biografía", href: "#biografia" });
    if (vis?.videos !== false && (config.videos?.length ?? 0) > 0) links.push({ name: "Música & Videos", href: "#musica" });
    if (vis?.gallery !== false && (config.gallery?.length ?? 0) > 0) links.push({ name: "Galería", href: "#galeria" });
    if (vis?.events !== false && visibleEvents(config).length > 0) {
      links.push({ name: "Presentaciones", href: "#fechas" });
    }
    if (vis?.packages !== false && (config.packages?.filter((p) => p.visible !== false).length ?? 0) > 0) {
      links.push({ name: "Contratación", href: "#paquetes" });
    }
  } else {
    if (vis?.about !== false) links.push({ name: "Nosotros", href: "#nosotros" });
    if (showsShowcase(config)) links.push({ name: config.showcase?.navLabel || "Catálogo", href: `#${SHOWCASE_SECTION_ID}` });
    if (vis?.services !== false && config.services.length > 0) links.push({ name: "Servicios", href: "#servicios" });
    if (vis?.advantages !== false && config.advantages.length > 0) links.push({ name: "Ventajas", href: "#ventajas" });
    if (showsFaq(config)) links.push({ name: config.faq?.navLabel || "Preguntas", href: `#${FAQ_SECTION_ID}` });
  }

  if (vis?.contact !== false && hasContactContent(config)) links.push({ name: "Contacto", href: "#contacto" });
  return links;
}

/** Misma condición con la que ContactSection decide si se muestra. */
export function hasContactContent(config: ClientConfig): boolean {
  const c = config.contact;
  const s = c.socialLinks;
  const showSchedule = config.sectionVisibility?.schedule !== false && (c.schedule?.length ?? 0) > 0;
  const hasSocial = Boolean(s && Object.values(s).some(Boolean));
  return Boolean(c.whatsapp || c.phone || c.email || c.address || c.city || c.googleMapsUrl || showSchedule || hasSocial);
}

/**
 * Destino de los botones "Consultar / Reservar" cuando no hay WhatsApp: la sección de contacto,
 * pero solo si en ella hay un canal directo (teléfono o correo). Si no, null → el botón no se muestra
 * (nunca se enlaza a una sección vacía o inexistente).
 */
export function contactFallbackHref(config: ClientConfig): string | null {
  const c = config.contact;
  if (config.sectionVisibility?.contact === false) return null;
  return c.phone || c.email ? "#contacto" : null;
}
