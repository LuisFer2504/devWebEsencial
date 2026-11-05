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

function fromNumbers(day: string, month: string): EventDateParts {
  const d = Number(day);
  const m = Number(month);
  if (d < 1 || d > 31 || m < 1 || m > 12) return {};
  return { day: String(d), month: MONTH_BY_NUMBER[m - 1] };
}
