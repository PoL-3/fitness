import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAppData } from '@/store/AppDataContext';
import { useThemeColors } from '@/store/ThemeContext';
import {
  buildDailyPlanForDay,
  getPlanStableKey,
  isMealsCountMet,
  isNutritionTargetsMet,
  nutritionRatios,
  sumNutritionActual,
} from '@/utils/dailyPlan';
import { computeDailyCompletionStreak } from '@/utils/dailyPlanProgress';
import { formatDayRu, todayDayKey } from '@/utils/dateDay';

function enableLayoutAnim() {
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

function MacroProgressRow({ label, current, target, colors }) {
  const t = Number(target);
  const a = Number(current);
  const ratio = t > 0 ? Math.min(1.05, a / t) : 0;
  const pct = Math.round(Math.min(1, ratio) * 100);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: { marginBottom: 10 },
        top: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 6,
        },
        lab: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
        val: { color: colors.text, fontSize: 13, fontWeight: '700' },
        barBg: {
          height: 8,
          borderRadius: 999,
          backgroundColor: colors.surface2,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
        },
        barFg: {
          height: '100%',
          width: `${Math.min(100, pct)}%`,
          borderRadius: 999,
          backgroundColor: pct >= 100 ? colors.accent : colors.accentDim,
        },
      }),
    [colors, pct],
  );

  const curDisp = Number.isFinite(a) ? Math.round(a) : 0;
  const tgtDisp = Number.isFinite(t) && t > 0 ? Math.round(t) : '—';

  return (
    <View style={styles.row}>
      <View style={styles.top}>
        <Text style={styles.lab}>{label}</Text>
        <Text style={styles.val}>
          {curDisp} / {tgtDisp}
        </Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFg, { opacity: pct >= 100 ? 1 : 0.85 }]} />
      </View>
    </View>
  );
}

