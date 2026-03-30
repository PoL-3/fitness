const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return EMAIL_RE.test(String(email || '').trim());
}

export function validateRequired(value, fieldName) {
  if (value == null || String(value).trim() === '') {
    return `${fieldName} обязательно`;
  }
  return null;
}

/** Положительное число или null если пустая строка (опциональное поле) */
export function parseOptionalPositiveNumber(str, fieldName, max = 1e6) {
  const s = String(str ?? '').trim();
  if (s === '') {
    return { ok: true, value: null };
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0 || n > max) {
    return { ok: false, error: `${fieldName}: введите положительное число` };
  }
  return { ok: true, value: n };
}

export function parseRequiredPositiveNumber(str, fieldName, max = 1e6) {
  const s = String(str ?? '').trim();
  if (s === '') {
    return { ok: false, error: `${fieldName} обязательно` };
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0 || n > max) {
    return { ok: false, error: `${fieldName}: некорректное число` };
  }
  return { ok: true, value: n };
}
