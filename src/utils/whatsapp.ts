/**
 * Genera un enlace directo a la API de WhatsApp web / app con mensaje codificado.
 */
export function buildWhatsAppLink(phoneNumber?: string, message?: string): string | null {
  if (!phoneNumber) return null;

  // Eliminar espacios, guiones y caracteres no numéricos excepto el prefijo +
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, "");
  if (!cleanNumber) return null;

  const encodedMessage = message ? encodeURIComponent(message) : "";
  return `https://wa.me/${cleanNumber}${encodedMessage ? `?text=${encodedMessage}` : ""}`;
}
