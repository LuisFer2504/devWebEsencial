const DARK_TEXT = "#111827";
const LIGHT_TEXT = "#ffffff";

function toRgb(hex: string): [number, number, number] | null {
  const h = hex.trim().replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

/** Luminancia relativa (WCAG 2.1). */
function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Relación de contraste WCAG entre dos colores hex (1–21). */
export function contrastRatio(a: string, b: string): number {
  const ra = toRgb(a);
  const rb = toRgb(b);
  if (!ra || !rb) return 1;
  const [l1, l2] = [luminance(ra), luminance(rb)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * Color de texto legible sobre un fondo del color de marca del cliente.
 * Prefiere blanco; usa texto oscuro solo si el blanco no alcanza el contraste mínimo AA (4,5:1).
 */
export function readableTextColor(background: string): string {
  if (contrastRatio(LIGHT_TEXT, background) >= 4.5) return LIGHT_TEXT;
  return contrastRatio(DARK_TEXT, background) > contrastRatio(LIGHT_TEXT, background) ? DARK_TEXT : LIGHT_TEXT;
}
