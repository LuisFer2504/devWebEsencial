"use client";

import { useState } from "react";
import type { NavbarData } from "@/utils/navigation";
import { readableTextColor } from "@/utils/color";
import { Menu, X, MessageCircle } from "lucide-react";

interface NavbarProps {
  /** Calculado en el servidor con getNavbarData: la Navbar no evalúa fechas ni reglas de visibilidad. */
  data: NavbarData;
  /** "dark" para variantes con fondo oscuro (p. ej. artist). Por defecto "light". */
  tone?: "light" | "dark";
}

const TONES = {
  light: {
    header: "border-slate-200/80 bg-white/95",
    name: "text-slate-900",
    tagline: "text-slate-600",
    link: "text-slate-600 hover:text-slate-950",
    menuButton: "text-slate-700 hover:bg-slate-100 focus:ring-slate-900",
    mobilePanel: "border-slate-200 bg-white",
    mobileLink: "text-slate-700 hover:bg-slate-50 hover:text-slate-950",
    fallbackCta: "bg-slate-900 hover:bg-slate-800 focus:ring-slate-900",
  },
  dark: {
    header: "border-zinc-800 bg-zinc-950/90",
    name: "text-white",
    tagline: "text-zinc-400",
    link: "text-zinc-300 hover:text-white",
    menuButton: "text-zinc-200 hover:bg-zinc-800 focus:ring-zinc-200",
    mobilePanel: "border-zinc-800 bg-zinc-950",
    mobileLink: "text-zinc-200 hover:bg-zinc-900 hover:text-white",
    fallbackCta: "bg-zinc-800 hover:bg-zinc-700 focus:ring-zinc-200",
  },
} as const;

export function Navbar({ data, tone = "light" }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isArtist, links: navLinks, whatsappHref: waLink } = data;
  const t = TONES[tone];

  const ctaButtonText = isArtist ? "Contratar" : waLink ? "WhatsApp" : "Contáctanos";
  const hasContactSection = navLinks.some((l) => l.href === "#contacto");

  return (
    <header className={`sticky top-0 z-40 w-full border-b backdrop-blur transition-all ${t.header}`}>
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logotipo / Nombre */}
        <a href="#inicio" className="flex min-w-0 items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-offset-2">
          {data.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.logoUrl} alt={data.businessName} className="h-10 w-auto object-contain" />
          ) : (
            <div className="flex min-w-0 flex-col">
              <span className={`truncate text-xl font-bold tracking-tight sm:text-2xl ${t.name}`}>{data.businessName}</span>
              <span className={`text-xs font-medium line-clamp-1 ${t.tagline}`}>{data.tagline}</span>
            </div>
          )}
        </a>

        {/* Enlaces Desktop */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Navegación principal">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors focus:outline-none focus:underline ${t.link}`}
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* CTA Desktop */}
        <div className="hidden md:flex items-center gap-4">
          {waLink ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              style={isArtist ? { backgroundColor: data.primaryColor, color: readableTextColor(data.primaryColor) } : undefined}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                !isArtist ? "bg-emerald-700 hover:bg-emerald-800" : ""
              }`}
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span>{ctaButtonText}</span>
            </a>
          ) : hasContactSection ? (
            <a
              href="#contacto"
              className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${t.fallbackCta}`}
            >
              {ctaButtonText}
            </a>
          ) : null}
        </div>

        {/* Botón menú móvil */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`inline-flex items-center justify-center rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-inset ${t.menuButton}`}
            aria-expanded={mobileMenuOpen}
            aria-controls="menu-movil"
            aria-label={mobileMenuOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Menú móvil desplegable */}
      {mobileMenuOpen && (
        <div id="menu-movil" className={`md:hidden border-b px-4 pt-3 pb-6 ${t.mobilePanel}`}>
          <div className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-md px-3 py-2 text-base font-medium ${t.mobileLink}`}
              >
                {link.name}
              </a>
            ))}
            <div className="pt-2">
              {waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-800"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  <span>{ctaButtonText}</span>
                </a>
              ) : hasContactSection ? (
                <a
                  href="#contacto"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex w-full items-center justify-center rounded-lg py-3 text-base font-semibold text-white ${t.fallbackCta}`}
                >
                  {ctaButtonText}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
