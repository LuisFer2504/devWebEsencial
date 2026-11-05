import { z } from "zod";

export const ClientVariantSchema = z.enum(["professional", "commerce", "beauty", "artist"]);
export type ClientVariant = z.infer<typeof ClientVariantSchema>;

export const ServiceItemSchema = z.object({
  id: z.string().min(1, "El ID del servicio es requerido"),
  title: z.string().min(2, "El título del servicio debe tener al menos 2 caracteres"),
  description: z.string().min(5, "La descripción del servicio debe tener al menos 5 caracteres"),
  price: z.string().optional(),
  duration: z.string().optional(),
  badge: z.string().optional(),
  icon: z.string().optional(),
});
export type ServiceItem = z.infer<typeof ServiceItemSchema>;

export const AdvantageItemSchema = z.object({
  title: z.string().min(2, "El título de la ventaja es requerido"),
  description: z.string().min(5, "La descripción de la ventaja es requerida"),
  icon: z.string().optional(),
});
export type AdvantageItem = z.infer<typeof AdvantageItemSchema>;

// Cinta de beneficios breves (p. ej. envíos, medios de pago). Solo se muestra si el cliente la define.
export const TrustBadgeIconSchema = z.enum(["truck", "card", "shield", "clock", "tag", "star", "phone", "map"]);
export type TrustBadgeIcon = z.infer<typeof TrustBadgeIconSchema>;

export const TrustBadgeSchema = z.object({
  title: z.string().min(2, "El título del beneficio es requerido"),
  description: z.string().optional(),
  icon: TrustBadgeIconSchema.optional(),
});
export type TrustBadge = z.infer<typeof TrustBadgeSchema>;

// Esquemas específicos para variante Artist
export const GalleryItemSchema = z.object({
  id: z.string().min(1, "ID de imagen requerido"),
  url: z.string().min(3, "URL de imagen requerida"),
  alt: z.string().min(2, "Texto alternativo requerido"),
  caption: z.string().optional(),
  isFeatured: z.boolean().optional(),
});
export type GalleryItem = z.infer<typeof GalleryItemSchema>;

export const VideoItemSchema = z.object({
  id: z.string().min(1, "ID de video requerido"),
  title: z.string().min(2, "Título de video requerido"),
  url: z.string().min(5, "URL de video requerida"),
  description: z.string().optional(),
  platform: z.enum(["youtube", "vimeo", "spotify", "other"]).default("youtube"),
});
export type VideoItem = z.infer<typeof VideoItemSchema>;

export const EventItemSchema = z.object({
  id: z.string().min(1, "ID de presentación requerido"),
  title: z.string().min(2, "Nombre de la presentación o evento requerido"),
  date: z.string().min(3, "Fecha requerida"),
  time: z.string().optional(),
  venue: z.string().min(2, "Lugar o recinto requerido"),
  city: z.string().min(2, "Ciudad requerida"),
  description: z.string().optional(),
  ticketUrl: z.string().optional(),
  visible: z.boolean().default(true),
});
export type EventItem = z.infer<typeof EventItemSchema>;

export const PackageItemSchema = z.object({
  id: z.string().min(1, "ID del paquete requerido"),
  title: z.string().min(2, "Nombre del paquete requerido"),
  description: z.string().min(5, "Descripción del paquete requerida"),
  price: z.string().optional(),
  currency: z.string().optional(),
  duration: z.string().optional(),
  features: z.array(z.string()).optional(),
  ctaText: z.string().optional(),
  ctaLink: z.string().optional(),
  visible: z.boolean().default(true),
});
export type PackageItem = z.infer<typeof PackageItemSchema>;

export const ArtistProfileSchema = z.object({
  stageName: z.string().optional(),
  genre: z.string().optional(),
  bookingZone: z.string().optional(),
  bio: z.string().optional(),
  bioShort: z.string().optional(),
  portraitImage: z.string().optional(),
  quote: z.string().optional(),
  achievements: z.array(z.string()).optional(),
});
export type ArtistProfile = z.infer<typeof ArtistProfileSchema>;

// Títulos y subtítulos configurables por sección
export const SectionTitlesSchema = z.object({
  aboutSubtitle: z.string().optional(),
  aboutTitle: z.string().optional(),
  servicesSubtitle: z.string().optional(),
  servicesTitle: z.string().optional(),
  servicesDescription: z.string().optional(),
  advantagesSubtitle: z.string().optional(),
  advantagesTitle: z.string().optional(),
  advantagesDescription: z.string().optional(),
  contactSubtitle: z.string().optional(),
  contactTitle: z.string().optional(),
  contactDescription: z.string().optional(),
  gallerySubtitle: z.string().optional(),
  galleryTitle: z.string().optional(),
  galleryDescription: z.string().optional(),
  videosSubtitle: z.string().optional(),
  videosTitle: z.string().optional(),
  videosDescription: z.string().optional(),
  eventsSubtitle: z.string().optional(),
  eventsTitle: z.string().optional(),
  eventsDescription: z.string().optional(),
  packagesSubtitle: z.string().optional(),
  packagesTitle: z.string().optional(),
  packagesDescription: z.string().optional(),
});
export type SectionTitles = z.infer<typeof SectionTitlesSchema>;