export function TodayTasksSection() {
  enableLayoutAnim();
  const router = useRouter();
  const { colors, isDark } = useThemeColors();
  const {
    lastAiPlan,
    meals,
    dailyTasksProgress,
    toggleDailyWorkoutTaskDone,
  } = useAppData();

  const dayKey = todayDayKey();
  const planKey = getPlanStableKey(lastAiPlan);
  const dailyPlan = lastAiPlan ? buildDailyPlanForDay(lastAiPlan, dayKey) : null;

  const daySlice = planKey ? dailyTasksProgress?.[planKey]?.[dayKey] : null;
  const workoutsDoneMap = daySlice?.workouts && typeof daySlice.workouts === 'object' ? daySlice.workouts : {};

  const anim = useRef(new Animated.Value(0)).current;
  const prevAllCompleteRef = useRef(false);

  const actualNut = sumNutritionActual(meals, dayKey);
  const ratios = dailyPlan ? nutritionRatios(dailyPlan.nutrition, actualNut) : { overall: 0, perMacro: {} };

  const totalWorkouts = dailyPlan?.workouts?.length || 0;
  const workoutDone =
    dailyPlan?.workouts?.filter((t) => workoutsDoneMap[t.id])?.length ?? 0;
  const nutritionOk =
    dailyPlan &&
    isNutritionTargetsMet(dailyPlan.nutrition, actualNut) &&
    isMealsCountMet(dailyPlan.nutrition.mealsCount, actualNut.mealCount);
  const allComplete =
    Boolean(dailyPlan) &&
    (totalWorkouts === 0 || workoutDone === totalWorkouts) &&
    nutritionOk === true;

  useEffect(() => {
    if (allComplete && !prevAllCompleteRef.current) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    prevAllCompleteRef.current = allComplete;
  }, [allComplete]);

  const streak = useMemo(
    () => computeDailyCompletionStreak(dailyTasksProgress, lastAiPlan, meals),
    [dailyTasksProgress, lastAiPlan, meals],
  );

  const denomBlocks = Math.max(totalWorkouts + 1, 1);
  const completedBlocks = workoutDone + (nutritionOk ? 1 : 0);
  const workoutFraction = totalWorkouts ? workoutDone / totalWorkouts : 1;
  const dayProgressFrac = Math.min(1, (workoutFraction + ratios.overall) / 2);
  const pctDay = Math.round(dayProgressFrac * 100);

  const completedCountLabel = `${workoutDone} / ${totalWorkouts || 0} упражнений`;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(1, Math.max(0, pctDay / 100)),
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [anim, pctDay]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        outer: {
          marginBottom: 22,
          shadowColor: isDark ? '#000' : '#0f172a',
          shadowOpacity: isDark ? 0.35 : 0.08,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 4,
        },
        hero: {
          borderRadius: 16,
          borderWidth: 1,
          padding: 16,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        titleRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 10,
          marginBottom: 6,
        },
        titleMain: {
          color: colors.text,
          fontSize: 18,
          fontWeight: '800',
        },
        titleDate: {
          color: colors.textMuted,
          fontSize: 13,
          fontWeight: '600',
          marginTop: 4,
        },
        metaPills: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 12,
        },
        pill: {
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderRadius: 999,
          backgroundColor: colors.surface2,
          borderWidth: 1,
          borderColor: colors.border,
        },
        pillText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
        progressOuter: {
          marginTop: 4,
          marginBottom: 12,
        },
        progressTop: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        },
        progressPct: {
          color: colors.accent,
          fontSize: 20,
          fontWeight: '800',
        },
        progressBarBg: {
          height: 12,
          borderRadius: 999,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface2,
        },
        progressBarFg: {
          height: '100%',
          borderRadius: 999,
          backgroundColor: colors.accent,
        },
        sectionSep: {
          marginTop: 6,
          marginBottom: 8,
          color: colors.text,
          fontSize: 15,
          fontWeight: '800',
        },
        rowExercise: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          paddingVertical: 10,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        chk: {
          width: 24,
          height: 24,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: colors.accent,
          marginTop: 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
        },
        chkOn: {
          backgroundColor: colors.accentDim,
          borderColor: colors.accent,
        },
        chkMark: { color: '#020617', fontSize: 16, fontWeight: '900' },
        exeText: { flex: 1, color: colors.textMuted, fontSize: 14, fontWeight: '600', lineHeight: 20 },
        congrats: {
          marginTop: 14,
          padding: 14,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: colors.accent,
          backgroundColor: colors.chipSelectedBg,
        },
        congratsTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 6 },
        congratsMsg: { color: colors.textMuted, fontSize: 14, lineHeight: 20, fontWeight: '600' },
        actionsRow: { marginTop: 12, gap: 10 },
        tinyHint: { color: colors.textMuted, fontSize: 12, marginTop: 10, fontWeight: '600' },
        mealsRowTop: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 8,
        },
      }),
    [colors, isDark],
  );

  if (!lastAiPlan?.plan || !dailyPlan) {
    return (
      <View style={styles.outer}>
        <Card>
          <Text style={[styles.titleMain, { marginBottom: 10 }]}>Задачи на сегодня</Text>
          <EmptyState
            emoji="🤖"
            title="Нет задач без плана"
            subtitle="Сгенерируйте AI-план, чтобы получить задачи."
          />
          <PrimaryButton title="Открыть генерацию ИИ" onPress={() => router.push('/(tabs)/generate-plan')} />
        </Card>
      </View>
    );
  }

  const barWidth = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  function toggleTask(id) {
    if (!planKey) {
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync?.();
    toggleDailyWorkoutTaskDone(planKey, dayKey, id);
  }

  return (
    <View style={styles.outer}>
      <View style={styles.hero}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.titleMain}>Задачи на сегодня</Text>
            <Text style={styles.titleDate}>
              {formatDayRu(dayKey)}
              {dailyPlan.dailyLabel ? ` · ${dailyPlan.dailyLabel}` : ''}
            </Text>
          </View>
          <Text style={styles.progressPct}>{pctDay}%</Text>
        </View>

        <View style={styles.metaPills}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Серия дней · {streak}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              {completedBlocks}/{denomBlocks} блоков выполнено
            </Text>
          </View>
        </View>

        <View style={styles.progressOuter}>
          <View style={styles.progressTop}>
            <Text style={[styles.sectionSep, { marginBottom: 0, marginTop: 0 }]}>
              Прогресс за день
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFg, { width: barWidth }]} />
          </View>
          <Text style={styles.tinyHint}>
            Тренировки и питание учитываются поровну. КБЖУ берутся из ваших записей за сегодня.
          </Text>
        </View>

        <Text style={styles.sectionSep}>🏋️ Тренировка</Text>
        {dailyPlan.workoutSessionMin != null ? (
          <Text style={[styles.exeText, { marginBottom: 8 }]}>
            Ориентир по времени: ~{dailyPlan.workoutSessionMin} мин
          </Text>
        ) : null}
        {dailyPlan.workouts.map((t) => {
          const on = Boolean(workoutsDoneMap[t.id]);
          return (
            <Pressable
              key={t.id}
              style={styles.rowExercise}
              onPress={() => toggleTask(t.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
            >
              <View style={[styles.chk, on && styles.chkOn]}>{on ? <Text style={styles.chkMark}>✓</Text> : null}</View>
              <Text style={styles.exeText}>{t.displayLine}</Text>
            </Pressable>
          );
        })}

        <Text style={[styles.sectionSep, { marginTop: 18 }]}>🍎 Питание</Text>
        <View style={styles.mealsRowTop}>
          <Text style={[styles.exeText, { fontWeight: '700', color: colors.text }]}>
            Цели по КБЖУ и приёмам пищи
          </Text>
          <Text style={[styles.exeText, { color: nutritionOk ? colors.accent : colors.textMuted }]}>
            {nutritionOk ? 'План закрыт' : 'В процессе'}
          </Text>
        </View>
        <MacroProgressRow
          label="Калории"
          current={actualNut.calories}
          target={dailyPlan.nutrition.calories}
          colors={colors}
        />
        <MacroProgressRow
          label="Белки (г)"
          current={actualNut.proteinG}
          target={dailyPlan.nutrition.proteinG}
          colors={colors}
        />
        <MacroProgressRow
          label="Жиры (г)"
          current={actualNut.fatG}
          target={dailyPlan.nutrition.fatG}
          colors={colors}
        />
        <MacroProgressRow
          label="Углеводы (г)"
          current={actualNut.carbsG}
          target={dailyPlan.nutrition.carbsG}
          colors={colors}
        />
        <View style={styles.mealsRowTop}>
          <Text style={styles.exeText}>Приёмы пищи</Text>
          <Text style={styles.exeText}>
            {actualNut.mealCount} /{' '}
            {dailyPlan.nutrition.mealsCount != null ? dailyPlan.nutrition.mealsCount : '—'}
          </Text>
        </View>

        {allComplete ? (
          <View style={styles.congrats}>
            <Text style={styles.congratsTitle}>Сегодня всё сделано! 🎉</Text>
            <Text style={styles.congratsMsg}>
              Отличный ритм: тренировки закрыты, КБЖУ и количество приёмов пищи соответствуют плану. Отдохните и
              восстановитесь — завтра новый шаг вперёд.
            </Text>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <PrimaryButton title="Посмотреть весь план" variant="outline" onPress={() => router.push('/plan-overview')} />
        </View>

        <Text style={styles.tinyHint}>
          {completedCountLabel}. Питание: {Math.round(ratios.overall * 100)}% к целям.
        </Text>
      </View>
    </View>
  );
}
