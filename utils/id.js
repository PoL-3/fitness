/**
 * Простой уникальный id для элементов списка.
 * Позже при сохранении в БД id может приходить с сервера.
 */
export function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
