/**
 * Modelo del formulario del editor local (sin DOM). Se usa en el navegador (window.FormModel)
 * y en los tests (require). Herramienta interna: no se importa desde src/.
 *
 * Principio: el JSON cargado es la fuente de verdad. El formulario solo modifica los campos que
 * muestra; todo lo demás (campos sin control en el editor, ids, flags, campos futuros) se conserva.
 *  - Un campo opcional vaciado en el formulario se elimina.
 *  - Nunca se añaden claves que el original no tenía (salvo que el usuario las rellene).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FormModel = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" };

  /** Escapa texto para insertarlo en HTML o en atributos entre comillas. */
  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value).replace(/[&<>"'`]/g, (c) => HTML_ESCAPES[c]);
  }

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  /** Texto recortado o undefined si está vacío. */
  function clean(value) {
    if (value === undefined || value === null) return undefined;
    const s = String(value).trim();
    return s === "" ? undefined : s;
  }

  function setOrDelete(obj, key, value) {
    if (value === undefined) delete obj[key];
    else obj[key] = value;
  }

  /** Lista con contenido; si queda vacía, se conserva vacía solo si el original ya existía. */
  function listOrAbsent(list, previous) {
    if (list.length > 0) return list;
    return previous === undefined ? undefined : [];
  }

  function splitCsv(text) {
    return String(text || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /** Un elemento por línea (para textos que pueden contener comas). */
  function splitLines(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /**
   * Listas de objetos editables. `fields`: campo del modelo → clase CSS del input.
   * `content`: campos que, si están todos vacíos, indican un elemento "en blanco" (se descarta al guardar).
   * `lines`: campos que son arrays editados como texto, un elemento por línea.
   * `idPrefix`: prefijo para generar un id si el elemento no lo tiene.
   */
  const LISTS = {
    services: {
      fields: { id: "srv-id", title: "srv-title", description: "srv-desc", price: "srv-price", duration: "srv-duration", badge: "srv-badge" },
      content: ["title", "description", "price", "duration", "badge"],
      idPrefix: "servicio",
      lowercaseId: true,
    },
    packages: {
      fields: { id: "pkg-id", title: "pkg-title", description: "pkg-desc", price: "pkg-price", currency: "pkg-curr", duration: "pkg-dur", features: "pkg-feat" },
      content: ["title", "description", "price", "currency", "duration"],
      lines: ["features"],
      idPrefix: "paquete",
      lowercaseId: true,
    },
    videos: {
      fields: { title: "vid-title", url: "vid-url", description: "vid-desc" },
      content: ["title", "url", "description"],
      idPrefix: "vid",
    },
    gallery: {
      fields: { url: "gal-url", alt: "gal-alt", caption: "gal-cap" },
      content: ["url", "caption"],
      idPrefix: "img",
    },
    events: {
      fields: { title: "ev-title", date: "ev-date", venue: "ev-venue", city: "ev-city", time: "ev-time", ticketUrl: "ev-ticket" },
      content: ["title", "date", "venue", "city", "time", "ticketUrl"],
      idPrefix: "ev",
    },
    advantages: {
      fields: { title: "adv-title", description: "adv-desc" },
      content: ["title", "description"],
    },
  };

  const SOCIAL_KEYS = ["spotify", "youtube", "instagram", "tiktok", "facebook", "appleMusic", "soundcloud", "linkedin"];
  const TITLE_KEYS = ["servicesTitle", "advantagesTitle", "contactTitle", "videosTitle"];
  const VISIBILITY_KEYS = ["about", "services", "packages", "videos", "gallery", "events", "advantages", "schedule", "contact"];

  /** Valores que muestran los inputs de un elemento de lista. */
  function valuesFromItem(item, listKey) {
    const spec = LISTS[listKey];
    const values = {};
    for (const field of Object.keys(spec.fields)) {
      const v = item ? item[field] : undefined;
      values[field] = spec.lines && spec.lines.includes(field) ? (Array.isArray(v) ? v.join("\n") : "") : v === undefined || v === null ? "" : String(v);
    }
    return values;
  }

  /** Aplica los valores de los inputs sobre el elemento original, conservando sus demás campos. */
  function mergeListItem(previous, values, listKey) {
    const spec = LISTS[listKey];
    const item = Object.assign({}, previous || {});
    for (const field of Object.keys(spec.fields)) {
      if (!(field in values)) continue;
      if (spec.lines && spec.lines.includes(field)) {
        const parts = splitLines(values[field]);
        setOrDelete(item, field, parts.length ? parts : undefined);
        continue;
      }
      let v = clean(values[field]);
      if (field === "id" && v !== undefined && spec.lowercaseId) v = v.toLowerCase();
      if (field === "id" && v === undefined && previous && previous.id !== undefined) continue; // no perder un id
      setOrDelete(item, field, v);
    }
    return item;
  }

  function isBlankItem(item, listKey) {
    const spec = LISTS[listKey];
    return spec.content.every((field) => clean(item[field]) === undefined);
  }

  /** Elementos listos para guardar: descarta los totalmente vacíos y asegura un id único. */
  function finalizeList(items, listKey) {
    const spec = LISTS[listKey];
    const result = (items || []).filter((it) => !isBlankItem(it, listKey)).map((it) => Object.assign({}, it));
    if (spec.idPrefix) {
      const used = new Set(result.map((it) => it.id).filter(Boolean));
      let n = 1;
      for (const it of result) {
        if (it.id) continue;
        while (used.has(`${spec.idPrefix}-${n}`)) n++;
        it.id = `${spec.idPrefix}-${n}`;
        used.add(it.id);
      }
    }
    return result;
  }

  /** ¿Los destacados se guardan como logros del artista o como highlights de "Nosotros"? */
  function highlightsTarget(config) {
    return config && config.variant === "artist" ? "artistProfile.achievements" : "about.highlights";
  }

  function getHighlights(config) {
    const about = (config && config.about) || {};
    const profile = (config && config.artistProfile) || {};
    const list = highlightsTarget(config) === "artistProfile.achievements" ? profile.achievements || about.highlights : about.highlights;
    return Array.isArray(list) ? list.slice() : [];
  }

  /** Valores de los campos simples del formulario para una configuración. */
  function formFromConfig(config) {
    const c = config || {};
    const s = (v) => (v === undefined || v === null ? "" : String(v));
    const hero = c.hero || {};
    const about = c.about || {};
    const profile = c.artistProfile || {};
    const contact = c.contact || {};
    const social = contact.socialLinks || {};
    const titles = c.sectionTitles || {};
    const vis = c.sectionVisibility || {};
    const seo = c.seo || {};
    return {
      id: s(c.id),
      businessName: s(c.businessName),
      tagline: s(c.tagline),
      logoUrl: s(c.logoUrl),
      variant: s(c.variant),
      primaryColor: s(c.colors && c.colors.primary),
      primaryHoverColor: s(c.colors && c.colors.primaryHover),
      heroBadge: s(hero.badge),
      heroTitle: s(hero.title),
      heroDesc: s(hero.description),
      heroImage: s(hero.heroImage),
      heroCtaText: s(hero.ctaPrimary && hero.ctaPrimary.text),
      heroCtaLink: s(hero.ctaPrimary && hero.ctaPrimary.link),
      heroCtaSecText: s(hero.ctaSecondary && hero.ctaSecondary.text),
      heroCtaSecLink: s(hero.ctaSecondary && hero.ctaSecondary.link),
      aboutTitle: s(about.title),
      aboutDesc: s(about.description),
      artGenre: s(profile.genre),
      artZone: s(profile.bookingZone),
      artPortrait: s(profile.portraitImage),
      artQuote: s(profile.quote),
      contactWa: s(contact.whatsapp),
      contactWaMsg: s(contact.whatsappDefaultMessage),
      contactPhone: s(contact.phone),
      contactEmail: s(contact.email),
      contactAddress: s(contact.address),
      contactCity: s(contact.city),
      social: Object.fromEntries(SOCIAL_KEYS.map((k) => [k, s(social[k])])),
      titles: Object.fromEntries(TITLE_KEYS.map((k) => [k, s(titles[k])])),
      visibility: Object.fromEntries(VISIBILITY_KEYS.map((k) => [k, vis[k] !== false])),
      seoTitle: s(seo.title),
      seoDesc: s(seo.description),
      seoKeywords: Array.isArray(seo.keywords) ? seo.keywords.join(", ") : "",
    };
  }

  /**
   * Construye la configuración a guardar a partir del original (`base`, con las listas ya
   * sincronizadas desde el DOM) y de los valores del formulario. No modifica `base`.
   */
  function buildConfig(base, form, drafts) {
    const src = base || {};
    const f = form || {};
    const d = drafts || {};
    const out = clone(src) || {};

    out.id = String(f.id || "").trim().toLowerCase();
    out.businessName = String(f.businessName || "").trim();
    out.tagline = String(f.tagline || "").trim();
    setOrDelete(out, "logoUrl", clean(f.logoUrl));
    out.variant = clean(f.variant) || src.variant;

    // Colores: se conservan accent, neutralBg y cualquier otro.
    out.colors = Object.assign({}, src.colors);
    out.colors.primary = clean(f.primaryColor) || (src.colors && src.colors.primary) || "";
    setOrDelete(out.colors, "primaryHover", clean(f.primaryHoverColor));

    // Portada
    const hero = Object.assign({}, src.hero);
    hero.title = String(f.heroTitle || "").trim();
    hero.description = String(f.heroDesc || "").trim();
    setOrDelete(hero, "badge", clean(f.heroBadge));
    setOrDelete(hero, "heroImage", clean(f.heroImage));
    hero.ctaPrimary = Object.assign({}, src.hero && src.hero.ctaPrimary, {
      text: String(f.heroCtaText || "").trim(),
      link: String(f.heroCtaLink || "").trim(),
    });
    const secText = clean(f.heroCtaSecText);
    if (secText !== undefined || clean(f.heroCtaSecLink) !== undefined) {
      hero.ctaSecondary = Object.assign({}, src.hero && src.hero.ctaSecondary, {
        text: secText || "",
        link: String(f.heroCtaSecLink || "").trim(),
      });
    } else {
      delete hero.ctaSecondary;
    }
    out.hero = hero;

    // Nosotros / destacados (aboutImage y demás se conservan)
    const about = Object.assign({}, src.about);
    about.title = String(f.aboutTitle || "").trim();
    about.description = String(f.aboutDesc || "").trim();
    const highlights = (d.highlights || getHighlights(src)).map((h) => String(h).trim()).filter(Boolean);
    const target = highlightsTarget(Object.assign({}, src, { variant: out.variant }));
    if (target === "about.highlights") setOrDelete(about, "highlights", listOrAbsent(highlights, src.about && src.about.highlights));
    out.about = about;

    // Perfil de artista: solo si la variante es artist o ya existía (no se inyecta en otras variantes).
    const profile = Object.assign({}, src.artistProfile);
    setOrDelete(profile, "genre", clean(f.artGenre));
    setOrDelete(profile, "bookingZone", clean(f.artZone));
    setOrDelete(profile, "portraitImage", clean(f.artPortrait));
    setOrDelete(profile, "quote", clean(f.artQuote));
    if (target === "artistProfile.achievements") {
      setOrDelete(profile, "achievements", listOrAbsent(highlights, src.artistProfile && src.artistProfile.achievements));
    }
    if (Object.keys(profile).length > 0 || src.artistProfile !== undefined) out.artistProfile = profile;
    else delete out.artistProfile;

    // Listas (cada elemento conserva sus campos: ids, icon, visible, platform, ctaText…)
    for (const key of Object.keys(LISTS)) {
      if (src[key] === undefined) {
        const finalized = finalizeList([], key);
        setOrDelete(out, key, listOrAbsent(finalized, undefined));
        continue;
      }
      setOrDelete(out, key, listOrAbsent(finalizeList(src[key], key), src[key]));
    }

    // Contacto (googleMapsUrl y demás se conservan)
    const contact = Object.assign({}, src.contact);
    setOrDelete(contact, "whatsapp", clean(f.contactWa));
    setOrDelete(contact, "whatsappDefaultMessage", clean(f.contactWaMsg));
    setOrDelete(contact, "phone", clean(f.contactPhone));
    setOrDelete(contact, "email", clean(f.contactEmail));
    setOrDelete(contact, "address", clean(f.contactAddress));
    setOrDelete(contact, "city", clean(f.contactCity));
    const schedule = (d.schedule || (src.contact && src.contact.schedule) || []).map((x) => String(x).trim()).filter(Boolean);
    setOrDelete(contact, "schedule", listOrAbsent(schedule, src.contact && src.contact.schedule));
    const social = Object.assign({}, src.contact && src.contact.socialLinks);
    for (const k of SOCIAL_KEYS) setOrDelete(social, k, clean(f.social && f.social[k]));
    if (Object.keys(social).length > 0 || (src.contact && src.contact.socialLinks !== undefined && Object.keys(src.contact.socialLinks).length === 0)) {
      contact.socialLinks = social;
    } else {
      delete contact.socialLinks;
    }
    out.contact = contact;

    // Títulos: se editan 4; los demás se conservan.
    const titles = Object.assign({}, src.sectionTitles);
    for (const k of TITLE_KEYS) setOrDelete(titles, k, clean(f.titles && f.titles[k]));
    if (Object.keys(titles).length > 0 || src.sectionTitles !== undefined) out.sectionTitles = titles;
    else delete out.sectionTitles;

    // Visibilidad: no se añade si el original no la tenía y todo sigue visible.
    const vis = Object.assign({}, src.sectionVisibility);
    let anyHidden = false;
    for (const k of VISIBILITY_KEYS) {
      const visible = !f.visibility || f.visibility[k] !== false;
      vis[k] = visible;
      if (!visible) anyHidden = true;
    }
    if (src.sectionVisibility !== undefined || anyHidden) out.sectionVisibility = vis;
    else delete out.sectionVisibility;

    // SEO (ogImage y demás se conservan)
    const seo = Object.assign({}, src.seo);
    seo.title = String(f.seoTitle || "").trim();
    seo.description = String(f.seoDesc || "").trim();
    setOrDelete(seo, "keywords", listOrAbsent(splitCsv(f.seoKeywords), src.seo && src.seo.keywords));
    out.seo = seo;

    return out;
  }

  return {
    LISTS,
    escapeHtml,
    clone,
    valuesFromItem,
    mergeListItem,
    finalizeList,
    isBlankItem,
    getHighlights,
    highlightsTarget,
    formFromConfig,
    buildConfig,
  };
});
