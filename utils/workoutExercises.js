/**
 * Упражнения хранятся в конце поля notes тренировки (синхронизация с сервером сохраняет notes целиком).
 * Пользовательский текст — до маркера; после маркера — JSON массива упражнений.
 */
const EX_MARKER = '\n__FITNESS_EX__\n';
const BODY_WEIGHT_MARKER = '\n__FITNESS_BODY_W__\n';

/**
 * @param {string|null|undefined} notes
 * @returns {string}
 */
export function stripEmbeddedExercisesFromNotes(notes) {
  if (!notes || typeof notes !== 'string') {
    return '';
  }
  const idx = notes.indexOf(EX_MARKER);
  if (idx === -1) {
    return notes.trim();
  }
  return notes.slice(0, idx).trimEnd();
}

function stripEmbeddedBodyWeightFromNotes(notes) {
  if (!notes || typeof notes !== 'string') {
    return '';
  }
  const idx = notes.indexOf(BODY_WEIGHT_MARKER);
  if (idx === -1) {
    return notes.trimEnd();
  }
  // Удаляем только маркер + его payload, но НЕ трогаем хвост (там может быть `__FITNESS_EX__`).
  const rest = notes.slice(idx + BODY_WEIGHT_MARKER.length);
  const braceEnd = rest.indexOf('}');
  if (braceEnd === -1) {
    return notes.slice(0, idx).trimEnd();
  }
  const endGlobal = idx + BODY_WEIGHT_MARKER.length + braceEnd + 1;
  const before = notes.slice(0, idx).trimEnd();
  const after = notes.slice(endGlobal);
  return (before + after).trimEnd();
}

/**
 * @param {string|null|undefined} notes
 * @returns {number|null}
 */
export function extractBodyWeightKgFromNotes(notes) {
  if (!notes || typeof notes !== 'string') {
    return null;
  }
  const idx = notes.indexOf(BODY_WEIGHT_MARKER);
  if (idx === -1) {
    return null;
  }
  const rest = notes.slice(idx + BODY_WEIGHT_MARKER.length).trim();
  // В notes после BODY_WEIGHT_MARKER идёт JSON объекта, а затем может быть ещё `__FITNESS_EX__...`.
  // Поэтому парсим только участок до первого `}`.
  const braceEnd = rest.indexOf('}');
  const maybeObjStr = braceEnd >= 0 ? rest.slice(0, braceEnd + 1) : rest;

  try {
    const parsed = JSON.parse(maybeObjStr);
    if (parsed && Number.isFinite(Number(parsed.weightKg))) {
      return Number(parsed.weightKg);
    }
  } catch {
    // Не объект: пробуем число до перевода строки/следующего маркера.
    const firstLine = rest.split('\n')[0].trim();
    const n = Number(firstLine);
    if (Number.isFinite(n)) {
      return n;
    }
  }

  return null;
}

/**
 * @param {string|null|undefined} userNotes
 * @param {number|null|undefined} weightKg
 * @returns {string}
 */
export function embedBodyWeightInNotes(userNotes, weightKg) {
  const base = stripEmbeddedBodyWeightFromNotes(userNotes || '');
  if (weightKg == null || !Number.isFinite(Number(weightKg))) {
    return base;
  }
  const w = Number(weightKg);
  return (base.length ? base : '') + BODY_WEIGHT_MARKER + JSON.stringify({ weightKg: w });
}

/**
 * @param {string|null|undefined} userNotes
 * @param {Array<{ name: string, weightKg?: number, reps?: number, durationSec?: number, sets?: number, setsData?: Array<{ weightKg?: number, reps?: number, durationSec?: number }> }>} exercises
 * @returns {string|null}
 */
export function embedExercisesInNotes(userNotes, exercises) {
  const base = stripEmbeddedExercisesFromNotes(userNotes || '');
  if (!exercises?.length) {
    return base.length ? base : null;
  }
  return (base.length ? base : '') + EX_MARKER + JSON.stringify(exercises);
}

/**
 * @param {string|null|undefined} notes
 * @returns {{ userNotes: string, exercises: Array<{ name: string, weightKg?: number, reps?: number, durationSec?: number, sets?: number, setsData?: Array<{ weightKg?: number, reps?: number, durationSec?: number }> }> }}
 */
