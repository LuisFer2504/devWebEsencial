import type { ClientConfig } from "@/types/client";
import { Navbar } from "@/components/shared/Navbar";
import { ContactSection } from "@/components/shared/ContactSection";
import { WhatsAppFloatingButton } from "@/components/shared/WhatsAppFloatingButton";
import { Footer } from "@/components/shared/Footer";
import { buildWhatsAppLink } from "@/utils/whatsapp";
import {
  ShoppingBag,
  Truck,
  CreditCard,
  ShieldCheck,
  Clock,
  PhoneCall,
  MessageCircle,
  Tag,
} from "lucide-react";

interface CommerceThemeProps {
  config: ClientConfig;
}

export function CommerceTheme({ config }: CommerceThemeProps) {
  const { hero, about, services, advantages, contact, colors, sectionTitles, sectionVisibility } = config;

  const waMainLink = buildWhatsAppLink(
    contact.whatsapp,
    contact.whatsappDefaultMessage || `Hola ${config.businessName}, deseo hacer una consulta comercial.`
  );

  const showAbout = sectionVisibility?.about !== false;
  const showServices = sectionVisibility?.services !== false && services && services.length > 0;
  const showAdvantages = sectionVisibility?.advantages !== false && advantages && advantages.length > 0;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 antialiased">
      <Navbar config={config} />

      {/* Hero Comercial Centrado */}
      <section id="inicio" className="relative overflow-hidden bg-white border-b border-stone-200 pt-12 pb-16 lg:pt-20 lg:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {hero.badge && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-4 py-1.5 text-xs font-bold text-amber-900 mb-6 uppercase tracking-wider">
                <Tag className="h-3.5 w-3.5 text-amber-700" />
                <span>{hero.badge}</span>
              </span>
            )}

            <h1 className="text-3xl font-extrabold tracking-tight text-stone-950 sm:text-5xl sm:leading-tight">
              {hero.title}
            </h1>

            <p className="mt-5 text-base sm:text-lg text-stone-600 leading-relaxed">
              {hero.description}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={waMainLink || hero.ctaPrimary.link}
                target={waMainLink ? "_blank" : undefined}
                rel={waMainLink ? "noopener noreferrer" : undefined}
                style={{ backgroundColor: colors.primary }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl px-8 py-4 text-base font-bold text-white shadow-lg transition-transform duration-150 hover:scale-105 hover:brightness-110 active:scale-95"
              >
                <MessageCircle className="h-5 w-5" />
                <span>{hero.ctaPrimary.text}</span>
              </a>

              {hero.ctaSecondary && (
                <a
                  href={hero.ctaSecondary.link}
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border-2 border-stone-300 bg-white px-8 py-4 text-base font-bold text-stone-800 transition-colors hover:bg-stone-100"
                >
                  {hero.ctaSecondary.text}
                </a>
              )}
            </div>
          </div>

          {/* Cinta de Facilidades de Compra */}
          <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4 border-t border-stone-200 pt-8">
            <div className="flex items-center gap-3 rounded-xl bg-stone-100/80 p-3 sm:p-4">
              <Truck className="h-6 w-6 text-orange-600 shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-stone-900">Envíos Rápidos</p>
                <p className="text-xs text-stone-500">Despacho oportuno</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-stone-100/80 p-3 sm:p-4">
              <CreditCard className="h-6 w-6 text-orange-600 shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-stone-900">Facilidades de Pago</p>
                <p className="text-xs text-stone-500">Digital y en efectivo</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-stone-100/80 p-3 sm:p-4">
              <ShieldCheck className="h-6 w-6 text-orange-600 shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-stone-900">Garantía Directa</p>
                <p className="text-xs text-stone-500">Calidad asegurada</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-stone-100/80 p-3 sm:p-4">
              <Clock className="h-6 w-6 text-orange-600 shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-stone-900">Atención Directa</p>
                <p className="text-xs text-stone-500">Respuesta rápida</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catálogo de Productos o Servicios */}
      {showServices && (
        <section id="servicios" className="scroll-mt-20 py-20 bg-stone-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
                  {sectionTitles?.servicesSubtitle || "Disponibilidad"}
                </span>
                <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
                  {sectionTitles?.servicesTitle || "Catálogo Destacado"}
                </h2>
              </div>
              <p className="mt-2 md:mt-0 text-sm text-stone-600 max-w-md">
                {sectionTitles?.servicesDescription || "Pide tu cotización al instante. Haz clic en el botón de cada producto para coordinar por WhatsApp."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((service) => {
                const waProductLink = buildWhatsAppLink(
                  contact.whatsapp,
                  `Hola ${config.businessName}, deseo consultar sobre: "${service.title}".`
                );

                return (
                  <div
                    key={service.id}
                    className="flex flex-col justify-between rounded-2xl bg-white border border-stone-200 shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-orange-400"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-orange-100 text-orange-700">
                          <ShoppingBag className="h-5 w-5" />
                        </span>
                        {service.badge && (
                          <span className="rounded-md bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">
                            {service.badge}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-stone-950 mb-2 line-clamp-2">
                        {service.title}
                      </h3>

                      <p className="text-xs text-stone-600 leading-relaxed line-clamp-3">
                        {service.description}
                      </p>
                    </div>

                    <div className="p-6 pt-0 border-t border-stone-100 mt-auto bg-stone-50/50">
                      <div className="my-3">
                        {service.price ? (
                          <p className="text-base font-extrabold text-stone-900">{service.price}</p>
                        ) : (
                          <p className="text-xs font-medium text-stone-500">Consultar precio</p>
                        )}
                      </div>

                      <a
                        href={waProductLink || "#contacto"}
                        target={waProductLink ? "_blank" : undefined}
                        rel={waProductLink ? "noopener noreferrer" : undefined}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-orange-700"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>Pedir por WhatsApp</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Sobre el Negocio */}
      {showAbout && (
        <section id="nosotros" className="scroll-mt-20 py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className={`grid grid-cols-1 ${about.highlights && about.highlights.length > 0 ? "lg:grid-cols-2 gap-12" : "max-w-3xl"} items-center`}>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
                  {sectionTitles?.aboutSubtitle || "Nuestra Empresa"}
                </span>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-stone-950 sm:text-4xl">
                  {about.title}
                </h2>
                <p className="mt-5 text-base text-stone-600 leading-relaxed whitespace-pre-line">
                  {about.description}
                </p>

                {about.highlights && (
                  <div className="mt-6 space-y-3">
                    {about.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-orange-600 shrink-0" />
                        <span className="text-sm font-medium text-stone-800">{h}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {waMainLink && (
                <div className="rounded-2xl bg-orange-500 p-8 text-white shadow-xl">
                  <h3 className="text-2xl font-black mb-3">¿Tienes una consulta o pedido?</h3>
                  <p className="text-sm text-orange-100 mb-6 leading-relaxed">
                    Escríbenos directamente para coordinar tu atención inmediata o consultar disponibilidad de productos.
                  </p>
                  <a
                    href={waMainLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-extrabold text-orange-700 shadow-md transition-colors hover:bg-orange-50"
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span>Consultar por WhatsApp</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Ventajas Comerciales */}
      {showAdvantages && (
        <section id="ventajas" className="scroll-mt-20 py-20 bg-stone-100 border-t border-stone-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
                {sectionTitles?.advantagesSubtitle || "Diferenciales"}
              </span>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-stone-950 sm:text-4xl">
                {sectionTitles?.advantagesTitle || `¿Por qué elegir a ${config.businessName}?`}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {advantages.map((adv, idx) => (
                <div key={idx} className="rounded-2xl bg-white p-6 border border-stone-200 shadow-xs">
                  <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-extrabold text-sm mb-4">
                    0{idx + 1}
                  </div>
                  <h3 className="text-base font-bold text-stone-900 mb-2">{adv.title}</h3>
                  <p className="text-xs text-stone-600 leading-relaxed">{adv.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <ContactSection config={config} />
      <Footer config={config} />
      <WhatsAppFloatingButton contact={contact} />

      {/* Barra de Conversión Móvil Fija */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-stone-200 px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg">
        {contact.phone && (
          <a
            href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 py-2.5 text-xs font-bold text-stone-700"
          >
            <PhoneCall className="h-4 w-4" />
            <span>Llamar</span>
          </a>
        )}
        {waMainLink && (
          <a
            href={waMainLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-2 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm"
          >
            <MessageCircle className="h-4 w-4" />
            <span>WhatsApp</span>
          </a>
        )}
      </div>
    </div>
  );
}
