"use client";

import { useState } from "react";
import type { ClientConfig } from "@/types/client";
import { buildWhatsAppLink } from "@/utils/whatsapp";
import { Menu, X, MessageCircle } from "lucide-react";

interface NavbarProps {
  config: ClientConfig;
}

export function Navbar({ config }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isArtist = config.variant === "artist";
  const vis = config.sectionVisibility;

  // Generar enlaces de navegación dinámicos según variante y visibilidad real
  const navLinks: { name: string; href: string }[] = [{ name: "Inicio", href: "#inicio" }];

  if (isArtist) {
    if (vis?.about !== false) navLinks.push({ name: "Biografía", href: "#biografia" });
    if (vis?.videos !== false && config.videos && config.videos.length > 0) {
      navLinks.push({ name: "Música & Videos", href: "#musica" });
    }
    if (vis?.gallery !== false && config.gallery && config.gallery.length > 0) {
      navLinks.push({ name: "Galería", href: "#galeria" });
    }
    if (vis?.events !== false && config.events && config.events.length > 0) {
      navLinks.push({ name: "Presentaciones", href: "#fechas" });
    }
    if (vis?.packages !== false && config.packages && config.packages.length > 0) {
      navLinks.push({ name: "Contratación", href: "#paquetes" });
    }
  } else {
    if (vis?.about !== false) navLinks.push({ name: "Nosotros", href: "#nosotros" });
    if (vis?.services !== false && config.services && config.services.length > 0) {
      navLinks.push({ name: "Servicios", href: "#servicios" });
    }
    if (vis?.advantages !== false && config.advantages && config.advantages.length > 0) {
      navLinks.push({ name: "Ventajas", href: "#ventajas" });
    }
  }

  if (vis?.contact !== false) {
    navLinks.push({ name: isArtist ? "Contacto" : "Contacto", href: "#contacto" });
  }

  const waLink = buildWhatsAppLink(
    config.contact.whatsapp,
    config.contact.whatsappDefaultMessage
  );

  const ctaButtonText = isArtist ? "Contratar" : (waLink ? "WhatsApp" : "Contáctanos");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur transition-all">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logotipo / Nombre */}
        <a href="#inicio" className="flex items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-offset-2">
          {config.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={config.logoUrl}
              alt={config.businessName}
              className="h-10 w-auto object-contain"
            />
          ) : (
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {config.businessName}
              </span>
              <span className="text-xs font-medium text-slate-500 line-clamp-1">
                {config.tagline}
              </span>
            </div>
          )}
        </a>

        {/* Enlaces Desktop */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Navegación principal">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 focus:outline-none focus:underline"
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
              style={{ backgroundColor: isArtist ? config.colors.primary : undefined }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                !isArtist ? "bg-emerald-600 hover:bg-emerald-700" : ""
              }`}
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span>{ctaButtonText}</span>
            </a>
          ) : (
            <a
              href="#contacto"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              {ctaButtonText}
            </a>
          )}
        </div>

        {/* Botón menú móvil */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-900"
            aria-expanded={mobileMenuOpen}
            aria-label="Abrir menú de navegación"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Menú móvil desplegable */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6">
          <div className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950"
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
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  <span>{ctaButtonText}</span>
                </a>
              ) : (
                <a
                  href="#contacto"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center rounded-lg bg-slate-900 py-3 text-base font-semibold text-white hover:bg-slate-800"
                >
                  {ctaButtonText}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
