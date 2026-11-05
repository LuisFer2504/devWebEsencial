import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { ClientConfigSchema } from "../src/schemas/client.schema";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FormModel = require("../tools/generator/form-model.js");

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const clientsDir = path.resolve("clients");
const clientFiles = fs.readdirSync(clientsDir).filter((f) => f.endsWith(".json"));
const readClient = (file: string): Json => JSON.parse(fs.readFileSync(path.join(clientsDir, file), "utf8"));

/** Simula el editor: carga → inputs → (opcional) ediciones → guardar. */
function roundTrip(config: Json, edit?: (form: Json, base: Json, drafts: Json) => void): Json {
  const base = FormModel.clone(config);
  // Las listas se sincronizan desde los inputs, que muestran valuesFromItem(item).
  for (const key of Object.keys(FormModel.LISTS)) {
    if (Array.isArray(base[key])) {
      base[key] = base[key].map((item: Json) => FormModel.mergeListItem(item, FormModel.valuesFromItem(item, key), key));
    }
  }
  const form = FormModel.formFromConfig(config);
  const drafts = { highlights: FormModel.getHighlights(config), schedule: (config.contact?.schedule ?? []).slice() };
  edit?.(form, base, drafts);
  return FormModel.buildConfig(base, form, drafts);
}

/** Lo que realmente se guarda: el resultado validado por Zod (igual que el servidor). */
const saved = (config: Json) => {
  const r = ClientConfigSchema.safeParse(config);
  if (!r.success) throw new Error(JSON.stringify(r.error.issues, null, 2));
  return r.data;
};

describe("Editor: cargar y guardar sin cambios conserva TODOS los datos", () => {
  it.each(clientFiles)("%s", (file) => {
    const original = readClient(file);
    const result = roundTrip(original);
    // Sin diferencias ni siquiera antes de Zod: no se pierde ni se añade nada.
    expect(result).toEqual(original);
    expect(saved(result)).toEqual(saved(original));
  });

  it("conserva campos que el formulario no muestra (accent, googleMapsUrl, ogImage, títulos, trustBadges, ctaText, bio, ids, platform)", () => {
    const beauty = readClient("demo-beauty.json");
    const artist = readClient("demo-artist.json");
    const commerce = readClient("demo-commerce.json");
    const b = roundTrip({ ...beauty, seo: { ...beauty.seo, ogImage: "https://ejemplo.pe/og.jpg" }, sectionTitles: { aboutSubtitle: "Esencia", galleryTitle: "X" } });
    expect(b.colors.accent).toBe(beauty.colors.accent);
    expect(b.colors.neutralBg).toBe(beauty.colors.neutralBg);
    expect(b.contact.googleMapsUrl).toBe(beauty.contact.googleMapsUrl);
    expect(b.seo.ogImage).toBe("https://ejemplo.pe/og.jpg");
    expect(b.sectionTitles).toEqual({ aboutSubtitle: "Esencia", galleryTitle: "X" });
    expect(b.artistProfile).toBeUndefined();

    const a = roundTrip(artist);
    expect(a.artistProfile.bio).toBe(artist.artistProfile.bio);
    expect(a.artistProfile.stageName).toBe(artist.artistProfile.stageName);
    expect(a.artistProfile.achievements).toEqual(artist.artistProfile.achievements);
    expect(a.about.highlights).toBeUndefined();
    expect(a.packages.map((p: Json) => p.ctaText)).toEqual(artist.packages.map((p: Json) => p.ctaText));
    expect(a.events.map((e: Json) => e.description)).toEqual(artist.events.map((e: Json) => e.description));
    expect(a.videos.map((v: Json) => [v.id, v.platform])).toEqual(artist.videos.map((v: Json) => [v.id, v.platform]));
    expect(a.gallery.map((g: Json) => g.id)).toEqual(artist.gallery.map((g: Json) => g.id));

    expect(roundTrip(commerce).trustBadges).toEqual(commerce.trustBadges);
  });

  it("conserva campos futuros desconocidos dentro de objetos y elementos de lista", () => {
    const pro = readClient("demo-professional.json");
    const withExtra = {
      ...pro,
      hero: { ...pro.hero, ctaPrimary: { ...pro.hero.ctaPrimary, tracking: "hero" } },
      services: pro.services.map((s: Json, i: number) => ({ ...s, icon: `icono-${i}` })),
      advantages: pro.advantages.map((a: Json) => ({ ...a, icon: "shield" })),
    };
    const r = roundTrip(withExtra);
    expect(r.hero.ctaPrimary.tracking).toBe("hero");
    expect(r.services.map((s: Json) => s.icon)).toEqual(withExtra.services.map((s: Json) => s.icon));
    expect(r.advantages.every((a: Json) => a.icon === "shield")).toBe(true);
  });
});

