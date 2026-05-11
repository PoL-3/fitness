import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAppData } from '@/store/AppDataContext';
import { useThemeColors } from '@/store/ThemeContext';
import {
  normalizeDailyTasks,
  normalizeNutritionBlock,
  workoutTasksFromStructured,
} from '@/utils/dailyPlan';
import { formatDayRu, toDayKey } from '@/utils/dateDay';

export function PlanOverviewScreen() {
  const { lastAiPlan } = useAppData();
  const { colors } = useThemeColors();
  const plan = lastAiPlan?.plan;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        note: {
          color: colors.textMuted,
          fontSize: 14,
          lineHeight: 20,
          marginBottom: 16,
          fontWeight: '600',
        },
        dayTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 8 },
        sub: { color: colors.accent, fontSize: 13, fontWeight: '700', marginBottom: 6 },
        line: {
          color: colors.textMuted,
          fontSize: 14,
          lineHeight: 20,
          marginLeft: 4,
          marginBottom: 4,
          fontWeight: '600',
        },
        macros: {
          color: colors.text,
          fontSize: 13,
          lineHeight: 20,
          fontWeight: '600',
          marginTop: 10,
        },
        gap: { marginBottom: 12 },
      }),
    [colors],
  );

  if (!plan) {
    return (
      <AppScreen scroll>
        <ScreenHeader title="План месяца" subtitle="Нет сохранённого ИИ-плана" />
        <EmptyState emoji="📅" title="План недоступен" subtitle="Сначала сгенерируйте план через экран генерации ИИ." />
      </AppScreen>
    );
  }

  const days = normalizeDailyTasks(plan.daily_tasks);
  const startLabel = formatDayRu(toDayKey(lastAiPlan.savedAt));

  return (
    <AppScreen scroll={false}>
      <ScreenHeader
        title="План месяца"
        subtitle={`Календарный цикл начинается с ${startLabel || 'даты сохранения'}`}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.note}>
          Дни ниже задают шаблон недели или месяца. Приложение по очереди применяет их к каждому дню, начиная с даты
          генерации. Дней в шаблоне: {days.length}.
        </Text>
        {days.map((d, idx) => {
          const label = d.label || `День ${d.day_index ?? idx + 1}`;
          const exercises = workoutTasksFromStructured(d.workout_exercises || []);
          const nut = normalizeNutritionBlock(d.nutrition, plan);
          return (
            <Card key={`${d.day_index ?? idx}-${label}`} style={styles.gap}>
              <Text style={styles.dayTitle}>{label}</Text>
              {d.workout_duration_min != null ? (
                <Text style={styles.sub}>Длительность тренировки · ~{d.workout_duration_min} мин</Text>
              ) : null}
              <Text style={styles.sub}>Тренировка</Text>
              {exercises.length ? (
                exercises.map((ex) => (
                  <Text key={ex.id} style={styles.line}>
                    • {ex.displayLine}
                  </Text>
                ))
              ) : (d.tasks || []).length ? (
                (d.tasks || []).map((t, j) => (
                  <Text key={j} style={styles.line}>
                    • {t}
                  </Text>
                ))
              ) : (
                <Text style={styles.line}>Детали — в общем блоке тренировок плана.</Text>
              )}
              <Text style={styles.sub}>Питание (цели)</Text>
              <Text style={styles.macros}>
                Калории {nut.calories != null ? Math.round(nut.calories) : '—'} · Б {nut.proteinG != null ? Math.round(nut.proteinG) : '—'} г · Ж{' '}
                {nut.fatG != null ? Math.round(nut.fatG) : '—'} г · У {nut.carbsG != null ? Math.round(nut.carbsG) : '—'} г · приёмов:{' '}
                {nut.mealsCount != null ? Math.round(nut.mealsCount) : '—'}
              </Text>
            </Card>
          );
        })}
      </ScrollView>
    </AppScreen>
  );
}
