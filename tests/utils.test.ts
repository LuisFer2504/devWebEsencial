import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildWhatsAppLink, normalizeWhatsAppNumber } from "../src/utils/whatsapp";
import { getEventDateParts } from "../src/utils/dates";
import { getEmbedVideoUrl, getVideoThumbnailUrl } from "../src/utils/media";
import { getNavLinks } from "../src/utils/navigation";
import { loadClientConfig } from "../src/config/client-loader";
import { ClientConfigSchema } from "../src/schemas/client.schema";

describe("WhatsApp", () => {
  it.each([
    ["+51 987 654 321", "51987654321"],
    ["+51987654321", "51987654321"],
    ["0051 987 654 321", "51987654321"],
    ["987 654 321", "51987654321"],
    ["987-654-321", "51987654321"],
    ["51987654321", "51987654321"],
    ["+1 305 555 0100", "13055550100"],
  ])("normaliza %s → %s", (input, expected) => {
    expect(normalizeWhatsAppNumber(input)).toBe(expected);
  });

  it("devuelve null sin número", () => {
    expect(normalizeWhatsAppNumber(undefined)).toBeNull();
    expect(normalizeWhatsAppNumber("   ")).toBeNull();
    expect(buildWhatsAppLink("")).toBeNull();
  });

  it("un número local peruano nunca genera un enlace a otro país", () => {
    expect(buildWhatsAppLink("987 654 321")).toBe("https://wa.me/51987654321");
  });

  it("codifica el mensaje", () => {
    expect(buildWhatsAppLink("+51987654321", "Hola, ¿precio?")).toBe(
      "https://wa.me/51987654321?text=Hola%2C%20%C2%BFprecio%3F"
    );
  });

  it("todos los clientes generan enlaces con código de país", () => {
    for (const file of fs.readdirSync(path.resolve("clients")).filter((f) => f.endsWith(".json"))) {
      const config = loadClientConfig(file.replace(/\.json$/, ""));
      if (!config.contact.whatsapp) continue;
      const link = buildWhatsAppLink(config.contact.whatsapp)!;
      expect(link, file).toMatch(/^https:\/\/wa\.me\/\d{10,15}$/);
    }
  });
});

describe("Fechas de eventos", () => {
  it.each([
    ["14 Noviembre 2026", { day: "14", month: "NOV" }],
    ["Sábado 5 de diciembre", { day: "5", month: "DIC" }],
    ["2026-11-28", { day: "28", month: "NOV" }],
    ["03/09/2026", { day: "3", month: "SEP" }],
    ["1 Setiembre", { day: "1", month: "SEP" }],
    ["Marzo 2027", { month: "MAR" }],
  ])("%s", (input, expected) => {
    expect(getEventDateParts(input)).toEqual(expected);
  });

  it("devuelve vacío si no puede interpretar la fecha", () => {
    expect(getEventDateParts("Próximamente")).toEqual({});
    expect(getEventDateParts("2026-13-40")).toEqual({});
    expect(getEventDateParts(undefined)).toEqual({});
  });
});

describe("Videos", () => {
  it("convierte URLs de YouTube y Vimeo", () => {
    expect(getEmbedVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(getEmbedVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(getEmbedVideoUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(getEmbedVideoUrl("https://vimeo.com/76979871")).toBe("https://player.vimeo.com/video/76979871");
    expect(getEmbedVideoUrl("https://open.spotify.com/track/x")).toBeNull();
  });

  it("obtiene miniatura solo para YouTube", () => {
    expect(getVideoThumbnailUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    expect(getVideoThumbnailUrl("https://vimeo.com/76979871")).toBeNull();
  });
});

describe("Navegación", () => {
  it("cada enlace apunta a una sección con contenido", () => {
    const pro = loadClientConfig("demo-professional");
    expect(getNavLinks(pro).map((l) => l.href)).toEqual(["#inicio", "#nosotros", "#servicios", "#ventajas", "#contacto"]);
    const artist = loadClientConfig("demo-artist");
    expect(getNavLinks(artist).map((l) => l.href)).toEqual(["#inicio", "#biografia", "#galeria", "#fechas", "#paquetes", "#contacto"]);
  });

  it("omite secciones ocultas o vacías", () => {
    const pro = loadClientConfig("demo-professional");
    const hidden = { ...pro, advantages: [], sectionVisibility: { ...ClientConfigSchema.shape.sectionVisibility.unwrap().parse({}), services: false } };
    expect(getNavLinks(hidden).map((l) => l.href)).toEqual(["#inicio", "#nosotros", "#contacto"]);
  });
});

describe("Clientes", () => {
  it("todos los archivos de clients/ cumplen el esquema", () => {
    const files = fs.readdirSync(path.resolve("clients")).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(() => loadClientConfig(file.replace(/\.json$/, "")), file).not.toThrow();
    }
  });

  it("trustBadges es opcional y valida los iconos", () => {
    const base = loadClientConfig("demo-professional");
    expect(base.trustBadges).toBeUndefined();
    const commerce = loadClientConfig("demo-commerce");
    expect(commerce.trustBadges?.length).toBe(4);
    const bad = ClientConfigSchema.safeParse({ ...commerce, trustBadges: [{ title: "Envíos", icon: "cohete" }] });
    expect(bad.success).toBe(false);
  });
});

describe("Contraste del color de marca", () => {
  it("calcula la relación WCAG", async () => {
    const { contrastRatio } = await import("../src/utils/color");
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#ffffff", "#ea580c")).toBeCloseTo(3.56, 1);
  });

  it("usa texto blanco cuando es legible y oscuro cuando no", async () => {
    const { readableTextColor, contrastRatio } = await import("../src/utils/color");
    expect(readableTextColor("#172554")).toBe("#ffffff");
    expect(readableTextColor("#be185d")).toBe("#ffffff");
    expect(readableTextColor("#ea580c")).toBe("#111827");
    expect(readableTextColor("#fbbf24")).toBe("#111827");
    for (const file of fs.readdirSync(path.resolve("clients")).filter((f) => f.endsWith(".json"))) {
      const { colors } = loadClientConfig(file.replace(/\.json$/, ""));
      expect(contrastRatio(readableTextColor(colors.primary), colors.primary), file).toBeGreaterThanOrEqual(4.5);
    }
  });
});
