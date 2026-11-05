import type { ClientConfig } from "@/types/client";
import { Navbar } from "@/components/shared/Navbar";
import { ContactSection } from "@/components/shared/ContactSection";
import { WhatsAppFloatingButton } from "@/components/shared/WhatsAppFloatingButton";
import { Footer } from "@/components/shared/Footer";
import { buildWhatsAppLink, itemWhatsAppMessage, resolveCtaHref } from "@/utils/whatsapp";
import { contactFallbackHref } from "@/utils/navigation";
import { readableTextColor } from "@/utils/color";
import {
  Sparkles,
  Clock,
  CalendarCheck,
  Flower2,
  Smile,
  Shield,
} from "lucide-react";

interface BeautyThemeProps {
  config: ClientConfig;
}

export function BeautyTheme({ config }: BeautyThemeProps) {
  const { hero, about, services, advantages, contact, colors, sectionTitles, sectionVisibility } = config;

  const waBookingLink = buildWhatsAppLink(
    contact.whatsapp,
    contact.whatsappDefaultMessage || `Hola ${config.businessName}, deseo coordinar una cita para un tratamiento.`
  );

  const showAbout = sectionVisibility?.about !== false;
  const showServices = sectionVisibility?.services !== false && services && services.length > 0;
  const showAdvantages = sectionVisibility?.advantages !== false && advantages && advantages.length > 0;

  return (
    <div className="min-h-screen bg-rose-50/30 text-rose-950 antialiased selection:bg-pink-100 selection:text-pink-900">
      <Navbar config={config} />
      <main>

      {/* Hero Editorial & Sensorial */}
      <section id="inicio" className="relative overflow-hidden bg-white pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="absolute top-0 right-1/4 -z-10 h-96 w-96 rounded-full bg-rose-100/50 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 -z-10 h-80 w-80 rounded-full bg-pink-100/40 blur-2xl" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            {hero.badge && (
              <div className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50/80 px-4 py-1.5 text-xs font-medium tracking-wide text-pink-900 mb-8">
                <Flower2 className="h-4 w-4 text-pink-600" />
                <span>{hero.badge}</span>
              </div>
            )}

            <h1 className="text-4xl font-light tracking-tight text-stone-900 sm:text-5xl lg:text-6xl leading-tight">
              {hero.title}
            </h1>

            <p className="mt-6 text-base sm:text-lg text-stone-600 leading-relaxed font-light max-w-2xl mx-auto">
              {hero.description}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={waBookingLink || resolveCtaHref(hero.ctaPrimary.link, config) || "#inicio"}
                target={waBookingLink ? "_blank" : undefined}
                rel={waBookingLink ? "noopener noreferrer" : undefined}
                style={{ backgroundColor: colors.primary, color: readableTextColor(colors.primary) }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full px-9 py-4 text-sm font-semibold tracking-wide text-white shadow-md shadow-pink-500/20 transition-all hover:brightness-105 hover:shadow-lg focus:outline-none"
              >
                <CalendarCheck className="h-4 w-4" />
                <span>{hero.ctaPrimary.text}</span>
              </a>

              {hero.ctaSecondary && resolveCtaHref(hero.ctaSecondary.link, config) && (
                <a
                  href={resolveCtaHref(hero.ctaSecondary.link, config) ?? undefined}
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-8 py-4 text-sm font-medium text-rose-900 shadow-sm hover:bg-rose-50/50"
                >
                  {hero.ctaSecondary.text}
                </a>
              )}
            </div>

            {/* Puntos destacados del cliente en el Hero */}
            {about.highlights && about.highlights.length > 0 && (
              <div className="mt-12 pt-8 border-t border-rose-100 flex flex-wrap justify-center items-center gap-6 text-xs text-rose-800/80 font-medium tracking-wide">
                {about.highlights.slice(0, 3).map((hl, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-pink-500" />
                    <span>{hl}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Carta de Tratamientos / Servicios */}
      {showServices && (
        <section id="servicios" className="scroll-mt-20 py-24 bg-rose-50/40">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-xl mx-auto mb-16">
              <span className="text-xs font-semibold tracking-widest uppercase text-pink-700">
                {sectionTitles?.servicesSubtitle || "Carta Exclusiva"}
              </span>
              <h2 className="mt-2 text-3xl font-light text-stone-900 sm:text-4xl">
                {sectionTitles?.servicesTitle || "Tratamientos y Servicios"}
              </h2>
              {sectionTitles?.servicesDescription && (
                <p className="mt-4 text-sm text-stone-600 font-light">
                  {sectionTitles.servicesDescription}
                </p>
              )}
              <div className="mt-4 mx-auto h-0.5 w-16 bg-pink-300" />
            </div>

            <div className="space-y-6">
              {services.map((service) => {
                const waTreatmentLink = buildWhatsAppLink(
                  contact.whatsapp,
                  itemWhatsAppMessage(config, `Hola ${config.businessName}, deseo reservar una cita para: "${service.title}".`, service.title)
                );
                const treatmentHref = waTreatmentLink || contactFallbackHref(config);

                return (
                  <div
                    key={service.id}
                    className="group rounded-3xl bg-white p-7 sm:p-8 border border-pink-100 shadow-sm transition-all hover:shadow-md hover:border-pink-200 flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-xl font-medium text-stone-900 group-hover:text-pink-800 transition-colors">
                          {service.title}
                        </h3>
                        {service.badge && (
                          <span className="rounded-full bg-pink-100 px-3 py-0.5 text-xs font-medium text-pink-800">
                            {service.badge}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-stone-600 leading-relaxed font-light">
                        {service.description}
                      </p>

                      <div className="mt-3 flex items-center gap-4 text-xs text-stone-600">
                        {service.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-pink-500" />
                            <span>{service.duration}</span>
                          </span>
                        )}
                        {service.price && (
                          <span className="font-semibold text-pink-900 text-sm">
                            {service.price}
                          </span>
                        )}
                      </div>
                    </div>

                    {treatmentHref && (
                    <div className="shrink-0">
                      <a
                        href={treatmentHref}
                        target={waTreatmentLink ? "_blank" : undefined}
                        rel={waTreatmentLink ? "noopener noreferrer" : undefined}
                        className="inline-flex items-center justify-center rounded-full border border-pink-300 bg-pink-50/50 px-6 py-2.5 text-xs font-semibold text-pink-800 transition-colors hover:bg-pink-600 hover:text-white"
                      >
                        Reservar Cita
                        <span className="sr-only">: {service.title}</span>
                      </a>
                    </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Filosofía & Experiencia */}
      {showAbout && (
        <section id="nosotros" className="scroll-mt-20 py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <span className="text-xs font-semibold tracking-widest uppercase text-pink-700">
                {sectionTitles?.aboutSubtitle || "Nuestra Esencia"}
              </span>
              <h2 className="mt-2 text-3xl font-light text-stone-900 sm:text-4xl">
                {about.title}
              </h2>
              <p className="mt-6 text-base text-stone-600 leading-relaxed font-light whitespace-pre-line">
                {about.description}
              </p>

              {about.highlights && about.highlights.length > 0 && (
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                  {about.highlights.map((h, i) => (
                    <div key={i} className="rounded-2xl bg-rose-50/50 p-6 border border-pink-100">
                      <Smile className="h-5 w-5 text-pink-600 mb-3" />
                      <p className="text-xs sm:text-sm text-stone-700 font-medium leading-relaxed">{h}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Ventajas */}
      {showAdvantages && (
        <section id="ventajas" className="scroll-mt-20 py-20 bg-rose-50/30 border-t border-pink-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-xl mx-auto mb-16">
              <span className="text-xs font-semibold tracking-widest uppercase text-pink-700">
                {sectionTitles?.advantagesSubtitle || "Por Qué Elegirnos"}
              </span>
              <h2 className="mt-2 text-3xl font-light text-stone-900 sm:text-4xl">
                {sectionTitles?.advantagesTitle || `La Experiencia en ${config.businessName}`}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {advantages.map((adv, idx) => (
                <div key={idx} className="rounded-3xl bg-white p-7 border border-pink-100 shadow-sm">
                  <div className="h-10 w-10 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center mb-4">
                    <Shield className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-stone-900 mb-2">{adv.title}</h3>
                  <p className="text-xs text-stone-600 leading-relaxed font-light">{adv.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

        <ContactSection config={config} />
      </main>
      <Footer config={config} />
      <WhatsAppFloatingButton contact={contact} />
    </div>
  );
}
