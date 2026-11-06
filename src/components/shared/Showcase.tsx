import type { Showcase as ShowcaseConfig } from "@/types/client";
import { SHOWCASE_SECTION_ID } from "@/utils/navigation";
import { ArrowUpRight } from "lucide-react";

interface ShowcaseProps {
  showcase?: ShowcaseConfig;
}

/**
 * Catálogo de tarjetas (plantillas, proyectos o páginas relacionadas). Reutilizable y opcional:
 * no renderiza nada si no hay configuración o elementos. Una tarjeta sin `url` se muestra sin enlace.
 */
export function Showcase({ showcase }: ShowcaseProps) {
  const items = showcase?.items ?? [];
  if (!showcase || items.length === 0) return null;

  const titleId = `${SHOWCASE_SECTION_ID}-titulo`;

  return (
    <section id={SHOWCASE_SECTION_ID} aria-labelledby={titleId} className="scroll-mt-20 py-24 bg-white border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">{showcase.subtitle || "Catálogo"}</p>
          <h2 id={titleId} className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {showcase.title || "Explora nuestros trabajos"}
          </h2>
          {showcase.description && <p className="mt-4 text-base text-slate-600">{showcase.description}</p>}
        </div>

        <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4" role="list">
          {items.map((item, idx) => (
            <li key={`${item.title}-${idx}`} className="flex">
              <article className="flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 shadow-sm transition-shadow hover:shadow-lg">
                {item.image && (
                  <div className="aspect-[4/3] w-full overflow-hidden bg-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt={item.imageAlt || `Vista de referencia: ${item.title}`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{item.description}</p>

                  {item.tags && item.tags.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-2" aria-label={`Rubros de ${item.title}`}>
                      {item.tags.map((tag) => (
                        <li key={tag} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                          {tag}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-6 border-t border-slate-200 pt-4">
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900 focus:outline-none focus-visible:underline"
                      >
                        <span>{item.linkLabel || "Ver demostración"}</span>
                        <span className="sr-only">: {item.title} (se abre en una pestaña nueva)</span>
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-slate-600">{showcase.pendingLinkText || "Demostración disponible próximamente"}</p>
                    )}
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
