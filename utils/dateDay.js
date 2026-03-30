/**
 * Календарный день в локальной таймзоне: YYYY-MM-DD (для группировки и фильтра).
 */

export function toDayKey(timestamp) {
  const d = new Date(Number(timestamp));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayDayKey() {
  return toDayKey(Date.now());
}

/** Читаемый вид: 25.03.2026 */
export function formatDayRu(dayKey) {
  if (!dayKey || !/^\d{4}-\d{2}-\d{2}$/.test(String(dayKey))) {
    return '';
  }
  const [y, m, d] = String(dayKey).split('-');
  return `${d}.${m}.${y}`;
}

export function isValidDayKey(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || '').trim())) {
    return false;
  }
  const t = Date.parse(`${s}T12:00:00`);
  return !Number.isNaN(t);
}

/** Уникальные дни из записей с полем date, новые сверху */
export function uniqueSortedDayKeys(items) {
  const set = new Set();
  for (const it of items) {
    if (it?.date) {
      set.add(it.date);
    }
  }
  return [...set].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}
