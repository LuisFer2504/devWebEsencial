/**
 * Regresión I-1 / I-2 (auditoría del PR #8): la navegación se calcula una sola vez en el servidor
 * (fecha del build) y la Navbar —componente de cliente— solo pinta los datos recibidos. Así el HTML
 * estático y la hidratación en el navegador del visitante coinciden aunque un evento ya haya pasado.
 * Todas las fechas son explícitas: ningún test depende del día en que se ejecuta.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import type { ClientConfig } from "../src/types/client";
import { loadClientConfig } from "../src/config/client-loader";
import { Navbar } from "../src/components/shared/Navbar";
import { ProfessionalTheme } from "../src/components/variants/ProfessionalTheme";
import { CommerceTheme } from "../src/components/variants/CommerceTheme";
import { BeautyTheme } from "../src/components/variants/BeautyTheme";
import { ArtistTheme } from "../src/components/variants/ArtistTheme";
import { getNavbarData, getNavLinks } from "../src/utils/navigation";

const THEMES = { professional: ProfessionalTheme, commerce: CommerceTheme, beauty: BeautyTheme, artist: ArtistTheme } as const;
const allIds = fs
  .readdirSync(path.resolve("clients"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.slice(0, -5));

// demo-artist: eventos el 20 Marzo 2027 y el 17 Abril 2027.
const ANTES = new Date(2027, 0, 1, 12);
const ENTRE = new Date(2027, 3, 1, 12); // pasó el primero, no el segundo
const DESPUES = new Date(2027, 4, 1, 12); // fecha simulada por la auditoría

/** Renderiza como en el build, con el reloj fijado en `at`. */
function renderAt(config: ClientConfig, at: Date): string {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at);
  try {
    const Theme = THEMES[config.variant];
    return renderToStaticMarkup(<Theme config={config} />);
  } finally {
    vi.useRealTimers();
  }
}

const hrefsIn = (html: string, re: RegExp) => [...(html.match(re)?.[0] ?? "").matchAll(/href="(#[^"]*)"/g)].map((m) => m[1]);
const headerNav = (html: string) => hrefsIn(html, /<nav[^>]*aria-label="Navegación principal"[\s\S]*?<\/nav>/);
const footerNav = (html: string) => hrefsIn(html, /<nav[^>]*aria-label="Enlaces del pie de página"[\s\S]*?<\/nav>/);
const hasSection = (html: string, id: string) => html.includes(`id="${id}"`);

afterEach(() => {
  vi.useRealTimers();
});

describe("Navbar: recibe datos ya calculados y no depende del reloj del navegador", () => {
  it("con los mismos datos, la Navbar renderiza exactamente lo mismo en cualquier fecha (servidor = navegador)", () => {
    const artist = loadClientConfig("demo-artist");
    // Datos calculados en el "build" (antes de los eventos)...
    const data = getNavbarData(artist, getNavLinks(artist, ANTES));
    const servidor = (() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(ANTES);
      return renderToStaticMarkup(<Navbar data={data} tone="dark" />);
    })();
    vi.useRealTimers();
    // ...y "hidratados" por un visitante después de los eventos (caso de la auditoría: 1 de mayo de 2027).
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(DESPUES);
    const navegador = renderToStaticMarkup(<Navbar data={data} tone="dark" />);
    expect(navegador).toBe(servidor);
    expect(headerNav(navegador)).toContain("#fechas");
  });

  it("los datos de la Navbar son serializables (props de un componente de cliente) y contienen solo lo necesario", () => {
    for (const id of allIds) {
      const config = loadClientConfig(id);
      const data = getNavbarData(config, getNavLinks(config, ANTES));
      expect(JSON.parse(JSON.stringify(data))).toEqual(data);
      expect(Object.keys(data).sort()).toEqual(
        ["businessName", "isArtist", "links", "primaryColor", "tagline", "whatsappHref", ...(config.logoUrl ? ["logoUrl"] : [])].sort()
      );
    }
  });

  it("la Navbar ya no importa la lógica de fechas ni de visibilidad", () => {
    const source = fs.readFileSync(path.resolve("src/components/shared/Navbar.tsx"), "utf8");
    expect(source).not.toMatch(/getNavLinks|visibleEvents|isUpcomingEvent|new Date|@\/utils\/dates/);
  });
});

