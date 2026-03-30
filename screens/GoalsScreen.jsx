import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { Card } from '@/components/Card';
import { LabeledInput } from '@/components/LabeledInput';
import { ModalForm } from '@/components/ModalForm';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAppData } from '@/store/AppDataContext';
import { useAuth } from '@/store/AuthContext';
import { useThemeColors } from '@/store/ThemeContext';
import { metricTypeLabel } from '@/utils/progress';
import { extractBodyWeightKgFromNotes } from '@/utils/workoutExercises';
import { parseOptionalPositiveNumber, parseRequiredPositiveNumber } from '@/utils/validation';

export function GoalsScreen() {
  const { goals, setGoals, exerciseGoals, addExerciseGoal, removeExerciseGoal, workouts } = useAppData();
  const { user } = useAuth();
  const { colors } = useThemeColors();

  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [bodyModalVisible, setBodyModalVisible] = useState(false);

  const [exerciseName, setExerciseName] = useState('');
  const [exerciseTargetWeight, setExerciseTargetWeight] = useState('');
  const [exerciseTargetReps, setExerciseTargetReps] = useState('');
  const [exerciseTargetDuration, setExerciseTargetDuration] = useState('');
  const [exerciseTargetSets, setExerciseTargetSets] = useState('');
  const [exerciseReferenceWeight, setExerciseReferenceWeight] = useState('');
  const [exerciseError, setExerciseError] = useState('');

  const [goalType, setGoalType] = useState(goals?.goalType || 'weight_loss');
  const [startWeight, setStartWeight] = useState(
    goals?.startWeight != null ? String(goals.startWeight) : user?.weightKg != null ? String(user.weightKg) : '80',
  );
  const [targetWeight, setTargetWeight] = useState(goals?.targetWeight != null ? String(goals.targetWeight) : '75');
  const [deadline, setDeadline] = useState(goals?.deadline || new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10));
  const [weightError, setWeightError] = useState('');

  useEffect(() => {
    if (!bodyModalVisible) {
      return;
    }
    let best = null;
    let bestAt = -1;
    for (const w of workouts) {
      const bw = extractBodyWeightKgFromNotes(w.notes);
      if (bw == null) continue;
      const at = w.createdAt || 0;
      if (at >= bestAt) {
        bestAt = at;
        best = bw;
      }
    }
    if (best != null) {
      setStartWeight(String(best));
    }
  }, [bodyModalVisible, workouts]);

  function saveExerciseGoal() {
    setExerciseError('');
    const name = exerciseName.trim();
    if (!name) {
      setExerciseError('Укажите упражнение');
      return;
    }
    const w = parseOptionalPositiveNumber(exerciseTargetWeight, 'Цель вес (кг)', 1e7);
    if (!w.ok) return setExerciseError(w.error);
    const r = parseOptionalPositiveNumber(exerciseTargetReps, 'Цель повторы', 100000);
    if (!r.ok) return setExerciseError(r.error);
    const d = parseOptionalPositiveNumber(exerciseTargetDuration, 'Цель длительность (сек)', 86400);
    if (!d.ok) return setExerciseError(d.error);
    const s = parseOptionalPositiveNumber(exerciseTargetSets, 'Цель подходы', 1000);
    if (!s.ok) return setExerciseError(s.error);

    const metricTargets = {};
    if (w.value != null) metricTargets.weight = w.value;
    if (r.value != null) metricTargets.reps = Math.round(r.value);
    if (d.value != null) metricTargets.duration = Math.round(d.value);
    if (s.value != null) metricTargets.sets = Math.round(s.value);

    if (Object.keys(metricTargets).length === 0) {
      setExerciseError('Заполните хотя бы одну цель (вес / повторы / длительность / подходы)');
      return;
    }

    const rw = parseOptionalPositiveNumber(exerciseReferenceWeight, 'Вес для отслеживания (кг)', 1000);
    if (!rw.ok) {
      setExerciseError(rw.error);
      return;
    }

    addExerciseGoal({
      exerciseName: name,
      metricTargets,
      ...(rw.value != null ? { referenceWeightKg: rw.value } : {}),
    });
    setExerciseName('');
    setExerciseTargetWeight('');
    setExerciseTargetReps('');
    setExerciseTargetDuration('');
    setExerciseTargetSets('');
    setExerciseReferenceWeight('');
    setExerciseModalVisible(false);
  }

  function saveBodyGoal() {
    setWeightError('');
    const sw = parseRequiredPositiveNumber(startWeight, 'Текущий вес', 400);
    const tw = parseRequiredPositiveNumber(targetWeight, 'Целевой вес', 400);
    if (!sw.ok) {
      setWeightError(sw.error);
      return;
    }
    if (!tw.ok) {
      setWeightError(tw.error);
      return;
    }
    if (!deadline || deadline.length < 8) {
      setWeightError('Укажите срок (YYYY-MM-DD)');
      return;
    }
    if (goalType === 'weight_loss' && tw.value >= sw.value) {
      setWeightError('Для похудения целевой вес должен быть меньше текущего');
      return;
    }
    if (goalType === 'muscle_gain' && tw.value <= sw.value) {
      setWeightError('Для набора массы целевой вес должен быть больше текущего');
      return;
    }
    setGoals({
      goalType,
      startWeight: sw.value,
      targetWeight: tw.value,
      deadline,
      startedAt: goals?.startedAt || Date.now(),
    });
    setBodyModalVisible(false);
  }

  return (
    <AppScreen scroll>
      <ScreenHeader title="Цели" subtitle="Добавляйте цели и отслеживайте прогресс на отдельном экране" />

      <PrimaryButton title="Посмотреть прогресс" onPress={() => router.push('/progress')} style={styles.progressBtn} />

      <Text style={[styles.sectionHead, { color: colors.text }]}>Типы целей</Text>

      <Pressable style={[styles.goalTypeCard, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => setExerciseModalVisible(true)}>
        <Text style={[styles.goalTypeTitle, { color: colors.text }]}>Прогресс в упражнениях</Text>
        <Text style={[styles.goalTypeText, { color: colors.textMuted }]}>Выберите упражнение, метрику и цель. Откроется всплывающая форма.</Text>
      </Pressable>

      <Pressable style={[styles.goalTypeCard, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => setBodyModalVisible(true)}>
        <Text style={[styles.goalTypeTitle, { color: colors.text }]}>Цель по весу тела</Text>
        <Text style={[styles.goalTypeText, { color: colors.textMuted }]}>Текущий вес, целевой вес и срок в модальном окне.</Text>
      </Pressable>

      {exerciseGoals.length ? (
        <>
          <Text style={[styles.sectionHead, { color: colors.text, marginTop: 20 }]}>Добавленные цели упражнений</Text>
          <View style={styles.exList}>
            {exerciseGoals.map((g) => (
              <Card key={g.id} style={styles.exCard}>
                <View style={styles.exRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exTitle, { color: colors.text }]}>{g.exerciseName}</Text>
                    <Text style={[styles.exMeta, { color: colors.textMuted }]}>
                      {g.metricTargets
                        ? Object.entries(g.metricTargets)
                            .map(([k, v]) => `${metricTypeLabel(k)} → ${v}`)
                            .join(' · ')
                        : `${metricTypeLabel(g.metricType)} → ${g.targetValue}`}
                      {g.referenceWeightKg != null ? ` · вес: ${g.referenceWeightKg} кг` : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => removeExerciseGoal(g.id)} hitSlop={8}>
                    <Text style={{ color: colors.warning, fontWeight: '700' }}>Удалить</Text>
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      <ModalForm
        visible={exerciseModalVisible}
        onClose={() => setExerciseModalVisible(false)}
        title="Прогресс в упражнениях"
        subtitle="Форма: упражнение и цели по метрикам (вес / повторы / длительность / подходы)"
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
          <LabeledInput label="Упражнение" placeholder="Жим лёжа" value={exerciseName} onChangeText={setExerciseName} />
          <LabeledInput
            label="Цель вес (кг)"
            keyboardType="decimal-pad"
            value={exerciseTargetWeight}
            onChangeText={setExerciseTargetWeight}
          />
          <LabeledInput
            label="Цель повторы"
            keyboardType="number-pad"
            value={exerciseTargetReps}
            onChangeText={setExerciseTargetReps}
          />
          <LabeledInput
            label="Цель длительность (сек)"
            keyboardType="number-pad"
            value={exerciseTargetDuration}
            onChangeText={setExerciseTargetDuration}
          />
          <LabeledInput
            label="Цель подходы"
            keyboardType="number-pad"
            value={exerciseTargetSets}
            onChangeText={setExerciseTargetSets}
          />
          <LabeledInput
            label="Вес для отслеживания (кг, опционально)"
            keyboardType="decimal-pad"
            value={exerciseReferenceWeight}
            onChangeText={setExerciseReferenceWeight}
          />
          {exerciseError ? <Text style={[styles.err, { color: colors.warning }]}>{exerciseError}</Text> : null}
          <PrimaryButton title="Сохранить цель" onPress={saveExerciseGoal} />
        </ScrollView>
      </ModalForm>

      <ModalForm
        visible={bodyModalVisible}
        onClose={() => setBodyModalVisible(false)}
        title="Цель по весу тела"
        subtitle="Текущий вес, целевой вес и срок"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <Text style={[styles.lbl, { color: colors.textMuted }]}>Тип цели</Text>
          <View style={styles.row}>
            <Chip label="Похудение" selected={goalType === 'weight_loss'} onPress={() => setGoalType('weight_loss')} colors={colors} />
            <Chip label="Набор массы" selected={goalType === 'muscle_gain'} onPress={() => setGoalType('muscle_gain')} colors={colors} />
          </View>
          <LabeledInput label="Текущий вес (кг)" keyboardType="decimal-pad" value={startWeight} onChangeText={setStartWeight} />
          <LabeledInput label="Целевой вес (кг)" keyboardType="decimal-pad" value={targetWeight} onChangeText={setTargetWeight} />
          <LabeledInput label="Срок (YYYY-MM-DD)" placeholder="2026-06-01" value={deadline} onChangeText={setDeadline} />
          {weightError ? <Text style={[styles.err, { color: colors.warning }]}>{weightError}</Text> : null}
          <PrimaryButton title="Сохранить цель" onPress={saveBodyGoal} />
        </ScrollView>
      </ModalForm>
    </AppScreen>
  );
}

function Chip({ label, selected, onPress, colors }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: colors.border,
          backgroundColor: selected ? colors.chipSelectedBg : colors.surface2,
        },
      ]}
    >
      <Text style={{ color: selected ? colors.text : colors.textMuted, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lbl: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  err: {
    marginBottom: 10,
    fontWeight: '600',
  },
  progressBtn: {
    marginBottom: 20,
  },
  sectionHead: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  goalTypeCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  goalTypeTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  goalTypeText: {
    fontSize: 13,
    lineHeight: 18,
  },
  exList: {
    marginTop: 14,
    gap: 10,
  },
  exCard: {
    paddingVertical: 12,
  },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  exMeta: {
    fontSize: 13,
    marginTop: 4,
  },
});