describe("Editor: ediciones", () => {
  it("cambiar un campo solo cambia ese campo", () => {
    const original = readClient("demo-commerce.json");
    const r = roundTrip(original, (form) => {
      form.contactWa = "+51 900 000 000";
    });
    expect(r.contact.whatsapp).toBe("+51 900 000 000");
    expect({ ...r, contact: { ...r.contact, whatsapp: original.contact.whatsapp } }).toEqual(original);
  });

  it("vaciar un campo opcional lo elimina; vaciar uno obligatorio produce un error de validación", () => {
    const original = readClient("demo-beauty.json");
    const r = roundTrip(original, (form) => {
      form.heroBadge = "";
      form.social.tiktok = "";
    });
    expect(r.hero.badge).toBeUndefined();
    expect(r.contact.socialLinks.tiktok).toBeUndefined();
    expect(r.contact.socialLinks.instagram).toBe(original.contact.socialLinks.instagram);

    const bad = roundTrip(original, (form) => {
      form.heroTitle = "";
    });
    expect(ClientConfigSchema.safeParse(bad).success).toBe(false);
  });

  it("conserva textos con comillas, <, > y &", () => {
    const original = readClient("demo-professional.json");
    const tricky = `Asesoría "integral" <rápida> & 'segura'`;
    const r = roundTrip(original, (form, base) => {
      form.tagline = tricky;
      base.services[0] = FormModel.mergeListItem(base.services[0], { title: tricky }, "services");
    });
    expect(r.tagline).toBe(tricky);
    expect(r.services[0].title).toBe(tricky);
  });

  it("descarta solo elementos totalmente vacíos y genera ids únicos", () => {
    const original = readClient("demo-artist.json");
    const r = roundTrip(original, (_form, base) => {
      base.events.push({ id: "", title: "", date: "", venue: "", city: "", visible: true });
      base.videos.push({ title: "Nuevo", url: "https://youtu.be/aaaaaaaaaaa" });
    });
    expect(r.events).toHaveLength(original.events.length);
    expect(r.videos.at(-1).id).toMatch(/^vid-\d+$/);
    expect(new Set(r.videos.map((v: Json) => v.id)).size).toBe(r.videos.length);
  });

  it("un elemento incompleto no desaparece: lo detecta la validación", () => {
    const original = readClient("demo-professional.json");
    const r = roundTrip(original, (_form, base) => {
      base.services.push({ id: "nuevo", title: "Servicio sin descripción", description: "" });
    });
    expect(r.services.at(-1).title).toBe("Servicio sin descripción");
    const v = ClientConfigSchema.safeParse(r);
    expect(v.success).toBe(false);
  });

  it("no inyecta artistProfile ni listas de artista en otras variantes", () => {
    const pro = readClient("demo-professional.json");
    const r = roundTrip(pro);
    expect(r.artistProfile).toBeUndefined();
    for (const key of ["packages", "videos", "gallery", "events"]) expect(r[key]).toBeUndefined();
    expect(r.sectionVisibility).toEqual(pro.sectionVisibility);
  });

  it("ocultar una sección crea sectionVisibility solo cuando hace falta", () => {
    const pro = { ...readClient("demo-professional.json") };
    delete pro.sectionVisibility;
    expect(roundTrip(pro).sectionVisibility).toBeUndefined();
    const hidden = roundTrip(pro, (form) => {
      form.visibility.advantages = false;
    });
    expect(hidden.sectionVisibility.advantages).toBe(false);
    expect(hidden.sectionVisibility.services).toBe(true);
  });
});

describe("escapeHtml", () => {
  it("neutraliza caracteres especiales", () => {
    expect(FormModel.escapeHtml(`"><img src=x onerror=alert(1)>&'\``)).toBe("&quot;&gt;&lt;img src=x onerror=alert(1)&gt;&amp;&#39;&#96;");
    expect(FormModel.escapeHtml(undefined)).toBe("");
  });
});

describe("Editor: mensajes de validación de listas", () => {
  it("un campo obligatorio vacío se envía como texto vacío para que Zod use el mensaje en español", () => {
    const original = readClient("demo-professional.json");
    const r = roundTrip(original, (_form, base) => {
      base.services.push(FormModel.mergeListItem({ id: "nuevo" }, { title: "Servicio sin descripción", description: "" }, "services"));
    });
    expect(r.services.at(-1).description).toBe("");
    const v = ClientConfigSchema.safeParse(r);
    expect(v.success).toBe(false);
    if (!v.success) {
      const issue = v.error.issues.find((i) => i.path.join(".") === `services.${r.services.length - 1}.description`);
      expect(issue?.message).toBe("La descripción del servicio debe tener al menos 5 caracteres");
    }
  });

  it("los opcionales vaciados sí se eliminan", () => {
    const item = FormModel.mergeListItem({ id: "x", title: "T", description: "Descripción", price: "S/ 10" }, { price: "" }, "services");
    expect("price" in item).toBe(false);
  });
});
