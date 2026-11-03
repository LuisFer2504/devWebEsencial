import type { ClientConfig } from "@/types/client";

interface FooterProps {
  config: ClientConfig;
}

export function Footer({ config }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const isArtist = config.variant === "artist";

  return (
    <footer className="border-t border-slate-200 bg-white py-12 text-slate-600">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <p className="text-base font-bold text-slate-900">{config.businessName}</p>
            <p className="mt-1 text-sm text-slate-500">{config.tagline}</p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium">
            <a href="#inicio" className="hover:text-slate-900 transition-colors">
              Inicio
            </a>
            {isArtist ? (
              <>
                <a href="#biografia" className="hover:text-slate-900 transition-colors">
                  Biografía
                </a>
                <a href="#musica" className="hover:text-slate-900 transition-colors">
                  Música
                </a>
                <a href="#contacto" className="hover:text-slate-900 transition-colors">
                  Contacto
                </a>
              </>
            ) : (
              <>
                <a href="#nosotros" className="hover:text-slate-900 transition-colors">
                  Nosotros
                </a>
                <a href="#servicios" className="hover:text-slate-900 transition-colors">
                  Servicios
                </a>
                <a href="#contacto" className="hover:text-slate-900 transition-colors">
                  Contacto
                </a>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {currentYear} {config.businessName}. Todos los derechos reservados.</p>
          <p>{isArtist ? "Sitio Oficial del Artista" : "Web Oficial"}</p>
        </div>
      </div>
    </footer>
  );
}
