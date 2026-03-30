import { toDayKey } from '@/utils/dateDay';
import { normalizeExercise, splitNotesAndExercises } from '@/utils/workoutExercises';

/** @typedef {'weight'|'reps'|'duration'|'sets'} MetricType */

/**
 * @param {string} s
 */
export function normalizeExerciseName(s) {
  return String(s || '').trim().toLowerCase();
}

/**
 * Совпадение названия цели и упражнения (без учёта регистра, частичное).
 */
export function exerciseMatchesGoal(goalName, exerciseName) {
  const g = normalizeExerciseName(goalName);
  const e = normalizeExerciseName(exerciseName);
  if (!g || !e) {
    return false;
  }
  return e.includes(g) || g.includes(e);
}

/**
 * @param {{ weightKg?: number, reps?: number, durationSec?: number, sets?: number, setsData?: Array<{weightKg?: number, reps?: number, durationSec?: number}> }} ex
 * @param {MetricType} metricType
 * @param {number|null|undefined} referenceWeightKg
 */
export function getMetricValue(ex, metricType, referenceWeightKg) {
  const n = normalizeExercise(ex);
  const useSets = Array.isArray(n.setsData) && n.setsData.length > 0;

  if (metricType === 'weight') {
    if (!useSets) return Number(ex.weightKg) || 0;
    let best = 0;
    for (const s of n.setsData) {
      const w = Number(s.weightKg) || 0;
      if (w > best) best = w;
    }
    return best;
  }

  if (metricType === 'sets') {
    if (!useSets) return Number(ex.sets) || 0;
    if (referenceWeightKg == null || !Number.isFinite(Number(referenceWeightKg))) {
      return n.setsData.length;
    }
    let count = 0;
    for (const s of n.setsData) {
      if (Number(s.weightKg) === Number(referenceWeightKg)) count += 1;
    }
    return count;
  }

  if (metricType === 'reps' || metricType === 'duration') {
    if (!useSets) return metricType === 'reps' ? Number(ex.reps) || 0 : Number(ex.durationSec) || 0;
    let best = 0;
    for (const s of n.setsData) {
      if (referenceWeightKg != null && Number.isFinite(Number(referenceWeightKg))) {
        if (Number(s.weightKg) !== Number(referenceWeightKg)) continue;
      }
      const v = metricType === 'reps' ? Number(s.reps) || 0 : Number(s.durationSec) || 0;
      if (v > best) best = v;
    }
    return best;
  }

  return 0;
}

/**
 * @param {object} workout
 * @returns {Array<{ name: string, weightKg?: number, reps?: number, durationSec?: number, sets?: number }>}
 */
export function getWorkoutExercisesList(workout) {
  if (Array.isArray(workout.exercises) && workout.exercises.length) {
    return workout.exercises;
  }
  const { exercises } = splitNotesAndExercises(workout.notes);
  return exercises;
}

function computeCurrentBestValueForMetric(workouts, exerciseName, metricType, referenceWeightKg) {
  let best = 0;
  for (const w of workouts) {
    const list = getWorkoutExercisesList(w);
    for (const ex of list) {
      if (!exerciseMatchesGoal(exerciseName, ex.name)) {
        continue;
      }
      const v = getMetricValue(ex, metricType, referenceWeightKg);
      if (v > best) {
        best = v;
      }
    }
  }
  return best;
}

/**
 * По дням: на каждую дату — максимум значения метрики для этого упражнения (для графика).
 * @param {object[]} workouts
 * @param {string} exerciseName
 * @param {MetricType} metricType
 * @returns {Array<{ date: string, value: number }>}
 */
function buildProgressSeriesByDateForMetric(workouts, exerciseName, metricType, referenceWeightKg) {
  /** @type {Record<string, number>} */
  const byDate = {};
  for (const w of workouts) {
    const day = w.date || toDayKey(w.createdAt);
    const list = getWorkoutExercisesList(w);
    for (const ex of list) {
      if (!exerciseMatchesGoal(exerciseName, ex.name)) {
        continue;
      }
      const v = getMetricValue(ex, metricType, referenceWeightKg);
      if (!byDate[day] || v > byDate[day]) {
        byDate[day] = v;
      }
    }
  }
  const dates = Object.keys(byDate).sort();
  return dates.map((d) => ({ date: d, value: byDate[d] }));
}

