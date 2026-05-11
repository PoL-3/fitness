/**
 * @typedef {Object} WorkoutTask
 * @property {string} id
 * @property {string} title
 * @property {number|null} sets
 * @property {number|null} reps
 * @property {number|null} weightKg
 * @property {number|null} durationMin
 * @property {string} displayLine
 */

/**
 * @typedef {Object} NutritionTask
 * @property {number|null} calories
 * @property {number|null} proteinG
 * @property {number|null} fatG
 * @property {number|null} carbsG
 * @property {number|null} mealsCount
 */

/**
 * @typedef {Object} DailyTask
 * @property {'workout'|'nutrition'} kind
 * @property {string} id
 * @property {string} label
 * @property {WorkoutTask|null} [workout]
 * @property {NutritionTask|null} [nutrition]
 */

/**
 * @typedef {Object} DailyPlan
 * @property {string} date
 * @property {number} planDayOffset
 * @property {string|null} dailyLabel
 * @property {WorkoutTask[]} workouts
 * @property {NutritionTask} nutrition
 * @property {number|null} workoutSessionMin
 */

import { diffCalendarDays, isValidDayKey, toDayKey } from '@/utils/dateDay';

const NUM = String.raw`-?\d+(?:[.,]\d+)?`;

/** Стабильный id плана для ключа AsyncStorage */
export function getPlanStableKey(lastAiPlan) {
  if (!lastAiPlan) {
    return null;
  }
  const pid = lastAiPlan.planId;
  if (pid != null && String(pid).trim() !== '') {
    return `p:${String(pid)}`;
  }
  const at = Number(lastAiPlan.savedAt) || 0;
  return `t:${at}`;
}

/** @param {{ day_index?: number, label?: string, tasks?: string[], workout_exercises?: unknown[], workout_duration_min?: number, nutrition?: unknown }[]} dailyTasksRaw */
export function normalizeDailyTasks(dailyTasksRaw) {
  if (!Array.isArray(dailyTasksRaw)) {
    return [];
  }
  const list = [...dailyTasksRaw];
  list.sort((a, b) => (Number(a?.day_index) || 0) - (Number(b?.day_index) || 0));
  return list;
}

function clampDayOffset(savedAtMs, targetDayKey) {
  const startKey = toDayKey(Number(savedAtMs) || Date.now());
  if (!isValidDayKey(startKey) || !isValidDayKey(targetDayKey)) {
    return 0;
  }
  const delta = diffCalendarDays(startKey, targetDayKey);
  return delta < 0 ? 0 : delta;
}

/** @returns {NutritionTask} */
export function inferNutritionFromPlan(plan) {
  const meals = Array.isArray(plan?.meals) ? plan.meals : [];
  let sumK = 0;
  let nK = 0;
  let sumP = 0;
  let nP = 0;
  for (const m of meals) {
    const cal = Number(m?.calories);
    if (Number.isFinite(cal) && cal > 0) {
      sumK += cal;
      nK++;
    }
    const desc = String(m?.description || '');
    const p =
      extractMacroFromText(desc, /бел(?:ок|ки)?\s*[:=\-]?\s*(\d+)/i) ||
      extractMacroFromText(desc, /протеин\s*[:=\-]?\s*(\d+)/i);
    if (p != null) {
      sumP += p;
      nP++;
    }
  }
  const avgK = nK ? Math.round(sumK / Math.max(nK, 1)) : null;
  const roughFromKcal =
    avgK != null
      ? {
          calories: avgK,
          proteinG: Math.round((avgK * 0.3) / 4),
          fatG: Math.round((avgK * 0.3) / 9),
          carbsG: Math.round((avgK * 0.4) / 4),
          mealsCount: Math.min(5, Math.max(3, meals.length || 4)),
        }
      : null;
  if (roughFromKcal && nP > 0) {
    roughFromKcal.proteinG = Math.round(sumP / nP);
  }
  return (
    roughFromKcal || {
      calories: 2300,
      proteinG: 140,
      fatG: 70,
      carbsG: 280,
      mealsCount: 4,
    }
  );
}

