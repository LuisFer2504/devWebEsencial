import type { DemoBanner as DemoBannerConfig } from "@/types/client";
import { Info } from "lucide-react";

interface DemoBannerProps {
  banner?: DemoBannerConfig;
}

/**
 * Aviso que identifica un sitio de demostración. Solo se muestra si el JSON define `demoBanner`.
 * El enlace a la página comercial es opcional (sin `url`, se muestra solo el texto).
 */
export function DemoBanner({ banner }: DemoBannerProps) {
  if (!banner) return null;
  return (
    <aside aria-label="Aviso de demostración" className="relative z-50 bg-slate-900 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-x-3 gap-y-1 px-4 py-2.5 text-center text-sm sm:flex-row sm:px-6 lg:px-8">
        <p className="flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
          <span>{banner.message}</span>
        </p>
        {banner.url && (
          <a
            href={banner.url}
            className="inline-flex min-h-6 items-center font-semibold text-amber-300 underline underline-offset-2 hover:text-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 rounded"
          >
            {banner.linkText || "Conoce Web Esencial"}
          </a>
        )}
      </div>
    </aside>
  );
}
