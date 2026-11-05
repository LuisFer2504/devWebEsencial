import type { ContactInfo } from "@/types/client";
import { buildWhatsAppLink } from "@/utils/whatsapp";
import { MessageCircle } from "lucide-react";

interface WhatsAppFloatingButtonProps {
  contact: ContactInfo;
  /**
   * Oculta el botón en pantallas pequeñas. Úsalo cuando la variante ya muestra una barra fija de
   * contacto en móvil (evita que el botón flotante tape los botones de esa barra).
   */
  hideOnMobile?: boolean;
}

export function WhatsAppFloatingButton({ contact, hideOnMobile = false }: WhatsAppFloatingButtonProps) {
  const waLink = buildWhatsAppLink(contact.whatsapp, contact.whatsappDefaultMessage);

  if (!waLink) {
    return null;
  }

  return (
    <aside
      aria-label="Contacto rápido por WhatsApp"
      className={`fixed bottom-6 right-6 z-50 ${hideOnMobile ? "hidden sm:block" : ""}`}
    >
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir chat de WhatsApp con el negocio"
        className="group relative flex items-center justify-center h-14 w-14 rounded-full bg-emerald-500 text-white shadow-lg transition-transform duration-200 hover:scale-110 hover:bg-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-300 active:scale-95"
      >
        <span className="sr-only">Contactar por WhatsApp</span>
        <MessageCircle className="h-7 w-7" aria-hidden="true" />

        {/* Tooltip accesible visual */}
        <span className="pointer-events-none absolute right-16 hidden rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-md transition-opacity group-hover:block whitespace-nowrap">
          ¿En qué podemos ayudarte?
        </span>
      </a>
    </aside>
  );
}
