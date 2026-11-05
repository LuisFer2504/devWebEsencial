import type { Faq as FaqConfig } from "@/types/client";
import { FAQ_SECTION_ID } from "@/utils/navigation";
import { ChevronDown } from "lucide-react";

interface FaqProps {
  faq?: FaqConfig;
}

/**
 * Preguntas frecuentes con <details>/<summary>: accesible y funcional sin JavaScript.
 * No renderiza nada si no hay configuración o preguntas.
 */
export function Faq({ faq }: FaqProps) {
  const items = faq?.items ?? [];
  if (!faq || items.length === 0) return null;
  const titleId = `${FAQ_SECTION_ID}-titulo`;

  return (
    <section id={FAQ_SECTION_ID} aria-labelledby={titleId} className="scroll-mt-20 py-20 bg-white border-t border-slate-200">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">{faq.subtitle || "Dudas comunes"}</p>
          <h2 id={titleId} className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {faq.title || "Preguntas frecuentes"}
          </h2>
        </div>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <details key={idx} className="group rounded-xl border border-slate-200 bg-slate-50/60 open:bg-white open:shadow-sm">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-xl [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600 sm:text-base whitespace-pre-line">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
