import type { ClientConfig } from "@/types/client";

export interface NavLink {
  name: string;
  href: string;
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
    if (vis?.events !== false && (config.events?.filter((e) => e.visible !== false).length ?? 0) > 0) {
      links.push({ name: "Presentaciones", href: "#fechas" });
    }
    if (vis?.packages !== false && (config.packages?.filter((p) => p.visible !== false).length ?? 0) > 0) {
      links.push({ name: "Contratación", href: "#paquetes" });
    }
  } else {
    if (vis?.about !== false) links.push({ name: "Nosotros", href: "#nosotros" });
    if (vis?.services !== false && config.services.length > 0) links.push({ name: "Servicios", href: "#servicios" });
    if (vis?.advantages !== false && config.advantages.length > 0) links.push({ name: "Ventajas", href: "#ventajas" });
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
