import type { ClientConfig } from "@/types/client";
import { getNavLinks } from "@/utils/navigation";

interface FooterProps {
  config: ClientConfig;
  /** "dark" para variantes con fondo oscuro (p. ej. artist). Por defecto "light". */
  tone?: "light" | "dark";
}

const TONES = {
  light: {
    footer: "border-slate-200 bg-white text-slate-600",
    name: "text-slate-900",
    tagline: "text-slate-600",
    link: "hover:text-slate-900",
    bottom: "border-slate-100 text-slate-500",
  },
  dark: {
    footer: "border-zinc-800 bg-zinc-950 text-zinc-400",
    name: "text-white",
    tagline: "text-zinc-400",
    link: "hover:text-white",
    bottom: "border-zinc-800 text-zinc-400",
  },
} as const;

export function Footer({ config, tone = "light" }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const isArtist = config.variant === "artist";
  const t = TONES[tone];
  // Mismos enlaces que la Navbar: nunca apunta a secciones ocultas.
  const links = getNavLinks(config);

  return (
    <footer className={`border-t py-12 ${t.footer}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <p className={`text-base font-bold ${t.name}`}>{config.businessName}</p>
            <p className={`mt-1 text-sm ${t.tagline}`}>{config.tagline}</p>
          </div>

          <nav aria-label="Enlaces del pie de página" className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm font-medium">
            {links.map((link) => (
              <a key={link.href} href={link.href} className={`transition-colors ${t.link}`}>
                {link.name}
              </a>
            ))}
          </nav>
        </div>

        <div className={`mt-8 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${t.bottom}`}>
          <p>
            © {currentYear} {config.businessName}. Todos los derechos reservados.
          </p>
          <p>{isArtist ? "Sitio Oficial del Artista" : "Web Oficial"}</p>
        </div>
      </div>
    </footer>
  );
}
