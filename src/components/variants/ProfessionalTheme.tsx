import { preload } from "react-dom";
import type { ClientConfig } from "@/types/client";
import { Navbar } from "@/components/shared/Navbar";
import { ContactSection } from "@/components/shared/ContactSection";
import { WhatsAppFloatingButton } from "@/components/shared/WhatsAppFloatingButton";
import { Footer } from "@/components/shared/Footer";
import { Showcase } from "@/components/shared/Showcase";
import { Faq } from "@/components/shared/Faq";
import { buildWhatsAppLink, itemWhatsAppMessage, resolveCtaHref } from "@/utils/whatsapp";
import { contactFallbackHref, showsFaq, showsShowcase } from "@/utils/navigation";
import { readableTextColor } from "@/utils/color";
import {
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  FileCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface ProfessionalThemeProps {
  config: ClientConfig;
}

export function ProfessionalTheme({ config }: ProfessionalThemeProps) {
  const { hero, about, services, advantages, contact, colors, sectionTitles, sectionVisibility } = config;

  const advantageIcons = [ShieldCheck, TrendingUp, FileCheck, CheckCircle2];

  // Evaluar visibilidad
  const showAbout = sectionVisibility?.about !== false;
  const showServices = sectionVisibility?.services !== false && services && services.length > 0;
  const showAdvantages = sectionVisibility?.advantages !== false && advantages && advantages.length > 0;

  // Panel lateral del hero: imagen de portada o, si no hay, los puntos destacados del cliente.
  const highlights = about.highlights ?? [];
  const highlightsInHero = !hero.heroImage && highlights.length >= 2;
  const hasSidePanel = Boolean(hero.heroImage) || highlightsInHero;
  // Si los destacados ya están en el hero, "Nosotros" no los repite.
  const showAboutHighlights = highlights.length > 0 && !highlightsInHero;
  const highlightsTitle = sectionTitles?.aboutTitle || "Aspectos Destacados";

  // CTAs del hero: el valor "whatsapp" se resuelve al chat (o se omite si aún no hay número).
  const primaryHref = resolveCtaHref(hero.ctaPrimary.link, config);
  const secondaryHref = hero.ctaSecondary ? resolveCtaHref(hero.ctaSecondary.link, config) : null;
  const fallbackHref = contactFallbackHref(config);

  // La imagen de portada es el elemento más grande de la primera pantalla (LCP): se descarga cuanto antes.
  if (hero.heroImage) preload(hero.heroImage, { as: "image", fetchPriority: "high" });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-slate-900 selection:text-white">
      <Navbar config={config} />
      <main>

      {/* Hero Section */}
      <section
        id="inicio"
        className="relative overflow-hidden bg-white pt-16 pb-20 lg:pt-24 lg:pb-28 border-b border-slate-200"
      >
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className={`grid grid-cols-1 ${hasSidePanel ? "lg:grid-cols-12 gap-12 lg:gap-8" : "max-w-4xl"} items-center`}>
            
            {/* Columna Principal */}
            <div className={hasSidePanel ? "lg:col-span-7" : "w-full"}>
              {hero.badge && (
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-4 py-1.5 text-xs font-semibold text-blue-900 mb-6">
                  <Sparkles className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
                  <span>{hero.badge}</span>
                </div>
              )}

              <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl leading-[1.15]">
                {hero.title}
              </h1>

              <p className="mt-6 text-lg text-slate-600 sm:text-xl leading-relaxed max-w-2xl">
                {hero.description}
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                {primaryHref && (
                <a
                  href={primaryHref}
                  {...(primaryHref.startsWith("https://wa.me/") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  style={{ backgroundColor: colors.primary, color: readableTextColor(colors.primary) }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-blue-200"
                >
                  <span>{hero.ctaPrimary.text}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                )}

                {hero.ctaSecondary && secondaryHref && (
                  <a
                    href={secondaryHref}
                    {...(secondaryHref.startsWith("https://wa.me/") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-slate-100"
                  >
                    {hero.ctaSecondary.text}
                  </a>
                )}
              </div>
            </div>

            {/* Panel Lateral Dinámico (siempre con datos del cliente o imagen) */}
            {hasSidePanel && (
              <div className="lg:col-span-5">
                {hero.heroImage ? (
                  <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={hero.heroImage}
                      alt={hero.title}
                      fetchPriority="high"
                      className="w-full h-80 object-cover"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-8 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">
                      {highlightsTitle}
                    </h2>
                    <div className="space-y-3">
                      {highlights.map((hl, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-lg bg-white p-3.5 border border-slate-200/70 shadow-sm">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                          <p className="text-sm text-slate-700 leading-snug">{hl}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </section>

      {/* Sobre Nosotros (Condicional y Personalizable) */}
      {showAbout && (
        <section id="nosotros" className="scroll-mt-20 py-20 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className={`grid grid-cols-1 ${showAboutHighlights ? "lg:grid-cols-2 gap-12" : "max-w-3xl"} items-center`}>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">
                  {sectionTitles?.aboutSubtitle || "Conócenos"}
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  {about.title}
                </h2>
                <p className="mt-6 text-base text-slate-600 sm:text-lg leading-relaxed whitespace-pre-line">
                  {about.description}
                </p>
              </div>

              {showAboutHighlights && (
                <div className="rounded-2xl bg-white p-8 border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">
                    {highlightsTitle}
                  </h3>
                  <ul className="space-y-4">
                    {highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-slate-700">
                        <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="text-sm sm:text-base">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Catálogo opcional (showcase) */}
      {showsShowcase(config) && <Showcase showcase={config.showcase} />}

      {/* Servicios (Condicional y Personalizable) */}
      {showServices && (
        <section id="servicios" className="scroll-mt-20 py-24 bg-white border-t border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">
                {sectionTitles?.servicesSubtitle || "Nuestra Oferta"}
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {sectionTitles?.servicesTitle || "Servicios Especializados"}
              </h2>
              {sectionTitles?.servicesDescription && (
                <p className="mt-4 text-base text-slate-600">
                  {sectionTitles.servicesDescription}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {services.map((service) => {
                const waConsultLink = buildWhatsAppLink(
                  contact.whatsapp,
                  itemWhatsAppMessage(config, `Hola ${config.businessName}, me interesa consultar sobre "${service.title}".`, service.title)
                );
                const consultHref = waConsultLink || fallbackHref;

                return (
                  <div
                    key={service.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-8 transition-all hover:bg-white hover:shadow-lg hover:border-slate-300"
                  >
                    <div>
                      {service.badge && (
                        <span className="inline-block rounded-full bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 mb-4">
                          {service.badge}
                        </span>
                      )}
                      <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                        {service.title}
                      </h3>
                      <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                      {service.price ? (
                        <span className="text-sm font-semibold text-slate-900">{service.price}</span>
                      ) : (
                        <span className="text-xs font-medium text-slate-600">Consultar</span>
                      )}

                      {consultHref && (
                      <a
                        href={consultHref}
                        target={waConsultLink ? "_blank" : undefined}
                        rel={waConsultLink ? "noopener noreferrer" : undefined}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900 focus:outline-none focus:underline"
                      >
                        <span>Consultar</span>
                        <span className="sr-only">: {service.title}</span>
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Ventajas (Condicional y Personalizable) */}
      {showAdvantages && (
        <section id="ventajas" className="scroll-mt-20 py-20 bg-slate-50 border-t border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">
                {sectionTitles?.advantagesSubtitle || "Diferenciales Clave"}
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {sectionTitles?.advantagesTitle || `¿Por qué elegir a ${config.businessName}?`}
              </h2>
              {sectionTitles?.advantagesDescription && (
                <p className="mt-4 text-base text-slate-600">
                  {sectionTitles.advantagesDescription}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {advantages.map((adv, idx) => {
                const IconComponent = advantageIcons[idx % advantageIcons.length];
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700 mb-5">
                        <IconComponent className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{adv.title}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{adv.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Preguntas frecuentes opcionales */}
      {showsFaq(config) && <Faq faq={config.faq} />}

        <ContactSection config={config} />
      </main>
      <Footer config={config} />
      <WhatsAppFloatingButton contact={contact} />
    </div>
  );
}
