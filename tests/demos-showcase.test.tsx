import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { ClientConfigSchema, DemoBannerSchema, FaqSchema, ShowcaseSchema } from "../src/schemas/client.schema";
import type { ClientConfig } from "../src/types/client";
import { loadClientConfig } from "../src/config/client-loader";
import { Showcase } from "../src/components/shared/Showcase";
import { DemoBanner } from "../src/components/shared/DemoBanner";
import { Faq } from "../src/components/shared/Faq";
import { ProfessionalTheme } from "../src/components/variants/ProfessionalTheme";
import { CommerceTheme } from "../src/components/variants/CommerceTheme";
import { BeautyTheme } from "../src/components/variants/BeautyTheme";
import { ArtistTheme } from "../src/components/variants/ArtistTheme";
import { getNavLinks, contactFallbackHref } from "../src/utils/navigation";
import { itemWhatsAppMessage, resolveCtaHref } from "../src/utils/whatsapp";
import { isUpcomingEvent, parseEventDate } from "../src/utils/dates";

const clientsDir = path.resolve("clients");
const allIds = fs.readdirSync(clientsDir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
const demoIds = allIds.filter((id) => id.startsWith("demo-"));
const raw = (id: string) => JSON.parse(fs.readFileSync(path.join(clientsDir, `${id}.json`), "utf8"));

const THEMES = { professional: ProfessionalTheme, commerce: CommerceTheme, beauty: BeautyTheme, artist: ArtistTheme } as const;
/** Lo que se publica: aviso de demo (layout) + variante. */
const renderSite = (config: ClientConfig) => {
  const Theme = THEMES[config.variant];
  return renderToStaticMarkup(
    <>
      <DemoBanner banner={config.demoBanner} />
      <Theme config={config} />
    </>
  );
};
const withWhatsapp = (config: ClientConfig): ClientConfig => ({ ...config, contact: { ...config.contact, whatsapp: "+51 900 000 000" } });

// Los temas evalúan la fecha del "build" al renderizar (eventos pasados): se fija el reloj para que
// estos tests no dependan del día en que se ejecutan. Solo se simula Date, no los temporizadores.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 6, 12, 0, 0));
});
afterAll(() => {
  vi.useRealTimers();
});

const showcaseItem = { title: "Professional", description: "Para servicios profesionales", tags: ["Estudios"] };

describe("Esquema: showcase, demoBanner y faq", () => {
  it("acepta configuraciones válidas", () => {
    expect(ShowcaseSchema.safeParse({ items: [showcaseItem] }).success).toBe(true);
    expect(ShowcaseSchema.safeParse({ items: [{ ...showcaseItem, url: "https://demo.ejemplo.pe", image: "/client-assets/a.webp" }] }).success).toBe(true);
    expect(DemoBannerSchema.safeParse({ message: "Esto es una demostración", templateName: "Commerce" }).success).toBe(true);
    expect(FaqSchema.safeParse({ items: [{ question: "¿Pregunta?", answer: "Respuesta suficiente" }] }).success).toBe(true);
  });

  it.each([
    ["sin elementos", { items: [] }],
    ["URL javascript:", { items: [{ ...showcaseItem, url: "javascript:alert(1)" }] }],
    ["URL relativa como enlace", { items: [{ ...showcaseItem, url: "/demo" }] }],
    ["imagen http", { items: [{ ...showcaseItem, image: "http://ejemplo.pe/a.jpg" }] }],
    ["imagen data:", { items: [{ ...showcaseItem, image: "data:image/png;base64,AAAA" }] }],
    ["más de 6 etiquetas", { items: [{ ...showcaseItem, tags: ["a", "b", "c", "d", "e", "f", "g"] }] }],
  ])("rechaza showcase %s", (_name, value) => {
    expect(ShowcaseSchema.safeParse(value).success).toBe(false);
  });

  it("rechaza demoBanner y faq incompletos o con URL insegura", () => {
    expect(DemoBannerSchema.safeParse({ message: "Esto es una demostración" }).success).toBe(false);
    expect(DemoBannerSchema.safeParse({ message: "Esto es una demostración", templateName: "Artist", url: "javascript:x" }).success).toBe(false);
    expect(FaqSchema.safeParse({ items: [] }).success).toBe(false);
  });

  it("son opcionales: los clientes sin ellos siguen siendo válidos", () => {
    const c = loadClientConfig("consultoria-proyectos");
    expect(c.showcase).toBeUndefined();
    expect(c.demoBanner).toBeUndefined();
    expect(c.faq).toBeUndefined();
  });
});

