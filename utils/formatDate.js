/**
 * Форматирует timestamp в короткую дату для списков.
 */
export function formatShortDate(timestamp) {
  const d = new Date(timestamp);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
