import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { apiJson } from '@/constants/api';
import { toDayKey } from '@/utils/dateDay';
import { createId } from '@/utils/id';

import { useAuth } from './AuthContext';

const KEY_W_PREFIX = '@fitness/workouts:';
const KEY_M_PREFIX = '@fitness/meals:';
const KEY_G_PREFIX = '@fitness/goals:';
const KEY_P_PREFIX = '@fitness/last_ai_plan:';
const KEY_EG_PREFIX = '@fitness/exercise_goals:';
const KEY_EC_PREFIX = '@fitness/exercise_goals_celebrated:';

function scopeKey(prefix, scope) {
  return `${prefix}${scope ?? 'anon'}`;
}

const AppDataContext = createContext(null);

/**
 * Тренировки, питание, цели и последний ответ ИИ.
 * Данные сохраняются в AsyncStorage; при входе в аккаунт дубликаты уходят на сервер (POST).
 */
export function AppDataProvider({ children }) {
  const { token, user, ready } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [meals, setMeals] = useState([]);
  const [goals, setGoals] = useState(null);
  const [exerciseGoals, setExerciseGoals] = useState([]);
  const [celebratedExerciseGoalIds, setCelebratedExerciseGoalIds] = useState([]);
  const [lastAiPlan, setLastAiPlan] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const saveTimeout = useRef(null);
  const scope = user?.id ?? 'anon';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setHydrated(false);
      try {
        // Wait for auth hydration so we don't load anon cache and then immediately swap.
        if (!ready) {
          return;
        }
        const [w, m, g, eg, ec, p] = await Promise.all([
          AsyncStorage.getItem(scopeKey(KEY_W_PREFIX, scope)),
          AsyncStorage.getItem(scopeKey(KEY_M_PREFIX, scope)),
          AsyncStorage.getItem(scopeKey(KEY_G_PREFIX, scope)),
          AsyncStorage.getItem(scopeKey(KEY_EG_PREFIX, scope)),
          AsyncStorage.getItem(scopeKey(KEY_EC_PREFIX, scope)),
          AsyncStorage.getItem(scopeKey(KEY_P_PREFIX, scope)),
        ]);
        if (cancelled) {
          return;
        }
        setWorkouts(
          (w ? JSON.parse(w) : []).map((item) => ({
            ...item,
            date: item.date || toDayKey(item.createdAt),
          })),
        );
        setMeals(
          (m ? JSON.parse(m) : []).map((item) => ({
            ...item,
            date: item.date || toDayKey(item.createdAt),
          })),
        );
        setGoals(g ? JSON.parse(g) : null);
        setExerciseGoals(eg ? JSON.parse(eg) : []);
        setCelebratedExerciseGoalIds(ec ? JSON.parse(ec) : []);
        setLastAiPlan(p ? JSON.parse(p) : null);

        // If logged in, refresh from server so different accounts see their own data.
        if (token) {
          const [rw, rm] = await Promise.all([
            apiJson('/journal/workouts', { token }),
            apiJson('/journal/meals', { token }),
          ]);
          if (!cancelled) {
            if (rw?.res?.ok && rw?.data?.ok && Array.isArray(rw.data.items)) {
              setWorkouts(
                rw.data.items.map((x) => {
                  const createdAt = Number(x.created_at) || Date.now();
                  return {
                    id: x.id,
                    title: x.title,
                    durationMin: x.duration_min != null ? Number(x.duration_min) : null,
                    type: x.type_text ?? null,
                    notes: x.notes ?? null,
                    createdAt,
                    date: toDayKey(createdAt),
                  };
                }),
              );
            }
            if (rm?.res?.ok && rm?.data?.ok && Array.isArray(rm.data.items)) {
              setMeals(
                rm.data.items.map((x) => {
                  const createdAt = Number(x.created_at) || Date.now();
                  return {
                    id: x.id,
                    mealLabel: x.meal_label,
                    calories: x.calories != null ? Number(x.calories) : null,
                    description: x.description ?? null,
                    createdAt,
                    date: toDayKey(createdAt),
                  };
                }),
              );
            }
          }
        }
      } catch (_) {
        /* ignore */
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scope, token, ready]);

  const persist = useCallback(() => {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }
    saveTimeout.current = setTimeout(async () => {
      try {
        await AsyncStorage.multiSet([
          [scopeKey(KEY_W_PREFIX, scope), JSON.stringify(workouts)],
          [scopeKey(KEY_M_PREFIX, scope), JSON.stringify(meals)],
          [scopeKey(KEY_G_PREFIX, scope), JSON.stringify(goals)],
          [scopeKey(KEY_EG_PREFIX, scope), JSON.stringify(exerciseGoals)],
          [scopeKey(KEY_EC_PREFIX, scope), JSON.stringify(celebratedExerciseGoalIds)],
          [scopeKey(KEY_P_PREFIX, scope), JSON.stringify(lastAiPlan)],
        ]);
      } catch (_) {
        /* ignore */
      }
    }, 400);
  }, [workouts, meals, goals, exerciseGoals, celebratedExerciseGoalIds, lastAiPlan, scope]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    persist();
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, [hydrated, persist]);

  const pushWorkoutRemote = useCallback(
    async (item) => {
      if (!token) {
        return;
      }
      try {
        await apiJson('/journal/workouts', {
          method: 'POST',
          token,
          body: {
            id: item.id,
            title: item.title,
            durationMin: item.durationMin,
            type: item.type,
            notes: item.notes,
            createdAt: item.createdAt,
          },
        });
      } catch (_) {
        /* тихо: офлайн или сервер недоступен */
      }
    },
    [token],
  );

  const pushMealRemote = useCallback(
    async (item) => {
      if (!token) {
        return;
      }
      try {
        await apiJson('/journal/meals', {
          method: 'POST',
          token,
          body: {
            id: item.id,
            mealLabel: item.mealLabel,
            calories: item.calories,
            description: item.description,
            createdAt: item.createdAt,
          },
        });
      } catch (_) {
        /* ignore */
      }
    },
    [token],
  );

  const addWorkout = useCallback(
    (entry) => {
      const createdAt = entry.createdAt != null ? Number(entry.createdAt) : Date.now();
      const newItem = {
        ...entry,
        id: createId(),
        createdAt,
        date: entry.date || toDayKey(createdAt),
      };
      setWorkouts((prev) => [newItem, ...prev]);
      pushWorkoutRemote(newItem);
    },
    [pushWorkoutRemote],
  );

  const addMeal = useCallback(
    (entry) => {
      const createdAt = entry.createdAt != null ? Number(entry.createdAt) : Date.now();
      const newItem = {
        ...entry,
        id: createId(),
        createdAt,
        date: entry.date || toDayKey(createdAt),
      };
      setMeals((prev) => [newItem, ...prev]);
      pushMealRemote(newItem);
    },
    [pushMealRemote],
  );

  const updateWorkout = useCallback(
    (id, updates) => {
      setWorkouts((prev) => {
        const next = prev.map((w) => {
          if (w.id !== id) {
            return w;
          }
          const merged = { ...w, ...updates };
          if (updates.createdAt != null) {
            merged.createdAt = Number(updates.createdAt);
          }
          merged.date =
            updates.date !== undefined && updates.date !== null
              ? updates.date
              : merged.date || (merged.createdAt ? toDayKey(merged.createdAt) : merged.date);
          return merged;
        });
        const updated = next.find((w) => w.id === id);
        if (updated) {
          pushWorkoutRemote(updated);
        }
        return next;
      });
    },
    [pushWorkoutRemote],
  );

  const updateMeal = useCallback(
    (id, updates) => {
      setMeals((prev) => {
        const next = prev.map((m) => {
          if (m.id !== id) {
            return m;
          }
          const merged = { ...m, ...updates };
          if (updates.createdAt != null) {
            merged.createdAt = Number(updates.createdAt);
          }
          merged.date =
            updates.date !== undefined && updates.date !== null
              ? updates.date
              : merged.date || (merged.createdAt ? toDayKey(merged.createdAt) : merged.date);
          return merged;
        });
        const updated = next.find((m) => m.id === id);
        if (updated) {
          pushMealRemote(updated);
        }
        return next;
      });
    },
    [pushMealRemote],
  );

  const setGoalsSafe = useCallback((g) => {
    setGoals(g);
  }, []);

  const setLastAiPlanSafe = useCallback((p) => {
    setLastAiPlan(p);
  }, []);

  const addExerciseGoal = useCallback((entry) => {
    const metricTargets =
      entry?.metricTargets && typeof entry.metricTargets === 'object'
        ? {
            // В интерфейсе будут поля weight / reps / duration / sets.
            weight: entry.metricTargets.weight != null ? Number(entry.metricTargets.weight) : undefined,
            reps: entry.metricTargets.reps != null ? Number(entry.metricTargets.reps) : undefined,
            duration: entry.metricTargets.duration != null ? Number(entry.metricTargets.duration) : undefined,
            sets: entry.metricTargets.sets != null ? Number(entry.metricTargets.sets) : undefined,
          }
        : null;

    const metricType = entry?.metricType;
    const targetValue = entry?.targetValue;
    const referenceWeightKg =
      entry?.referenceWeightKg != null && Number.isFinite(Number(entry.referenceWeightKg))
        ? Number(entry.referenceWeightKg)
        : undefined;

    const item = {
      id: createId(),
      exerciseName: String(entry.exerciseName || '').trim(),
      createdAt: Date.now(),
      ...(metricTargets ? { metricTargets } : {}),
      ...(!metricTargets && metricType
        ? {
            metricType: metricType === 'reps' || metricType === 'duration' || metricType === 'sets' ? metricType : 'weight',
            targetValue: Number(targetValue),
            ...(referenceWeightKg != null ? { referenceWeightKg } : {}),
          }
        : {}),
    };
    setExerciseGoals((prev) => [...prev, item]);
    return item;
  }, []);

  const removeExerciseGoal = useCallback((id) => {
    setExerciseGoals((prev) => prev.filter((x) => x.id !== id));
    setCelebratedExerciseGoalIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const markExerciseGoalCelebrated = useCallback((id) => {
    setCelebratedExerciseGoalIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const getWorkoutById = useCallback(
    (id) => workouts.find((x) => x.id === id),
    [workouts],
  );

  const getMealById = useCallback((id) => meals.find((x) => x.id === id), [meals]);

  const value = useMemo(
    () => ({
      workouts,
      meals,
      goals,
      exerciseGoals,
      celebratedExerciseGoalIds,
      lastAiPlan,
      hydrated,
      addWorkout,
      addMeal,
      addExerciseGoal,
      removeExerciseGoal,
      markExerciseGoalCelebrated,
      setGoals: setGoalsSafe,
      setLastAiPlan: setLastAiPlanSafe,
      getWorkoutById,
      getMealById,
      updateWorkout,
      updateMeal,
    }),
    [
      workouts,
      meals,
      goals,
      exerciseGoals,
      celebratedExerciseGoalIds,
      lastAiPlan,
      hydrated,
      addWorkout,
      addMeal,
      addExerciseGoal,
      removeExerciseGoal,
      markExerciseGoalCelebrated,
      setGoalsSafe,
      setLastAiPlanSafe,
      getWorkoutById,
      getMealById,
      updateWorkout,
      updateMeal,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error('useAppData должен вызываться внутри AppDataProvider');
  }
  return ctx;
}
