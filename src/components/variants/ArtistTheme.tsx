import { preload } from "react-dom";
import type { ClientConfig } from "@/types/client";
import { Navbar } from "@/components/shared/Navbar";
import { ContactSection } from "@/components/shared/ContactSection";
import { WhatsAppFloatingButton } from "@/components/shared/WhatsAppFloatingButton";
import { Footer } from "@/components/shared/Footer";
import { buildWhatsAppLink, itemWhatsAppMessage, resolveCtaHref } from "@/utils/whatsapp";
import { contactFallbackHref, getNavbarData, getNavLinks, visibleEvents } from "@/utils/navigation";
import { readableTextColor } from "@/utils/color";
import { getEmbedVideoUrl, getVideoThumbnailUrl } from "@/utils/media";
import { getEventDateParts } from "@/utils/dates";
import { VideoEmbed } from "@/components/shared/VideoEmbed";
import {
  Music,
  Calendar,
  MapPin,
  Play,
  Clock,
  Sparkles,
  Ticket,
  Check,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface ArtistThemeProps {
  config: ClientConfig;
}

export function ArtistTheme({ config }: ArtistThemeProps) {
  const {
    businessName,
    tagline,
    hero,
    about,
    contact,
    colors,
    artistProfile,
    gallery,
    videos,
    packages,
    sectionTitles,
    sectionVisibility,
  } = config;

  const stageName = artistProfile?.stageName || businessName;
  const quote = artistProfile?.quote || tagline;
  const genre = artistProfile?.genre;
  const bookingZone = artistProfile?.bookingZone || contact.city;

  const waBookingLink = buildWhatsAppLink(
    contact.whatsapp,
    contact.whatsappDefaultMessage || `Hola ${stageName}, quisiera consultar disponibilidad para una presentación en vivo.`
  );

  // Visibilidad de secciones
  const showAbout = sectionVisibility?.about !== false;
  const showVideos = sectionVisibility?.videos !== false && Boolean(videos && videos.length > 0);
  const showGallery = sectionVisibility?.gallery !== false && Boolean(gallery && gallery.length > 0);
  // Eventos ocultos o con fecha pasada (respecto a la fecha del build) no se muestran.
  // Un solo instante (el del build) para la sección de fechas y la navegación: siempre coherentes.
  const renderedAt = new Date();
  const upcomingEvents = visibleEvents(config, renderedAt);
  const navLinks = getNavLinks(config, renderedAt);
  const showEvents = sectionVisibility?.events !== false && upcomingEvents.length > 0;
  const fallbackHref = contactFallbackHref(config);
  const eventConsultHref = waBookingLink || fallbackHref;
  const showPackages = sectionVisibility?.packages !== false && Boolean(packages && packages.filter((p) => p.visible !== false).length > 0);
  const portrait = artistProfile?.portraitImage || about.aboutImage;

  // La imagen de portada es el elemento más grande de la primera pantalla (LCP): se descarga cuanto antes.
  if (hero.heroImage) preload(hero.heroImage, { as: "image", fetchPriority: "high" });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-amber-500 selection:text-black">
      <Navbar data={getNavbarData(config, navLinks)} tone="dark" />
      <main>

      {/* Portada del Artista (Hero Escénico Inmersivo) */}
      <section
        id="inicio"
        className="relative min-h-[85vh] flex items-center justify-center overflow-hidden border-b border-zinc-800 bg-zinc-950 pt-16 pb-20 lg:pt-24 lg:pb-32"
      >
        {/* Fondo con imagen de atmósfera o gradiente escénico */}
        {hero.heroImage ? (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero.heroImage}
              alt=""
              fetchPriority="high"
              className="h-full w-full object-cover object-center opacity-30 blur-sm scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(9,9,11,0.6)_60%,#09090b_100%)]" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 opacity-20 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px]" />
        )}

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge o Género Musical */}
          {(genre || hero.badge) && (
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-400 mb-6 backdrop-blur-sm">
              <Music className="h-3.5 w-3.5" />
              <span>{genre || hero.badge}</span>
            </div>
          )}

          {/* Nombre Artístico Principal */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white uppercase leading-none">
            {stageName}
          </h1>

          {/* Frase de presentación / Lema */}
          <p className="mt-4 text-xl sm:text-2xl font-light text-amber-200/90 tracking-wide max-w-3xl mx-auto">
            {quote}
          </p>

          {/* Descripción Breve */}
          <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            {hero.description}
          </p>

          {/* Zona de contratación (texto libre del cliente, se muestra tal cual) */}
          {bookingZone && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-zinc-300">
              <MapPin className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              <span>{bookingZone}</span>
            </p>
          )}

          {/* Botones de acción de la portada */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={waBookingLink || resolveCtaHref(hero.ctaPrimary.link, config) || "#inicio"}
              target={waBookingLink ? "_blank" : undefined}
              rel={waBookingLink ? "noopener noreferrer" : undefined}
              style={{ backgroundColor: colors.primary || "#d97706", color: readableTextColor(colors.primary || "#d97706") }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full px-8 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:brightness-110 active:scale-95"
            >
              <span>{hero.ctaPrimary.text || "Contratar en Vivo"}</span>
              <ArrowRight className="h-4 w-4" />
            </a>

            {hero.ctaSecondary && resolveCtaHref(hero.ctaSecondary.link, config) && (
              <a
                href={resolveCtaHref(hero.ctaSecondary.link, config) ?? undefined}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/80 px-8 py-4 text-sm font-semibold text-zinc-200 backdrop-blur-sm transition-colors hover:bg-zinc-800 hover:text-white"
              >
                {hero.ctaSecondary.text}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Biografía y Trayectoria */}
      {showAbout && (
        <section id="biografia" className="scroll-mt-20 py-24 bg-zinc-900/60 border-b border-zinc-800/80">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className={`grid grid-cols-1 ${portrait ? "lg:grid-cols-12 gap-12" : "max-w-3xl mx-auto text-center"} items-center`}>
              
              {/* Fotografía de retrato del artista si existe */}
              {portrait && (
                <div className="lg:col-span-5">
                  <div className="relative mx-auto max-w-sm lg:max-w-none rounded-2xl overflow-hidden border border-zinc-700/60 bg-zinc-900 shadow-2xl shadow-black/80 aspect-[4/5]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={portrait}
                      alt={`Retrato de ${stageName}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
                  </div>
                </div>
              )}

              {/* Texto de Biografía */}
              <div className={portrait ? "lg:col-span-7" : "w-full"}>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                  {sectionTitles?.aboutSubtitle || "Trayectoria & Pasión"}
                </span>
                <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  {about.title || `Sobre ${stageName}`}
                </h2>

                <div className="mt-6 text-zinc-300 text-base sm:text-lg leading-relaxed space-y-4 whitespace-pre-line text-left">
                  <p>{artistProfile?.bio || about.description}</p>
                </div>

                {/* Logros o reconocimientos (solo si el cliente los proporcionó) */}
                {artistProfile?.achievements && artistProfile.achievements.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-zinc-800">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4">
                      Hitos y Experiencia
                    </h3>
                    <ul className="space-y-2.5">
                      {artistProfile.achievements.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm text-zinc-300">
                          <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

            </div>
          </div>
        </section>
      )}

      {/* Música y Videos en Vivo */}
      {showVideos && (
        <section id="musica" className="scroll-mt-20 py-24 bg-zinc-950 border-b border-zinc-800">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                {sectionTitles?.videosSubtitle || "En Escena"}
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">
                {sectionTitles?.videosTitle || "Música & Videos en Vivo"}
              </h2>
              {sectionTitles?.videosDescription && (
                <p className="mt-3 text-zinc-400 text-sm sm:text-base">
                  {sectionTitles.videosDescription}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {videos?.map((vid) => {
                const embedUrl = getEmbedVideoUrl(vid.url);

                return (
                  <div
                    key={vid.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/70 overflow-hidden shadow-lg transition-transform hover:border-amber-500/50"
                  >
                    {embedUrl ? (
                      <VideoEmbed embedUrl={embedUrl} thumbnailUrl={getVideoThumbnailUrl(vid.url)} title={vid.title} />
                    ) : (
                      <div className="aspect-video w-full bg-zinc-900 flex flex-col items-center justify-center p-6 text-center">
                        <Play className="h-10 w-10 text-amber-400 mb-2" />
                        <a
                          href={vid.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-amber-400 hover:underline flex items-center gap-1.5"
                        >
                          <span>Ver video en plataforma externa</span>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    )}

                    <div className="p-5">
                      <h3 className="text-lg font-bold text-white mb-1">{vid.title}</h3>
                      {vid.description && (
                        <p className="text-xs text-zinc-400 leading-relaxed">{vid.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Galería de Fotografías */}
      {showGallery && (
        <section id="galeria" className="scroll-mt-20 py-24 bg-zinc-900/40 border-b border-zinc-800">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                {sectionTitles?.gallerySubtitle || "Fotografía"}
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">
                {sectionTitles?.galleryTitle || "Galería de Escena"}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {gallery?.map((img) => (
                <div
                  key={img.id}
                  className="group relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 aspect-[4/3] shadow-md"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.alt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {img.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      <p className="text-xs text-zinc-200">{img.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Presentaciones y Eventos (Conciertos en Vivo) */}
      {showEvents && (
        <section id="fechas" className="scroll-mt-20 py-24 bg-zinc-950 border-b border-zinc-800">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                {sectionTitles?.eventsSubtitle || "Calendario"}
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">
                {sectionTitles?.eventsTitle || "Próximas Presentaciones"}
              </h2>
              {sectionTitles?.eventsDescription && (
                <p className="mt-3 text-zinc-400 text-sm sm:text-base">
                  {sectionTitles.eventsDescription}
                </p>
              )}
            </div>

            <div className="space-y-4">
              {upcomingEvents.map((ev) => {
                  const when = getEventDateParts(ev.date);
                  return (
                  <div
                    key={ev.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:border-zinc-700"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 h-16 w-16 shrink-0" aria-hidden="true">
                        {when.month ? (
                          <>
                            <span className="text-[11px] font-bold uppercase tracking-wider">{when.month}</span>
                            {when.day && <span className="text-2xl font-black leading-none text-white">{when.day}</span>}
                          </>
                        ) : (
                          <Calendar className="h-6 w-6" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{ev.title}</h3>
                        <p className="text-xs text-zinc-300 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>{ev.date}</span>
                          {ev.time && <span>• {ev.time}</span>}
                          <span>• {ev.venue}, {ev.city}</span>
                        </p>
                        {ev.description && (
                          <p className="text-xs text-zinc-400 mt-2">{ev.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-3">
                      {ev.ticketUrl ? (
                        <a
                          href={ev.ticketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-bold text-black hover:bg-amber-400 transition-colors"
                        >
                          <Ticket className="h-3.5 w-3.5" />
                          <span>Entradas / Info</span>
                        </a>
                      ) : eventConsultHref ? (
                        <a
                          href={eventConsultHref}
                          target={waBookingLink ? "_blank" : undefined}
                          rel={waBookingLink ? "noopener noreferrer" : undefined}
                          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
                        >
                          <span>Consultar</span>
                          <span className="sr-only">: {ev.title}</span>
                        </a>
                      ) : null}
                    </div>
                  </div>
                  );
                })}
            </div>
          </div>
        </section>
      )}

      {/* Paquetes de Contratación */}
      {showPackages && (
        <section id="paquetes" className="scroll-mt-20 py-24 bg-zinc-900/50 border-b border-zinc-800">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                {sectionTitles?.packagesSubtitle || "Propuesta Artística"}
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">
                {sectionTitles?.packagesTitle || "Paquetes de Contratación"}
              </h2>
              <p className="mt-3 text-zinc-400 text-sm sm:text-base">
                {sectionTitles?.packagesDescription || "Formatos adaptados para eventos corporativos, matrimonios, festivales o recitales privados."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {packages
                ?.filter((pkg) => pkg.visible !== false)
                .map((pkg) => {
                  const waPkgLink = buildWhatsAppLink(
                    contact.whatsapp,
                    itemWhatsAppMessage(config, `Hola ${stageName}, me interesa cotizar el paquete "${pkg.title}" para una presentación.`, pkg.title)
                  );
                  const pkgHref = waPkgLink || pkg.ctaLink || fallbackHref;

                  return (
                    <div
                      key={pkg.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 flex flex-col justify-between shadow-xl transition-all hover:border-amber-500/50"
                    >
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">{pkg.title}</h3>
                        <p className="text-xs text-zinc-400 leading-relaxed min-h-[40px]">
                          {pkg.description}
                        </p>

                        <div className="my-6 pt-4 border-t border-zinc-800">
                          {pkg.price ? (
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-amber-400">{pkg.price}</span>
                              {pkg.currency && <span className="text-xs text-zinc-400 font-medium">{pkg.currency}</span>}
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-amber-400/90 uppercase tracking-wider">
                              Cotización Personalizada
                            </span>
                          )}

                          {pkg.duration && (
                            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                              <span>Duración: {pkg.duration}</span>
                            </p>
                          )}
                        </div>

                        {pkg.features && pkg.features.length > 0 && (
                          <ul className="space-y-2.5 mb-6 text-xs text-zinc-300">
                            {pkg.features.map((feat, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {pkgHref && (
                      <a
                        href={pkgHref}
                        target={waPkgLink ? "_blank" : undefined}
                        rel={waPkgLink ? "noopener noreferrer" : undefined}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-xs font-bold uppercase tracking-wider text-black shadow-md hover:bg-amber-400 transition-colors"
                      >
                        <span>{pkg.ctaText || "Consultar Fecha"}</span>
                        <span className="sr-only">: {pkg.title}</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </section>
      )}

        {/* Contacto y Redes */}
        <ContactSection config={config} />
      </main>

      {/* Pie de Página */}
      <Footer config={config} links={navLinks} tone="dark" />

      {/* Botón flotante accesible */}
      <WhatsAppFloatingButton contact={contact} />
    </div>
  );
}