function extractMacroFromText(text, re) {
  const m = String(text || '').match(re);
  if (!m) {
    return null;
  }
  const v = Number(m[1]);
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** @param {unknown} n */
export function normalizeNutritionBlock(n, planFallback) {
  const fb = inferNutritionFromPlan(planFallback);
  if (!n || typeof n !== 'object') {
    return fb;
  }
  const o = /** @type {Record<string, unknown>} */ (n);
  const calories = pickNum(o.calories ?? o.calories_kcal ?? o.kcal);
  const proteinG = pickNum(o.protein_g ?? o.protein ?? o.proteins);
  const fatG = pickNum(o.fat_g ?? o.fats ?? o.fat);
  const carbsG = pickNum(o.carbs_g ?? o.carbs ?? o.carbohydrates);
  const mealsCount = pickNum(o.meals_count ?? o.mealsCount ?? o.meals);
  return {
    calories: calories ?? fb.calories,
    proteinG: proteinG ?? fb.proteinG,
    fatG: fatG ?? fb.fatG,
    carbsG: carbsG ?? fb.carbsG,
    mealsCount: mealsCount ?? fb.mealsCount,
  };
}

function pickNum(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * @param {string} line
 * @returns {Partial<WorkoutTask> | null}
 */
export function parseWorkoutTaskLine(line) {
  const s = String(line || '')
    .trim()
    .replace(/^\u2022\s*/, '')
    .replace(/^[•*-]\s*/, '');
  if (!s || s.length < 3) {
    return null;
  }

  const durMin = matchDurationMin(s);
  if (durMin != null && !/[x×х]\s*\d+/i.test(s)) {
    const title = stripLeadingLabel(s.replace(/\d+(?:\s*[-–]?\s*)\s*(мин|минут|min)\b/i, '').trim());
    return { title, durationMin: durMin };
  }

  const reBench = new RegExp(
    `^(.+?)(?:[:：—\\-]|\\s)\\s*(\\d+)\\s*[x×х]\\s*(\\d+)(?:\\s*\\(\\s*(?:~\\s*)?(${NUM})\\s*(?:кг|kg)\\s*\\))?`,
    'i',
  );
  const mb = s.match(reBench);
  if (mb) {
    return {
      title: stripLeadingLabel(mb[1]),
      sets: Number(mb[2]),
      reps: Number(mb[3]),
      weightKg: mb[4] != null ? parseLocaleNumber(mb[4]) : null,
    };
  }

  const reParen = new RegExp(
    `^(.+?)(?:[:：—\\-\\s]+)?(?:\\(\\s*(?:~\\s*)?(${NUM})\\s*(?:кг|kg)\\s*\\))?\\s*(\\d+)\\s*[x×х]\\s*(\\d+)`,
    'i',
  );
  const mp = s.match(reParen);
  if (mp) {
    return {
      title: stripLeadingLabel(mp[1]),
      weightKg: mp[2] != null ? parseLocaleNumber(mp[2]) : null,
      sets: Number(mp[3]),
      reps: Number(mp[4]),
    };
  }

  const reSxR = /^(.+?)\s+(\d+)\s*[x×х]\s*(\d+)/i.exec(s);
  if (reSxR) {
    return {
      title: stripLeadingLabel(reSxR[1]),
      sets: Number(reSxR[2]),
      reps: Number(reSxR[3]),
    };
  }

  const reKgOnly = /^(.+?)[\s:：—\-]+(?:~?\s*\()?(\d+(?:[.,]\d+)?)\s*(?:кг|kg)/i.exec(s);
  if (reKgOnly) {
    return {
      title: stripLeadingLabel(reKgOnly[1]),
      weightKg: parseLocaleNumber(reKgOnly[2]),
    };
  }

  return null;
}

function stripLeadingLabel(t) {
  return String(t || '')
    .replace(/\s+/g, ' ')
    .replace(/^[«"]|[»"]$/g, '')
    .trim();
}

function parseLocaleNumber(s) {
  return Number(String(s).replace(',', '.'));
}

function matchDurationMin(s) {
  const m = /\b(\d+)\s*(?:мин|минут|minute|min)\b/i.exec(s);
  return m ? Number(m[1]) : null;
}

/**
 * @param {string|null|undefined} content
 * @returns {WorkoutTask[]}
 */
export function workoutTasksFromContent(content) {
  const lines = String(content || '')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  const out = [];
  let i = 0;
  for (const ln of lines) {
    const p = parseWorkoutTaskLine(ln);
    if (p?.title) {
      out.push(
        finalizeWorkoutTask({
          idBase: `c-${i++}`,
          title: p.title,
          sets: p.sets ?? null,
          reps: p.reps ?? null,
          weightKg: p.weightKg ?? null,
          durationMin: p.durationMin ?? null,
        }),
      );
    }
  }
  return out;
}

/**
 * @param {unknown[]} raw
 * @returns {WorkoutTask[]}
 */
export function workoutTasksFromStructured(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out = [];
  raw.forEach((row, idx) => {
    if (!row || typeof row !== 'object') {
      return;
    }
    const o = /** @type {Record<string, unknown>} */ (row);
    const title = String(o.name ?? o.title ?? o.exercise ?? '').trim();
    if (!title) {
      return;
    }
    out.push(
      finalizeWorkoutTask({
        idBase: `s-${idx}`,
        title,
        sets: pickNum(o.sets),
        reps: pickNum(o.reps ?? o.repetitions),
        weightKg: pickNum(o.weight_kg ?? o.weightKg ?? o.weight),
        durationMin: pickNum(o.duration_min ?? o.durationMin),
      }),
    );
  });
  return out;
}

function finalizeWorkoutTask({ idBase, title, sets, reps, weightKg, durationMin }) {
  const parts = [];
  if (sets != null && reps != null) {
    parts.push(`${sets}×${reps}`);
  } else if (sets != null) {
    parts.push(`${sets} подходов`);
  } else if (reps != null) {
    parts.push(`${reps} повторов`);
  }
  if (weightKg != null) {
    parts.push(`${Math.round(weightKg * 10) / 10} кг`);
  }
  if (durationMin != null) {
    parts.push(`${durationMin} мин`);
  }
  const displayLine = `${title}${parts.length ? ` — ${parts.join(', ')}` : ''}`;
  const id =
    `${idBase}:` +
    title
      .toLowerCase()
      .slice(0, 48)
      .replace(/\s+/g, '-');

  return {
    id,
    title,
    sets: sets ?? null,
    reps: reps ?? null,
    weightKg: weightKg ?? null,
    durationMin: durationMin ?? null,
    displayLine,
  };
}

/**
 * @param {unknown} lastAiPlan
 * @param {string} dayKey
 * @returns {DailyPlan|null}
 */
export function buildDailyPlanForDay(lastAiPlan, dayKey) {
  if (!lastAiPlan?.plan || !isValidDayKey(dayKey)) {
    return null;
  }
  const plan = lastAiPlan.plan;
  const offset = clampDayOffset(lastAiPlan.savedAt, dayKey);
  const dailySorted = normalizeDailyTasks(plan.daily_tasks);
  const cycleLen = dailySorted.length || 1;
  const entry = dailySorted[offset % cycleLen];
  const dailyLabel =
    entry && (entry.label != null ? String(entry.label) : `День ${entry.day_index != null ? entry.day_index : '?'}`);

  let workouts = workoutTasksFromStructured(entry?.workout_exercises);

  const wBlock = Array.isArray(plan.workouts)
    ? plan.workouts[offset % Math.max(plan.workouts.length, 1)]
    : null;
  const sessionMin =
    entry?.workout_duration_min != null && Number.isFinite(Number(entry.workout_duration_min))
      ? Number(entry.workout_duration_min)
      : null;

  if (!workouts.length && wBlock?.content) {
    workouts = workoutTasksFromContent(wBlock.content);
  }
  if (!workouts.length && Array.isArray(entry?.tasks)) {
    let i = 0;
    for (const t of entry.tasks) {
      const parsed = parseWorkoutTaskLine(String(t));
      if (parsed?.title) {
        workouts.push(
          finalizeWorkoutTask({
            idBase: `t-${i++}`,
            title: parsed.title,
            sets: parsed.sets ?? null,
            reps: parsed.reps ?? null,
            weightKg: parsed.weightKg ?? null,
            durationMin: parsed.durationMin ?? null,
          }),
        );
      }
    }
  }

  if (!workouts.length && (wBlock?.title || dailyLabel)) {
    workouts.push(
      finalizeWorkoutTask({
        idBase: 'block',
        title: String(wBlock?.title || 'Тренировка'),
        sets: null,
        reps: null,
        weightKg: null,
        durationMin: sessionMin,
      }),
    );
  }

  const nutrition = normalizeNutritionBlock(entry?.nutrition, plan);

  return {
    date: dayKey,
    planDayOffset: offset,
    dailyLabel,
    workouts,
    nutrition,
    workoutSessionMin: sessionMin,
  };
}

/**
 * Фактические КБЖУ за день из дневника.
 * @param {Array<{ calories?: unknown, proteinG?: unknown, fatG?: unknown, carbsG?: unknown, date?: string }>} meals
 * @param {string} dayKey
 */
export function sumNutritionActual(meals, dayKey) {
  let calories = 0;
  let proteinG = 0;
  let fatG = 0;
  let carbsG = 0;
  let count = 0;
  for (const m of meals || []) {
    if (m?.date !== dayKey) {
      continue;
    }
    count++;
    calories += Number(m.calories) || 0;
    proteinG += Number(m.proteinG) || 0;
    fatG += Number(m.fatG) || 0;
    carbsG += Number(m.carbsG) || 0;
  }
  return { calories, proteinG, fatG, carbsG, mealCount: count };
}

/**
 * @param {NutritionTask} target
 * @param {{ calories: number, proteinG: number, fatG: number, carbsG: number }} actual
 */
export function nutritionRatios(target, actual) {
  const pairs = [
    ['calories', target.calories, actual.calories],
    ['proteinG', target.proteinG, actual.proteinG],
    ['fatG', target.fatG, actual.fatG],
    ['carbsG', target.carbsG, actual.carbsG],
  ];
  const perMacro = {};
  let sum = 0;
  let n = 0;
  for (const [key, t, a] of pairs) {
    const tn = Number(t);
    if (!Number.isFinite(tn) || tn <= 0) {
      continue;
    }
    const r = Math.min(1.5, Number(a) / tn);
    perMacro[key] = r;
    sum += Math.min(1, r);
    n++;
  }
  return { perMacro, overall: n ? sum / n : 0 };
}

/** Считаем выполненными КБЖУ при ≥ порога по каждому заданному макро */
export function isNutritionTargetsMet(target, actual, threshold = 0.9) {
  const macros = [
    ['calories', target.calories, actual.calories],
    ['p', target.proteinG, actual.proteinG],
    ['f', target.fatG, actual.fatG],
    ['c', target.carbsG, actual.carbsG],
  ];
  for (const [, t, a] of macros) {
    if (t != null && Number(t) > 0) {
      if (!(Number(a) / Number(t) >= threshold)) {
        return false;
      }
    }
  }
  if (target.mealsCount != null && Number(target.mealsCount) > 0) {
    /* meals count checked separately outside where we have mealCount */
  }
  return true;
}

export function isMealsCountMet(targetMealsCount, actualMealsCount, threshold = 1) {
  if (targetMealsCount == null || !Number.isFinite(Number(targetMealsCount)) || Number(targetMealsCount) <= 0) {
    return true;
  }
  return Number(actualMealsCount) >= Number(targetMealsCount) * threshold;
}
