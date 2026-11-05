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

/**
 * Genera un enlace directo a la API de WhatsApp web / app con mensaje codificado.
 */
export function buildWhatsAppLink(phoneNumber?: string, message?: string): string | null {
  const number = normalizeWhatsAppNumber(phoneNumber);
  if (!number) return null;

  const encodedMessage = message ? encodeURIComponent(message) : "";
  return `https://wa.me/${number}${encodedMessage ? `?text=${encodedMessage}` : ""}`;
}
