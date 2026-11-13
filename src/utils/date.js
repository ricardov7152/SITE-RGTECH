/**
 * Retorna a data no formato YYYY-MM-DD usando o fuso horário LOCAL do navegador.
 * Evita o bug de `toISOString()` (UTC), que em Mato Grosso (UTC-4) "pula" para
 * o dia seguinte depois das 20h.
 */
export function localDateISO(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