export function splitNotesAndExercises(notes) {
  if (!notes || typeof notes !== 'string') {
    return { userNotes: '', bodyWeightKg: null, exercises: [] };
  }
  const bodyWeightKg = extractBodyWeightKgFromNotes(notes);

  const notesNoBody = stripEmbeddedBodyWeightFromNotes(notes);
  const idx = notesNoBody.indexOf(EX_MARKER);
  if (idx === -1) {
    return { userNotes: notesNoBody.trim(), bodyWeightKg, exercises: [] };
  }
  const userNotes = notesNoBody.slice(0, idx).trimEnd();
  const jsonPart = notesNoBody.slice(idx + EX_MARKER.length);
  try {
    const arr = JSON.parse(jsonPart);
    return {
      userNotes,
      bodyWeightKg,
      exercises: Array.isArray(arr) ? arr : [],
    };
  } catch {
    return { userNotes: notesNoBody.trim(), bodyWeightKg, exercises: [] };
  }
}

function pluralRu(n, one, few, many) {
  const x = Math.abs(Number(n));
  if (x === 1) return one;
  if (x >= 2 && x <= 4) return few;
  return many;
}

/**
 * @param {{ name: string, weightKg?: number, reps?: number, durationSec?: number, sets?: number }} ex
 */
export function formatExerciseForDisplay(ex) {
  const name = String(ex?.name || '').trim();
  if (!name) return '';

  if (Array.isArray(ex.setsData) && ex.setsData.length > 0) {
    const lines = ex.setsData
      .map((s, idx) => {
        const parts = [];
        if (s.weightKg != null && Number.isFinite(Number(s.weightKg))) parts.push(`${s.weightKg}кг`);
        if (s.reps != null && Number.isFinite(Number(s.reps))) parts.push(`${s.reps}повт`);
        if (s.durationSec != null && Number.isFinite(Number(s.durationSec))) parts.push(`${s.durationSec}с`);
        return parts.length ? `${idx + 1}) ${parts.join(' · ')}` : '';
      })
      .filter(Boolean);
    return `${name}${lines.length ? `\n${lines.join('\n')}` : ''}`;
  }

  const parts = [name];
  if (ex.weightKg != null && Number.isFinite(Number(ex.weightKg))) {
    parts.push(`${ex.weightKg}кг`);
  }
  if (ex.reps != null && Number.isFinite(Number(ex.reps))) {
    parts.push(`${ex.reps}повт`);
  }
  if (ex.durationSec != null && Number.isFinite(Number(ex.durationSec))) {
    parts.push(`${ex.durationSec}с`);
  }
  if (ex.sets != null && Number.isFinite(Number(ex.sets))) {
    const word = pluralRu(ex.sets, 'подход', 'подхода', 'подходов');
    parts.push(`${ex.sets} ${word}`);
  }

  // Пример: "Присед 110кг 5повт 3 подхода"
  return parts.join(' · ');
}

/**
 * @param {Array<{ name: string, weightKg?: number, reps?: number, durationSec?: number, sets?: number }>} exercises
 */
export function formatExercisesForDisplay(exercises) {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    return '';
  }
  const lines = exercises
    .map((ex) => formatExerciseForDisplay(ex))
    .filter(Boolean);
  return lines.join('\n');
}

/**
 * Приводит упражнение к форме с setsData[].
 */
export function normalizeExercise(ex) {
  if (!ex || typeof ex !== 'object') {
    return { name: '', setsData: [] };
  }
  const name = String(ex.name || '').trim();
  if (Array.isArray(ex.setsData)) {
    return { ...ex, name, setsData: ex.setsData };
  }
  const count = Number(ex.sets) > 0 ? Math.round(Number(ex.sets)) : 1;
  const oneSet = {
    weightKg: ex.weightKg != null ? Number(ex.weightKg) : undefined,
    reps: ex.reps != null ? Number(ex.reps) : undefined,
    durationSec: ex.durationSec != null ? Number(ex.durationSec) : undefined,
  };
  const setsData = Array.from({ length: count }, () => ({ ...oneSet }));
  return { ...ex, name, setsData };
}
