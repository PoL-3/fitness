import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { Card } from '@/components/Card';
import { ProgressChart } from '@/components/ProgressChart';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAppData } from '@/store/AppDataContext';
import { useAuth } from '@/store/AuthContext';
import { useThemeColors } from '@/store/ThemeContext';
import { getExerciseGoalStats, metricTypeLabel } from '@/utils/progress';
import { toDayKey, todayDayKey } from '@/utils/dateDay';
import { extractBodyWeightKgFromNotes } from '@/utils/workoutExercises';

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function ProgressScreen() {
  const { workouts, goals, exerciseGoals, celebratedExerciseGoalIds, hydrated } = useAppData();
  const { user: authUser } = useAuth();
  const { colors } = useThemeColors();

  const lastWorkoutWeightKg = useMemo(() => {
    let best = null;
    for (const w of workouts) {
      const bw = extractBodyWeightKgFromNotes(w.notes);
      if (bw == null) continue;
      if (best == null) {
        best = { value: bw, createdAt: w.createdAt || 0 };
      } else if ((w.createdAt || 0) >= (best.createdAt || 0)) {
        best = { value: bw, createdAt: w.createdAt || 0 };
      }
    }
    return best?.value ?? null;
  }, [workouts]);

  const currentWeight =
    lastWorkoutWeightKg != null
      ? Number(lastWorkoutWeightKg)
      : authUser?.weightKg != null
        ? Number(authUser.weightKg)
        : goals?.startWeight != null
          ? Number(goals.startWeight)
          : null;

  const weightSeries = useMemo(() => {
    if (!goals) {
      return [];
    }

    const startValue = Number(goals.startWeight);
    if (!Number.isFinite(startValue)) return [];

    const points = {};
    const startDay = goals?.startedAt ? toDayKey(goals.startedAt) : todayDayKey();
    points[startDay] = { value: startValue, createdAt: Number(goals.startedAt) || 0 };

    for (const w of workouts) {
      const bw = extractBodyWeightKgFromNotes(w.notes);
      if (bw == null || !Number.isFinite(Number(bw))) continue;
      const day = w.date || toDayKey(w.createdAt);
      if (day < startDay) continue;
      const createdAt = w.createdAt || 0;
      const prev = points[day];
      if (!prev || createdAt >= (prev.createdAt || 0)) {
        points[day] = { value: Number(bw), createdAt };
      }
    }

    const dates = Object.keys(points).sort();
    return dates.map((d) => ({ date: d, value: points[d].value }));
  }, [goals, workouts]);

  const bodyProgressPct = useMemo(() => {
    if (!goals || currentWeight == null || !Number.isFinite(currentWeight)) {
      return null;
    }
    const s = Number(goals.startWeight);
    const t = Number(goals.targetWeight);
    const c = currentWeight;
    if (!Number.isFinite(s) || !Number.isFinite(t) || s === t) {
      return null;
    }
    if (goals.goalType === 'weight_loss') {
      const raw = ((s - c) / (s - t)) * 100;
      return clamp(raw, 0, 100);
    }
    const raw = ((c - s) / (t - s)) * 100;
    return clamp(raw, 0, 100);
  }, [goals, currentWeight]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    for (const g of exerciseGoals) {
      const stats = getExerciseGoalStats(workouts, g);
      if (stats.isComplete && !celebratedExerciseGoalIds.includes(g.id)) {
        router.push(`/celebration?goalId=${encodeURIComponent(g.id)}`);
        return;
      }
    }
  }, [hydrated, workouts, exerciseGoals, celebratedExerciseGoalIds]);

  return (
    <AppScreen scroll>
      <ScreenHeader title="Прогресс" subtitle="Цели по весу и по упражнениям" />

      {goals && bodyProgressPct != null ? (
        <Card style={styles.card}>
          <Text style={[styles.h, { color: colors.text }]}>Цель по весу</Text>
          <Text style={[styles.pct, { color: colors.accent }]}>{Math.round(bodyProgressPct)}%</Text>
          <View style={[styles.barBg, { backgroundColor: colors.surface2 }]}>
            <View style={[styles.barFill, { width: `${bodyProgressPct}%`, backgroundColor: colors.accent }]} />
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>Вес берётся из тренировок (если указан в форме).</Text>
          <ProgressChart series={weightSeries} />
        </Card>
      ) : goals ? (
        <Card style={styles.card}>
          <Text style={[styles.h, { color: colors.text }]}>Цель по весу</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>Добавьте вес в тренировках, чтобы видеть процент.</Text>
        </Card>
      ) : null}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Прогресс в упражнениях</Text>
      {exerciseGoals.length === 0 ? (
        <Card style={styles.card}>
          <Text style={{ color: colors.textMuted, fontSize: 15 }}>Пока нет целей по упражнениям. Добавьте их на вкладке «Цели».</Text>
        </Card>
      ) : (
        exerciseGoals.map((g) => {
          const stats = getExerciseGoalStats(workouts, g);
          const metricsByType = stats?.metricsByType || {};
          const metricOrder = ['weight', 'reps', 'duration', 'sets'];
          const metricEntries = Object.entries(metricsByType).sort(([a], [b]) => {
            const ia = metricOrder.indexOf(a);
            const ib = metricOrder.indexOf(b);
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
          });
          return (
            <Card key={g.id} style={styles.card}>
              <Text style={[styles.h, { color: colors.text }]}>{g.exerciseName}</Text>
              {g.referenceWeightKg != null ? (
                <Text style={[styles.metricMeta, { color: colors.textMuted }]}>Прогресс для веса: {g.referenceWeightKg} кг</Text>
              ) : null}
              {metricEntries.length ? (
                <View style={{ marginTop: 8 }}>
                  {metricEntries.map(([mt, ms]) => {
                    const pct = Number(ms?.percent || 0);
                    const barW = clamp(pct, 0, 100);
                    const cur = ms?.currentValue != null ? Math.round((ms.currentValue || 0) * 10) / 10 : 0;
                    const tgt = ms?.targetValue != null ? ms.targetValue : '-';
                    return (
                      <View key={mt} style={styles.metricBlock}>
                        <Text style={[styles.metricTitle, { color: colors.textMuted }]}>{metricTypeLabel(mt)}</Text>
                        <Text style={[styles.metricMeta, { color: colors.textMuted }]}>
                          Сейчас: {cur} · цель: {tgt} · {Math.round(pct)}%
                        </Text>
                        <View style={[styles.barBg, { backgroundColor: colors.surface2 }]}>
                          <View style={[styles.barFill, { width: `${barW}%`, backgroundColor: colors.accent }]} />
                        </View>
                        <Text style={[styles.chartCap, { color: colors.textMuted }]}>По датам (из тренировок)</Text>
                        <ProgressChart series={ms?.series || []} />
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 10,
  },
  card: {
    marginBottom: 14,
  },
  h: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  meta: {
    fontSize: 13,
    marginBottom: 8,
  },
  metricLine: {
    fontSize: 13,
    marginTop: 2,
  },
  metricBlock: {
    marginTop: 12,
  },
  metricTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  metricMeta: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  current: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  pct: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  barBg: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  hint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  chartCap: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },
});
