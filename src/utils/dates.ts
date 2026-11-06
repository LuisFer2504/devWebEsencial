const MONTHS: Array<[RegExp, string]> = [
  [/^ene/, "ENE"],
  [/^feb/, "FEB"],
  [/^mar/, "MAR"],
  [/^abr/, "ABR"],
  [/^may/, "MAY"],
  [/^jun/, "JUN"],
  [/^jul/, "JUL"],
  [/^ago/, "AGO"],
  [/^(sep|set)/, "SEP"],
  [/^oct/, "OCT"],
  [/^nov/, "NOV"],
  [/^dic/, "DIC"],
];
const MONTH_BY_NUMBER = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

export interface EventDateParts {
  day?: string;
  month?: string;
}

/**
 * Extrae día y mes abreviado de la fecha (texto libre) de un evento, para el recuadro del calendario.
 * Acepta "2026-11-14", "14/11/2026", "14 Noviembre 2026", "Sábado 14 de nov." …
 * Devuelve {} si no puede interpretarla (el componente muestra entonces un icono).
 */
export function getEventDateParts(date?: string): EventDateParts {
  if (!date) return {};
  const text = date.trim().toLowerCase();

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (iso) return fromNumbers(iso[3], iso[2]);

  const numeric = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-]\d{2,4})?$/.exec(text);
  if (numeric) return fromNumbers(numeric[1], numeric[2]);

  const words = text.normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter(Boolean);
  let month: string | undefined;
  for (const w of words) {
    if (/^\d/.test(w)) continue;
    const hit = MONTHS.find(([re]) => re.test(w));
    if (hit) {
      month = hit[1];
      break;
    }
  }
  const dayWord = words.find((w) => /^\d{1,2}$/.test(w) && Number(w) >= 1 && Number(w) <= 31);
  const result: EventDateParts = {};
  if (month) result.month = month;
  if (dayWord) result.day = String(Number(dayWord));
  return result;
}

/**
 * Fecha completa (día, mes y año) de un evento, o null si el texto no incluye año o no se puede
 * interpretar. Acepta "2027-03-20", "20/03/2027" y "20 Marzo 2027".
 */
export function parseEventDate(date?: string): Date | null {
  if (!date) return null;
  const text = date.trim().toLowerCase();
  let y: number | undefined;
  let m: number | undefined;
  let d: number | undefined;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  const numeric = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (numeric) [d, m, y] = [Number(numeric[1]), Number(numeric[2]), Number(numeric[3])];
  else {
    const parts = getEventDateParts(date);
    const yearWord = /\b(20\d{2})\b/.exec(text);
    if (!parts.month || !parts.day || !yearWord) return null;
    [d, m, y] = [Number(parts.day), MONTH_BY_NUMBER.indexOf(parts.month) + 1, Number(yearWord[1])];
  }
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return new Date(y, m - 1, d, 23, 59, 59);
}

/**
 * ¿Debe mostrarse el evento? Se oculta solo si su fecha (con año) ya pasó respecto a `now`
 * (la fecha del build, en un sitio estático). Sin año reconocible se muestra.
 */
export function isUpcomingEvent(date: string | undefined, now: Date = new Date()): boolean {
  const parsed = parseEventDate(date);
  return parsed === null || parsed.getTime() >= now.getTime();
}

function fromNumbers(day: string, month: string): EventDateParts {
  const d = Number(day);
  const m = Number(month);
  if (d < 1 || d > 31 || m < 1 || m > 12) return {};
  return { day: String(d), month: MONTH_BY_NUMBER[m - 1] };
}
