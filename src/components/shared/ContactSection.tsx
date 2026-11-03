import type { ClientConfig } from "@/types/client";
import { buildWhatsAppLink } from "@/utils/whatsapp";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  ExternalLink,
  Globe,
  Music2,
  Video,
} from "lucide-react";

interface ContactSectionProps {
  config: ClientConfig;
}

export function ContactSection({ config }: ContactSectionProps) {
  const { contact, businessName, sectionTitles, sectionVisibility, variant } = config;
  const isArtist = variant === "artist";

  if (sectionVisibility?.contact === false) {
    return null;
  }

  const waLink = buildWhatsAppLink(contact.whatsapp, contact.whatsappDefaultMessage);

  const hasDirectContact = Boolean(contact.whatsapp || contact.phone || contact.email);
  const hasLocation = Boolean(contact.address || contact.city || contact.googleMapsUrl);
  const showSchedule = sectionVisibility?.schedule !== false && Boolean(contact.schedule && contact.schedule.length > 0);
  
  const social = contact.socialLinks;
  const hasSocial = Boolean(
    social &&
      (social.facebook ||
        social.instagram ||
        social.tiktok ||
        social.linkedin ||
        social.spotify ||
        social.youtube ||
        social.appleMusic ||
        social.soundcloud)
  );

  if (!hasDirectContact && !hasLocation && !showSchedule && !hasSocial) {
    return null;
  }

  // Títulos y subtítulos configurables
  const subTitle = sectionTitles?.contactSubtitle || (isArtist ? "Contrataciones & Management" : "Estamos a tu disposición");
  const mainTitle = sectionTitles?.contactTitle || (isArtist ? `Contratar a ${businessName}` : `Comunícate con ${businessName}`);
  const description = sectionTitles?.contactDescription || (isArtist
    ? "Coordina fechas para conciertos, presentaciones privadas, festivales o eventos corporativos."
    : "Elige el medio de tu preferencia para resolver dudas, cotizar o agendar una atención.");

  return (
    <section id="contacto" className="scroll-mt-20 py-20 bg-slate-900 text-white" aria-labelledby="contacto-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-emerald-400">
            {subTitle}
          </p>
          <h2 id="contacto-heading" className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {mainTitle}
          </h2>
          <p className="mt-4 text-base text-slate-300">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Canales directos */}
          {hasDirectContact && (
            <div className="rounded-2xl bg-slate-800/80 p-8 border border-slate-700/60 shadow-lg">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                <span>{isArtist ? "Contacto Directo" : "Atención Directa"}</span>
              </h3>
              <ul className="space-y-5">
                {waLink && (
                  <li>
                    <span className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                      {isArtist ? "WhatsApp de Contratación" : "WhatsApp"}
                    </span>
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-2 text-base font-medium text-emerald-400 hover:text-emerald-300 focus:outline-none focus:underline"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      <span>{contact.whatsapp}</span>
                    </a>
                  </li>
                )}

                {contact.phone && (
                  <li>
                    <span className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                      {isArtist ? "Teléfono / Management" : "Teléfono"}
                    </span>
                    <a
                      href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`}
                      className="mt-1 inline-flex items-center gap-2 text-base font-medium text-white hover:text-slate-200 focus:outline-none focus:underline"
                    >
                      <Phone className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      <span>{contact.phone}</span>
                    </a>
                  </li>
                )}

                {contact.email && (
                  <li>
                    <span className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                      Correo Electrónico
                    </span>
                    <a
                      href={`mailto:${contact.email}`}
                      className="mt-1 inline-flex items-center gap-2 text-base font-medium text-white hover:text-slate-200 focus:outline-none focus:underline break-all"
                    >
                      <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      <span>{contact.email}</span>
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Ubicación / Zona */}
          {hasLocation && (
            <div className="rounded-2xl bg-slate-800/80 p-8 border border-slate-700/60 shadow-lg">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-indigo-400" aria-hidden="true" />
                <span>{isArtist ? "Zona de Presentaciones" : "Ubicación"}</span>
              </h3>
              <div className="space-y-4">
                {contact.address && (
                  <div>
                    <span className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                      Dirección
                    </span>
                    <p className="mt-1 text-base text-slate-200">{contact.address}</p>
                  </div>
                )}

                {contact.city && (
                  <div>
                    <span className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                      Ciudad / Cobertura
                    </span>
                    <p className="mt-1 text-base text-slate-200">{contact.city}</p>
                  </div>
                )}

                {contact.googleMapsUrl && (
                  <div className="pt-2">
                    <a
                      href={contact.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300 focus:outline-none focus:underline"
                    >
                      <span>Abrir en Google Maps</span>
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Horarios y Redes */}
          {(showSchedule || hasSocial) && (
            <div className="rounded-2xl bg-slate-800/80 p-8 border border-slate-700/60 shadow-lg md:col-span-2 lg:col-span-1">
              {showSchedule && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-400" aria-hidden="true" />
                    <span>Horario de Atención</span>
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {contact.schedule?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {hasSocial && social && (
                <div className={showSchedule ? "pt-6 border-t border-slate-700/60" : ""}>
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <span>{isArtist ? "Redes & Plataformas" : "Redes Sociales"}</span>
                  </h4>
                  <div className="flex flex-wrap gap-2.5">
                    {social.spotify && (
                      <a
                        href={social.spotify}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/30 border border-emerald-500/50 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-600 hover:text-white"
                      >
                        <Music2 className="h-3.5 w-3.5" />
                        <span>Spotify</span>
                      </a>
                    )}
                    {social.youtube && (
                      <a
                        href={social.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600/30 border border-red-500/50 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-600 hover:text-white"
                      >
                        <Video className="h-3.5 w-3.5" />
                        <span>YouTube</span>
                      </a>
                    )}
                    {social.instagram && (
                      <a
                        href={social.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
                      >
                        Instagram
                      </a>
                    )}
                    {social.tiktok && (
                      <a
                        href={social.tiktok}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
                      >
                        TikTok
                      </a>
                    )}
                    {social.facebook && (
                      <a
                        href={social.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
                      >
                        Facebook
                      </a>
                    )}
                    {social.appleMusic && (
                      <a
                        href={social.appleMusic}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
                      >
                        Apple Music
                      </a>
                    )}
                    {social.soundcloud && (
                      <a
                        href={social.soundcloud}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
                      >
                        SoundCloud
                      </a>
                    )}
                    {social.linkedin && (
                      <a
                        href={social.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
                      >
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