/**
 * progress = (currentValue / targetValue) * 100
 */
export function computeProgressPercent(currentValue, targetValue) {
  const t = Number(targetValue);
  const c = Number(currentValue);
  if (!Number.isFinite(t) || t <= 0 || !Number.isFinite(c) || c < 0) {
    return 0;
  }
  return (c / t) * 100;
}

function getGoalMetricTargets(goal) {
  // Новый формат: { metricTargets: { weight, reps, duration, sets } }
  if (goal?.metricTargets && typeof goal.metricTargets === 'object') {
    const mt = goal.metricTargets;
    /** @type {Array<{ metricType: MetricType, targetValue: number }>} */
    const out = [];
    if (mt.weight != null && Number.isFinite(Number(mt.weight)) && Number(mt.weight) > 0) out.push({ metricType: 'weight', targetValue: Number(mt.weight) });
    if (mt.reps != null && Number.isFinite(Number(mt.reps)) && Number(mt.reps) > 0) out.push({ metricType: 'reps', targetValue: Number(mt.reps) });
    if (mt.duration != null && Number.isFinite(Number(mt.duration)) && Number(mt.duration) > 0) out.push({ metricType: 'duration', targetValue: Number(mt.duration) });
    if (mt.sets != null && Number.isFinite(Number(mt.sets)) && Number(mt.sets) > 0) out.push({ metricType: 'sets', targetValue: Number(mt.sets) });
    return out;
  }

  // Старый формат: { metricType, targetValue }
  if (goal?.metricType && goal?.targetValue != null) {
    const mt = goal.metricType;
    const targetValue = Number(goal.targetValue);
    if ((mt === 'weight' || mt === 'reps' || mt === 'duration' || mt === 'sets') && Number.isFinite(targetValue) && targetValue > 0) {
      return [{ metricType: mt, targetValue }];
    }
  }

  return [];
}

function getPrimaryMetricType(targets) {
  const order = ['weight', 'reps', 'duration', 'sets'];
  for (const mt of order) {
    if (targets.find((t) => t.metricType === mt)) {
      return mt;
    }
  }
  return targets[0]?.metricType ?? 'weight';
}

/**
 * Возвращает прогресс для целей по упражнениям.
 * В новом формате goal.metricTargets могут быть несколько метрик сразу.
 */
export function getExerciseGoalStats(workouts, goal) {
  const targets = getGoalMetricTargets(goal);
  const exerciseName = goal?.exerciseName || '';
  /** @type {Record<MetricType, any>} */
  const metricsByType = {};

  for (const t of targets) {
    const referenceWeightKg =
      goal?.referenceWeightKg != null && Number.isFinite(Number(goal.referenceWeightKg))
        ? Number(goal.referenceWeightKg)
        : null;
    const currentValue = computeCurrentBestValueForMetric(workouts, exerciseName, t.metricType, referenceWeightKg);
    const percent = computeProgressPercent(currentValue, t.targetValue);
    const series = buildProgressSeriesByDateForMetric(workouts, exerciseName, t.metricType, referenceWeightKg);
    metricsByType[t.metricType] = {
      currentValue,
      targetValue: t.targetValue,
      percent,
      isComplete: percent >= 100,
      series,
      referenceWeightKg,
    };
  }

  const primaryMetricType = getPrimaryMetricType(targets);
  const primaryMetricStats = metricsByType[primaryMetricType];

  const isComplete = targets.length ? targets.every((t) => metricsByType[t.metricType]?.isComplete) : false;

  // Back-compat для старого UI: если была ровно одна метрика.
  if (targets.length === 1 && primaryMetricStats) {
    return {
      metricsByType,
      isComplete,
      primaryMetricType,
      primaryMetricStats,
      currentValue: primaryMetricStats.currentValue,
      targetValue: primaryMetricStats.targetValue,
      percent: primaryMetricStats.percent,
      series: primaryMetricStats.series,
      metricType: primaryMetricType,
    };
  }

  return { metricsByType, isComplete, primaryMetricType, primaryMetricStats };
}

export function metricTypeLabel(metricType) {
  if (metricType === 'weight') return 'Вес (кг)';
  if (metricType === 'reps') return 'Повторы';
  if (metricType === 'duration') return 'Длительность (сек)';
  if (metricType === 'sets') return 'Подходы';
  return String(metricType);
}
