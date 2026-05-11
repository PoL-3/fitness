import {
  buildDailyPlanForDay,
  getPlanStableKey,
  isMealsCountMet,
  isNutritionTargetsMet,
  sumNutritionActual,
} from '@/utils/dailyPlan';
import { shiftDayKey, todayDayKey } from '@/utils/dateDay';

/**
 * Серия успешных дней подряд (с учётом дневника питания и отмеченных тренировок).
 * Протяживается только для дней, для которых план восстанавливается тем же сохранённым AI-планом.
 */
export function computeDailyCompletionStreak(dailyTasksProgress, lastAiPlan, meals) {
  const pk = getPlanStableKey(lastAiPlan);
  if (!pk || !lastAiPlan?.plan) {
    return 0;
  }
  const today = todayDayKey();
  let streak = 0;
  const planMap = dailyTasksProgress && typeof dailyTasksProgress === 'object' ? dailyTasksProgress[pk] : null;

  for (let i = 0; i < 400; i++) {
    const d = shiftDayKey(today, -i);
    const dayPlan = buildDailyPlanForDay(lastAiPlan, d);
    if (!dayPlan) {
      break;
    }
    const workoutsDone = planMap?.[d]?.workouts ?? {};
    const allWorkoutsMarked = dayPlan.workouts.length
      ? dayPlan.workouts.every((t) => workoutsDone[t.id])
      : true;
    const actual = sumNutritionActual(meals, d);
    const nutTargetsOk = isNutritionTargetsMet(dayPlan.nutrition, actual);
    const mealsOk = isMealsCountMet(dayPlan.nutrition.mealsCount, actual.mealCount);
    const fullDone = allWorkoutsMarked && nutTargetsOk && mealsOk;
    if (!fullDone) {
      break;
    }
    streak++;
  }

  return streak;
}
