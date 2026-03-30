import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAppData } from '@/store/AppDataContext';
import { useThemeColors } from '@/store/ThemeContext';
import { getExerciseGoalStats, metricTypeLabel } from '@/utils/progress';

export function CelebrationScreen() {
  const { goalId } = useLocalSearchParams();
  const { colors } = useThemeColors();
  const { exerciseGoals, workouts, markExerciseGoalCelebrated } = useAppData();

  const id = typeof goalId === 'string' ? goalId : goalId?.[0];
  const goal = exerciseGoals.find((g) => g.id === id);
  const stats = goal ? getExerciseGoalStats(workouts, goal) : null;

  function onContinue() {
    if (id) {
      markExerciseGoalCelebrated(id);
    }
    router.back();
  }

  return (
    <AppScreen scroll={false}>
      <View style={styles.center}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={[styles.title, { color: colors.text }]}>Поздравляем!</Text>
        <Text style={[styles.msg, { color: colors.textMuted }]}>
          {goal
            ? `Ты достиг цели по «${goal.exerciseName}»! Отличная работа!`
            : 'Ты достиг своей цели! Отличная работа!'}
        </Text>
        {stats ? (
          <Text style={[styles.sub, { color: colors.accent }]}>
            {(() => {
              const primaryMetricType = stats.primaryMetricType || stats.metricType || 'weight';
              const primaryStats =
                stats.primaryMetricStats ||
                (stats.metricType
                  ? {
                      currentValue: stats.currentValue,
                      targetValue: stats.targetValue,
                      percent: stats.percent,
                    }
                  : null);
              if (!primaryStats) return null;
              const cur = Math.round((primaryStats.currentValue || 0) * 10) / 10;
              const tgt = primaryStats.targetValue;
              return `${metricTypeLabel(primaryMetricType)}: ${cur} / ${tgt}`;
            })()}
          </Text>
        ) : null}
        <PrimaryButton title="Продолжить" onPress={onContinue} style={styles.btn} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  msg: {
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  sub: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 28,
  },
  btn: {
    alignSelf: 'stretch',
    maxWidth: 320,
  },
});