// Control explícito de visibilidad de secciones
export const SectionVisibilitySchema = z.object({
  about: z.boolean().default(true),
  services: z.boolean().default(true),
  advantages: z.boolean().default(true),
  contact: z.boolean().default(true),
  schedule: z.boolean().default(true),
  gallery: z.boolean().default(true),
  videos: z.boolean().default(true),
  events: z.boolean().default(true),
  packages: z.boolean().default(true),
});
export type SectionVisibility = z.infer<typeof SectionVisibilitySchema>;

export const ContactInfoSchema = z.object({
  whatsapp: z
    .string()
    .regex(/^\+?[0-9\s-]{8,18}$/, "Número de WhatsApp inválido")
    .optional(),
  whatsappDefaultMessage: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Correo electrónico inválido").optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  googleMapsUrl: z.string().url("URL de mapa inválida").optional(),
  schedule: z.array(z.string()).optional(),
  socialLinks: z
    .object({
      facebook: z.string().url("URL de Facebook inválida").optional(),
      instagram: z.string().url("URL de Instagram inválida").optional(),
      tiktok: z.string().url("URL de TikTok inválida").optional(),
      linkedin: z.string().url("URL de LinkedIn inválida").optional(),
      spotify: z.string().url("URL de Spotify inválida").optional(),
      youtube: z.string().url("URL de YouTube inválida").optional(),
      appleMusic: z.string().url("URL de Apple Music inválida").optional(),
      soundcloud: z.string().url("URL de SoundCloud inválida").optional(),
    })
    .optional(),
});
export type ContactInfo = z.infer<typeof ContactInfoSchema>;

export const SeoConfigSchema = z.object({
  title: z.string().min(5, "El título SEO debe tener al menos 5 caracteres"),
  description: z.string().min(15, "La descripción SEO debe tener al menos 15 caracteres"),
  keywords: z.array(z.string()).optional(),
  ogImage: z.string().optional(),
});
export type SeoConfig = z.infer<typeof SeoConfigSchema>;

export const ColorPaletteSchema = z.object({
  primary: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color primario hex inválido"),
  primaryHover: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color primario hover inválido").optional(),
  accent: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color de acento hex inválido").optional(),
  neutralBg: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color de fondo neutro hex inválido").optional(),
});
export type ColorPalette = z.infer<typeof ColorPaletteSchema>;

export const ClientConfigSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "El ID debe ser slug en minúsculas con guiones (ej: estudio-alva)"),
  businessName: z.string().min(2, "El nombre comercial es obligatorio"),
  tagline: z.string().min(3, "El lema o subtítulo es obligatorio"),
  variant: ClientVariantSchema,
  colors: ColorPaletteSchema,
  logoUrl: z.string().optional(),
  hero: z.object({
    badge: z.string().optional(),
    title: z.string().min(5, "El título del Hero es obligatorio"),
    description: z.string().min(10, "La descripción del Hero es obligatoria"),
    ctaPrimary: z.object({
      text: z.string().min(2, "Texto del botón principal requerido"),
      link: z.string().min(1, "Enlace del botón principal requerido"),
    }),
    ctaSecondary: z
      .object({
        text: z.string().min(2),
        link: z.string().min(1),
      })
      .optional(),
    heroImage: z.string().optional(),
  }),
  about: z.object({
    title: z.string().min(2, "Título de la sección sobre nosotros requerido"),
    description: z.string().min(10, "Descripción sobre el negocio requerida"),
    highlights: z.array(z.string()).optional(),
    aboutImage: z.string().optional(),
  }),
  // Listas con compatibilidad amplia: pueden ser vacías si el rubro usa otras secciones (como artist)
  services: z.array(ServiceItemSchema).default([]),
  advantages: z.array(AdvantageItemSchema).default([]),
  trustBadges: z.array(TrustBadgeSchema).optional(),
  // Secciones específicas de Artistas (opcionales)
  artistProfile: ArtistProfileSchema.optional(),
  gallery: z.array(GalleryItemSchema).optional(),
  videos: z.array(VideoItemSchema).optional(),
  events: z.array(EventItemSchema).optional(),
  packages: z.array(PackageItemSchema).optional(),
  // Personalización de títulos y visibilidad
  sectionTitles: SectionTitlesSchema.optional(),
  sectionVisibility: SectionVisibilitySchema.optional(),
  contact: ContactInfoSchema,
  seo: SeoConfigSchema,
});

export type ClientConfig = z.infer<typeof ClientConfigSchema>;
