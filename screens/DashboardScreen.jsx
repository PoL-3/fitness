import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAppData } from '@/store/AppDataContext';
import { useThemeColors } from '@/store/ThemeContext';

export function DashboardScreen() {
  const router = useRouter();
  const { workouts, meals, lastAiPlan, hydrated } = useAppData();
  const { colors } = useThemeColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        grid: {
          flexDirection: 'row',
          gap: 12,
          marginBottom: 24,
        },
        tile: {
          flex: 1,
          minHeight: 110,
        },
        tileLabel: {
          color: colors.textMuted,
          fontSize: 13,
          fontWeight: '600',
        },
        tileValue: {
          color: colors.text,
          fontSize: 28,
          fontWeight: '800',
          marginTop: 6,
        },
        tileHint: {
          color: colors.accent,
          fontSize: 12,
          marginTop: 8,
        },
        sectionTitle: {
          color: colors.text,
          fontSize: 16,
          fontWeight: '700',
          marginBottom: 10,
        },
        linkRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 16,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: colors.border,
        },
        linkRowPressed: {
          opacity: 0.85,
        },
        linkTitle: {
          color: colors.text,
          fontSize: 16,
          fontWeight: '600',
        },
        linkArrow: {
          color: colors.accent,
          fontSize: 18,
          fontWeight: '700',
        },
        hint: {
          marginTop: 20,
        },
        hintTitle: {
          color: colors.text,
          fontSize: 15,
          fontWeight: '700',
          marginBottom: 8,
        },
        hintText: {
          color: colors.textMuted,
          fontSize: 14,
          lineHeight: 20,
        },
      }),
    [colors],
  );

  const totalCalories = meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
  const workoutMinutes = workouts.reduce((sum, w) => sum + (Number(w.durationMin) || 0), 0);

  return (
    <AppScreen scroll>
      <ScreenHeader
        title="Главная"
        subtitle={hydrated ? 'Данные дневника на устройстве + опционально синхронизация с API' : 'Загрузка…'}
      />

      <View style={styles.grid}>
        <Card style={styles.tile}>
          <Text style={styles.tileLabel}>Тренировки</Text>
          <Text style={styles.tileValue}>{workouts.length}</Text>
          <Text style={styles.tileHint}>≈ {workoutMinutes} мин суммарно</Text>
        </Card>
        <Card style={styles.tile}>
          <Text style={styles.tileLabel}>Приёмы пищи</Text>
          <Text style={styles.tileValue}>{meals.length}</Text>
          <Text style={styles.tileHint}>≈ {totalCalories} ккал</Text>
        </Card>
      </View>

      <Text style={styles.sectionTitle}>Быстрые действия</Text>
      <Pressable
        style={({ pressed }) => [styles.linkRow, pressed && styles.linkRowPressed]}
        onPress={() => router.push('/add-workout')}
      >
        <Text style={styles.linkTitle}>Добавить тренировку</Text>
        <Text style={styles.linkArrow}>→</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.linkRow, pressed && styles.linkRowPressed]}
        onPress={() => router.push('/add-meal')}
      >
        <Text style={styles.linkTitle}>Записать приём пищи</Text>
        <Text style={styles.linkArrow}>→</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.linkRow, pressed && styles.linkRowPressed]}
        onPress={() => router.push('/(tabs)/generate-plan')}
      >
        <Text style={styles.linkTitle}>Сгенерировать план (ИИ)</Text>
        <Text style={styles.linkArrow}>→</Text>
      </Pressable>

      {lastAiPlan ? (
        <Card style={styles.hint}>
          <Text style={styles.hintTitle}>Последний план ИИ</Text>
          <Text style={styles.hintText} numberOfLines={3}>
            {lastAiPlan.plan?.summary || 'Сохранён локально'}
          </Text>
        </Card>
      ) : null}

      <Card style={styles.hint}>
        <Text style={styles.hintTitle}>Аналитика</Text>
        <Text style={styles.hintText}>
          На экране «Цели» — прогресс по весу. Поиск — в списках тренировок и питания. Детали — нажмите
          на карточку в списке.
        </Text>
      </Card>
    </AppScreen>
  );
}
