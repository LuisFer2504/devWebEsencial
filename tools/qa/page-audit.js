async () => {
  /* Auditoría de un sitio Web Esencial para evaluate_script (Chrome DevTools MCP).
     Sin comentarios de línea: el texto puede pasarse en una sola línea. */
  for (let y = 0; y < document.body.scrollHeight; y += 500) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  await new Promise((r) => setTimeout(r, 1200));
  window.scrollTo(0, 0);
  const vw = document.documentElement.clientWidth;
  const problems = [];
  const out = { url: location.href, viewport: vw };

  if (document.documentElement.scrollWidth > vw + 1) problems.push(`desborde horizontal: ${document.documentElement.scrollWidth}px > ${vw}px`);

  const ids = new Set([...document.querySelectorAll("[id]")].map((e) => e.id));
  const broken = [...new Set([...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute("href")).filter((h) => h.length > 1 && !ids.has(h.slice(1))))];
  if (broken.length) problems.push(`anclas rotas: ${broken.join(", ")}`);

  const wa = [...document.querySelectorAll('a[href*="wa.me"]')].map((a) => a.href);
  const numbers = [...new Set(wa.map((h) => (h.match(/wa\.me\/(\d+)/) || [])[1]))];
  out.whatsapp = { links: wa.length, numbers };
  numbers.filter((n) => !n || n.length < 10).forEach((n) => problems.push(`número de WhatsApp sin código de país: ${n}`));

  const imgs = [...document.images].map((i) => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0, w: Math.round(i.getBoundingClientRect().width), h: Math.round(i.getBoundingClientRect().height) }));
  out.images = imgs.length;
  imgs.filter((i) => !i.ok).forEach((i) => problems.push(`imagen rota: ${i.src.slice(0, 90)}`));
  imgs.filter((i) => i.ok && i.w > 40 && i.h > 0 && i.h < 40).forEach((i) => problems.push(`imagen aplastada ${i.w}x${i.h}: ${i.src.slice(0, 60)}`));

  const h1 = document.querySelectorAll("h1").length;
  if (h1 !== 1) problems.push(`hay ${h1} h1 (debe haber 1)`);

  const fixed = [...document.querySelectorAll("body *")].filter((e) => getComputedStyle(e).position === "fixed" && e.getBoundingClientRect().height > 0 && getComputedStyle(e).display !== "none");
  for (let a = 0; a < fixed.length; a++)
    for (let b = a + 1; b < fixed.length; b++) {
      if (fixed[a].contains(fixed[b]) || fixed[b].contains(fixed[a])) continue;
      const r1 = fixed[a].getBoundingClientRect();
      const r2 = fixed[b].getBoundingClientRect();
      if (r1.left < r2.right && r2.left < r1.right && r1.top < r2.bottom && r2.top < r1.bottom) problems.push(`elementos fijos superpuestos: ${fixed[a].tagName} y ${fixed[b].tagName}`);
    }

  const ctas = [...document.querySelectorAll('a[href*="wa.me"], a[href^="tel:"]')].filter((a) => a.getBoundingClientRect().width > 0);
  ctas.filter((a) => { const r = a.getBoundingClientRect(); return r.height < 24 || r.width < 24; }).forEach((a) => problems.push(`botón de contacto muy pequeño: "${(a.innerText || a.getAttribute("aria-label") || "").trim().slice(0, 30)}"`));

  const iframes = [...document.querySelectorAll("iframe")].map((f) => f.src);
  out.iframesOnLoad = iframes.length;

  out.title = document.title;
  out.description = document.querySelector('meta[name="description"]')?.content || null;
  if (!out.description) problems.push("falta meta description");

  out.problems = problems;
  out.ok = problems.length === 0;
  return out;
}
