/**
 * Código de país que se asume cuando el número se escribió en formato local (sin "+").
 * Web Esencial está orientado a Perú: "987 654 321" → 51987654321.
 */
export const DEFAULT_WHATSAPP_COUNTRY_CODE = "51";

/** Longitud máxima de un número nacional (sin código de país). En Perú, los móviles tienen 9 dígitos. */
const MAX_LOCAL_DIGITS = 9;

/**
 * Normaliza un número para wa.me (solo dígitos, con código de país).
 *
 * - "+51 987 654 321" → "51987654321"
 * - "0051 987654321"  → "51987654321"
 * - "987 654 321"     → "51987654321" (número local: se antepone el código por defecto)
 * - "51987654321"     → "51987654321" (ya incluye código de país)
 *
 * Sin esta normalización, wa.me/987654321 se interpreta como prefijo internacional 98 (Irán)
 * y el negocio no recibe los mensajes.
 */
export function normalizeWhatsAppNumber(
  phoneNumber?: string,
  defaultCountryCode: string = DEFAULT_WHATSAPP_COUNTRY_CODE
): string | null {
  if (!phoneNumber) return null;
  const trimmed = phoneNumber.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (trimmed.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2) || null;
  if (digits.length <= MAX_LOCAL_DIGITS) return `${defaultCountryCode}${digits.replace(/^0+/, "")}`;
  return digits;
}

interface MessageContext {
  contact: { whatsapp?: string; whatsappDefaultMessage?: string };
  demoBanner?: { templateName: string };
}

/**
 * Mensaje de WhatsApp para un elemento concreto (servicio, producto, paquete…).
 * En un sitio de demostración (demoBanner) el mensaje no va dirigido al negocio ficticio: identifica
 * la plantilla que el visitante está viendo, para que llegue al WhatsApp comercial de Web Esencial.
 */
export function itemWhatsAppMessage(config: MessageContext, normalMessage: string, itemTitle?: string): string {
  if (!config.demoBanner) return normalMessage;
  const base =
    config.contact.whatsappDefaultMessage ||
    `Hola Web Esencial, estoy viendo la demo de la plantilla ${config.demoBanner.templateName} y quiero una página como esta.`;
  return itemTitle ? `${base} (En la demo vi: "${itemTitle}")` : base;
}

/** Valor especial de enlace en el JSON: "whatsapp" → chat con el mensaje por defecto (si hay número). */
export const WHATSAPP_LINK_KEYWORD = "whatsapp";

/**
 * Resuelve el destino de un CTA configurado en el JSON. Con el valor especial "whatsapp" devuelve el
 * enlace de chat, o null si todavía no hay número configurado (el botón no debe mostrarse).
 */
export function resolveCtaHref(link: string, config: MessageContext): string | null {
  if (link.trim().toLowerCase() !== WHATSAPP_LINK_KEYWORD) return link;
  return buildWhatsAppLink(config.contact.whatsapp, config.contact.whatsappDefaultMessage);
}

/**
 * Genera un enlace directo a la API de WhatsApp web / app con mensaje codificado.
 */
export function buildWhatsAppLink(phoneNumber?: string, message?: string): string | null {
  const number = normalizeWhatsAppNumber(phoneNumber);
  if (!number) return null;

  const encodedMessage = message ? encodeURIComponent(message) : "";
  return `https://wa.me/${number}${encodedMessage ? `?text=${encodedMessage}` : ""}`;
}