describe("Componente Showcase", () => {
  it("no renderiza nada sin configuración", () => {
    expect(renderToStaticMarkup(<Showcase />)).toBe("");
  });

  it("renderiza tarjetas accesibles; con URL hay enlace y sin URL un texto, nunca un enlace roto", () => {
    const html = renderToStaticMarkup(
      <Showcase
        showcase={{
          title: "Plantillas",
          pendingLinkText: "Demostración en preparación",
          items: [
            { ...showcaseItem, image: "https://images.unsplash.com/x.jpg", imageAlt: "Escritorio", url: "https://demo.ejemplo.pe/" },
            { title: "Commerce", description: "Para tiendas y talleres" },
          ],
        }}
      />
    );
    expect(html).toContain('id="plantillas"');
    expect(html).toContain('aria-labelledby="plantillas-titulo"');
    expect(html.match(/<article/g)).toHaveLength(2);
    expect(html).toContain('href="https://demo.ejemplo.pe/"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("se abre en una pestaña nueva");
    expect(html).toContain('alt="Escritorio"');
    expect(html).toContain('loading="lazy"');
    expect(html.match(/href=/g)).toHaveLength(1);
    expect(html).toContain("Demostración en preparación");
  });
});

describe("Componentes DemoBanner y Faq", () => {
  it("DemoBanner inactivo no renderiza nada; activo muestra el aviso y el enlace solo si hay URL", () => {
    expect(renderToStaticMarkup(<DemoBanner />)).toBe("");
    const sinUrl = renderToStaticMarkup(<DemoBanner banner={{ message: "Estás viendo una demostración", templateName: "Beauty" }} />);
    expect(sinUrl).toContain('aria-label="Aviso de demostración"');
    expect(sinUrl).toContain("Estás viendo una demostración");
    expect(sinUrl).not.toContain("href=");
    const conUrl = renderToStaticMarkup(
      <DemoBanner banner={{ message: "Estás viendo una demostración", templateName: "Beauty", url: "https://webesencial.example/", linkText: "Conócenos" }} />
    );
    expect(conUrl).toContain('href="https://webesencial.example/"');
    expect(conUrl).toContain("Conócenos");
  });

  it("Faq usa details/summary y no renderiza nada vacío", () => {
    expect(renderToStaticMarkup(<Faq />)).toBe("");
    const html = renderToStaticMarkup(<Faq faq={{ items: [{ question: "¿Pregunta uno?", answer: "Respuesta número uno" }, { question: "¿Pregunta dos?", answer: "Respuesta número dos" }] }} />);
    expect(html.match(/<details/g)).toHaveLength(2);
    expect(html.match(/<summary/g)).toHaveLength(2);
    expect(html).toContain('id="preguntas"');
  });
});

describe("Utilidades de contacto en demos", () => {
  const demo = { contact: { whatsappDefaultMessage: "Hola Web Esencial, estoy viendo la demo Commerce." }, demoBanner: { templateName: "Commerce" } };

  it("fuera de una demo, el mensaje por elemento no cambia", () => {
    expect(itemWhatsAppMessage({ contact: {} }, "Hola Negocio, consulto X", "X")).toBe("Hola Negocio, consulto X");
  });

  it("en una demo, el mensaje identifica la plantilla y el elemento consultado", () => {
    expect(itemWhatsAppMessage(demo, "Hola Ferretería, consulto Cemento", "Cemento")).toBe(
      'Hola Web Esencial, estoy viendo la demo Commerce. (En la demo vi: "Cemento")'
    );
    expect(itemWhatsAppMessage({ contact: {}, demoBanner: { templateName: "Artist" } }, "x")).toMatch(/plantilla Artist/);
  });

  it('el CTA "whatsapp" no genera enlaces sin número', () => {
    expect(resolveCtaHref("whatsapp", { contact: {} })).toBeNull();
    expect(resolveCtaHref("whatsapp", { contact: { whatsapp: "987 654 321", whatsappDefaultMessage: "Hola" } })).toBe("https://wa.me/51987654321?text=Hola");
    expect(resolveCtaHref("#plantillas", { contact: {} })).toBe("#plantillas");
  });

  it("el respaldo a #contacto solo existe si hay teléfono o correo visibles", () => {
    const base = loadClientConfig("demo-commerce");
    expect(contactFallbackHref(base)).toBeNull();
    expect(contactFallbackHref({ ...base, contact: { ...base.contact, phone: "01 234 5678" } })).toBe("#contacto");
    expect(
      contactFallbackHref({ ...base, contact: { ...base.contact, phone: "01 234 5678" }, sectionVisibility: { ...ClientConfigSchema.shape.sectionVisibility.unwrap().parse({}), contact: false } })
    ).toBeNull();
  });
});

describe("Eventos pasados", () => {
  const now = new Date(2026, 10, 5);
  it("interpreta fechas con año", () => {
    expect(parseEventDate("20 Marzo 2027")?.getFullYear()).toBe(2027);
    expect(parseEventDate("2026-11-14")?.getMonth()).toBe(10);
    expect(parseEventDate("14/11/2026")?.getDate()).toBe(14);
    expect(parseEventDate("Sábado 14 de noviembre")).toBeNull();
  });
  it("oculta los eventos pasados y muestra los futuros o sin año", () => {
    expect(isUpcomingEvent("1 Octubre 2026", now)).toBe(false);
    expect(isUpcomingEvent("5 Noviembre 2026", now)).toBe(true);
    expect(isUpcomingEvent("20 Marzo 2027", now)).toBe(true);
    expect(isUpcomingEvent("Próximamente", now)).toBe(true);
  });
});

describe("Demos ficticios y seguros", () => {
  it("existen los cuatro demos", () => {
    expect(demoIds.sort()).toEqual(["demo-artist", "demo-beauty", "demo-commerce", "demo-professional"]);
  });

  it.each(demoIds)("%s: sin contactos, redes ni videos de terceros, e identificado como demo", (id) => {
    const c = raw(id);
    const config = loadClientConfig(id);
    expect(c.contact.phone).toBeUndefined();
    expect(c.contact.email).toBeUndefined();
    expect(c.contact.address).toBeUndefined();
    expect(c.contact.googleMapsUrl).toBeUndefined();
    expect(c.contact.socialLinks).toBeUndefined();
    expect(c.videos).toBeUndefined();
    expect(config.demoBanner?.templateName.toLowerCase()).toBe(config.variant);
    expect(c.contact.whatsappDefaultMessage).toContain(`plantilla ${config.demoBanner?.templateName}`);
    const text = JSON.stringify(c);
    expect(text).not.toMatch(/@|\+51|tyler|kealey|youtube|cemento sol|pavco|indeco|bosch|dewalt|yape|plin|alva &|aura studio|el maestro/i);
    for (const url of text.match(/https?:\/\/[^"]+/g) ?? []) expect(url, url).toMatch(/^https:\/\/images\.unsplash\.com\//);
  });

  it("los eventos de demo tienen año, para que los pasados se oculten solos", () => {
    for (const e of raw("demo-artist").events ?? []) expect(parseEventDate(e.date), e.date).not.toBeNull();
  });

  it("el WhatsApp comercial es el mismo en demos y página comercial, o aún no está definido en ninguno", () => {
    const numbers = new Set([...demoIds, "web-esencial"].map((id) => raw(id).contact.whatsapp ?? null));
    expect(numbers.size).toBe(1);
  });
});

describe("Página comercial web-esencial", () => {
  const config = loadClientConfig("web-esencial");

  it("usa la variante professional, el catálogo de 4 plantillas y no es una demo", () => {
    expect(config.variant).toBe("professional");
    expect(config.demoBanner).toBeUndefined();
    expect(config.showcase?.items.map((i) => i.title)).toEqual(["Professional", "Commerce", "Beauty", "Artist"]);
    expect(config.faq?.items.length).toBeGreaterThanOrEqual(4);
  });

  it("no inventa precios ni dominios de demos", () => {
    expect(config.services.every((s) => s.price === undefined)).toBe(true);
    expect(config.showcase?.items.every((i) => i.url === undefined)).toBe(true);
  });

  it("enlaza las secciones nuevas en la navegación", () => {
    const hrefs = getNavLinks(config).map((l) => l.href);
    expect(hrefs).toEqual(expect.arrayContaining(["#plantillas", "#preguntas"]));
  });

  it("sin número no muestra el CTA de cotización; con número lo convierte en chat", () => {
    expect(renderSite(config)).not.toContain("wa.me");
    expect(renderSite(withWhatsapp(config))).toContain("https://wa.me/51900000000?text=Hola%20Web%20Esencial");
  });
});

describe("Sitios renderizados: enlaces siempre válidos", () => {
  const cases = allIds.flatMap((id) => [
    [id, "sin WhatsApp", (c: ClientConfig) => ({ ...c, contact: { ...c.contact, whatsapp: undefined } })],
    [id, "con WhatsApp", withWhatsapp],
    [id, "tal cual", (c: ClientConfig) => c],
  ] as const);

  it.each(cases)("%s (%s): cada ancla apunta a una sección existente y no hay href literales inválidos", (id, _label, transform) => {
    const html = renderSite(transform(loadClientConfig(id)));
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    const anchors = [...html.matchAll(/href="#([^"]*)"/g)].map((m) => m[1]);
    for (const a of anchors) expect(ids.has(a), `#${a} en ${id}`).toBe(true);
    expect(html).not.toMatch(/href="whatsapp"/i);
    expect(html).not.toMatch(/href="(javascript|data):/i);
  });

  it("en las demos con número, todos los enlaces de WhatsApp identifican la plantilla", () => {
    for (const id of demoIds) {
      const config = withWhatsapp(loadClientConfig(id));
      const html = renderSite(config);
      const messages = [...html.matchAll(/href="https:\/\/wa\.me\/\d+\?text=([^"]+)"/g)].map((m) => decodeURIComponent(m[1].replace(/&amp;/g, "&")));
      expect(messages.length, id).toBeGreaterThan(0);
      for (const msg of messages) expect(msg, `${id}: ${msg}`).toContain(`plantilla ${config.demoBanner?.templateName}`);
    }
  });

  it("los clientes que no usan las nuevas opciones no las muestran", () => {
    const html = renderSite(loadClientConfig("consultoria-proyectos"));
    expect(html).not.toContain('id="plantillas"');
    expect(html).not.toContain('id="preguntas"');
    expect(html).not.toContain("Aviso de demostración");
  });
});