describe("Eventos: sección, Navbar y Footer siempre coherentes", () => {
  const artist = loadClientConfig("demo-artist");

  it("antes de los eventos: sección #fechas, enlace en la Navbar y en el Footer", () => {
    const html = renderAt(artist, ANTES);
    expect(hasSection(html, "fechas")).toBe(true);
    expect(headerNav(html)).toContain("#fechas");
    expect(footerNav(html)).toContain("#fechas");
    expect(html).toContain("Noche acústica de piano");
    expect(html).toContain("Clásicos al piano");
  });

  it("entre eventos: solo se muestra el futuro y la navegación lo sigue enlazando", () => {
    const html = renderAt(artist, ENTRE);
    expect(html).not.toContain("Noche acústica de piano");
    expect(html).toContain("Clásicos al piano");
    expect(hasSection(html, "fechas")).toBe(true);
    expect(headerNav(html)).toContain("#fechas");
    expect(footerNav(html)).toContain("#fechas");
  });

  it("después de los eventos (1 de mayo de 2027): ni sección ni enlaces", () => {
    const html = renderAt(artist, DESPUES);
    expect(hasSection(html, "fechas")).toBe(false);
    expect(headerNav(html)).not.toContain("#fechas");
    expect(footerNav(html)).not.toContain("#fechas");
  });

  it("un evento sin fecha interpretable se sigue mostrando en cualquier fecha", () => {
    const sinAño = { ...artist, events: [{ ...artist.events![0], date: "Próximamente" }] };
    const html = renderAt(sinAño, new Date(2035, 0, 1));
    expect(hasSection(html, "fechas")).toBe(true);
    expect(headerNav(html)).toContain("#fechas");
    expect(footerNav(html)).toContain("#fechas");
  });

  it.each([ANTES, ENTRE, DESPUES])("en %s cada enlace de la navegación apunta a una sección renderizada", (at) => {
    const html = renderAt(artist, at);
    for (const href of [...headerNav(html), ...footerNav(html)]) expect(hasSection(html, href.slice(1)), href).toBe(true);
  });
});

describe("Las cuatro variantes y los clientes sin eventos no cambian", () => {
  it.each(allIds)("%s: Navbar y Footer muestran los mismos enlaces y todos existen", (id) => {
    const html = renderAt(loadClientConfig(id), ANTES);
    const header = headerNav(html);
    expect(header.length).toBeGreaterThan(1);
    expect(footerNav(html)).toEqual(header);
    for (const href of header) expect(hasSection(html, href.slice(1)), href).toBe(true);
  });

  it.each(allIds.filter((id) => !loadClientConfig(id).events?.length))("%s (sin eventos): la navegación no depende de la fecha", (id) => {
    const config = loadClientConfig(id);
    expect(getNavLinks(config, new Date(2020, 0, 1))).toEqual(getNavLinks(config, new Date(2040, 0, 1)));
    // (El HTML completo no se compara: el pie muestra el año del copyright, que sí debe cambiar.)
    const a = renderAt(config, new Date(2020, 0, 1));
    const b = renderAt(config, new Date(2040, 0, 1));
    const sections = (html: string) => [...html.matchAll(/<section[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(headerNav(b)).toEqual(headerNav(a));
    expect(footerNav(b)).toEqual(footerNav(a));
    expect(sections(b)).toEqual(sections(a));
  });

  it("consultoria-proyectos conserva su navegación y su WhatsApp en la Navbar", () => {
    const config = loadClientConfig("consultoria-proyectos");
    const html = renderAt(config, ANTES);
    expect(headerNav(html)).toEqual(["#inicio", "#nosotros", "#servicios", "#ventajas", "#contacto"]);
    const data = getNavbarData(config, getNavLinks(config));
    expect(data.whatsappHref).toMatch(/^https:\/\/wa\.me\/51\d+\?text=/);
    expect(renderToStaticMarkup(<Navbar data={data} />)).toContain(`href="${data.whatsappHref!.replace(/&/g, "&amp;")}"`);
  });
});
