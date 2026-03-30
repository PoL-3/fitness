import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { Card } from '@/components/Card';
import { LabeledInput } from '@/components/LabeledInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { apiJson } from '@/constants/api';
import { useAppData } from '@/store/AppDataContext';
import { useAuth } from '@/store/AuthContext';
import { useThemeColors } from '@/store/ThemeContext';
import { parseRequiredPositiveNumber } from '@/utils/validation';

const GOALS = [
  { value: 'weight_loss', label: 'Похудение' },
  { value: 'muscle_gain', label: 'Набор массы' },
];

const LEVELS = [
  { value: 'beginner', label: 'Начальный' },
  { value: 'intermediate', label: 'Средний' },
  { value: 'advanced', label: 'Продвинутый' },
];

export function GeneratePlanScreen() {
  const { token } = useAuth();
  const { setLastAiPlan } = useAppData();
  const { colors } = useThemeColors();
  const [goal, setGoal] = useState('weight_loss');
  const [level, setLevel] = useState('beginner');
  const [weightKg, setWeightKg] = useState('75');
  const [heightCm, setHeightCm] = useState('180');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [planId, setPlanId] = useState(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        label: {
          color: colors.textMuted,
          fontSize: 13,
          fontWeight: '600',
          marginBottom: 8,
          marginTop: 4,
        },
        chips: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 12,
        },
        chip: {
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface2,
        },
        chipSelected: {
          borderColor: colors.accent,
          backgroundColor: colors.chipSelectedBg,
        },
        chipPressed: {
          opacity: 0.85,
        },
        chipText: {
          color: colors.textMuted,
          fontWeight: '600',
        },
        chipTextSelected: {
          color: colors.text,
        },
        loaderWrap: {
          alignItems: 'center',
          marginTop: 16,
          marginBottom: 8,
        },
        loaderHint: {
          color: colors.textMuted,
          fontSize: 13,
          marginTop: 10,
          textAlign: 'center',
        },
        error: {
          color: colors.warning,
          marginTop: 12,
          fontWeight: '600',
        },
        saved: {
          color: colors.accent,
          marginTop: 12,
          fontSize: 13,
          fontWeight: '600',
        },
        result: {
          marginTop: 20,
        },
        blockTitle: {
          color: colors.text,
          fontSize: 17,
          fontWeight: '800',
          marginBottom: 10,
          marginTop: 8,
        },
        summary: {
          color: colors.textMuted,
          fontSize: 15,
          lineHeight: 22,
        },
        cardGap: {
          marginBottom: 10,
        },
        wTitle: {
          color: colors.text,
          fontWeight: '700',
          fontSize: 15,
          marginBottom: 6,
        },
        wBody: {
          color: colors.textMuted,
          fontSize: 14,
          lineHeight: 20,
        },
        taskDay: {
          color: colors.accent,
          fontWeight: '700',
          marginBottom: 4,
        },
        taskLine: {
          color: colors.textMuted,
          fontSize: 14,
          marginLeft: 8,
          marginBottom: 2,
        },
      }),
    [colors],
  );

  async function handleGenerate() {
    setError('');
    setResult(null);
    setPlanId(null);

    const w = parseRequiredPositiveNumber(weightKg, 'Вес', 400);
    const h = parseRequiredPositiveNumber(heightCm, 'Рост', 300);
    if (!w.ok) {
      setError(w.error);
      return;
    }
    if (!h.ok) {
      setError(h.error);
      return;
    }

    setLoading(true);
    try {
      const { res, data } = await apiJson('/generate-plan', {
        method: 'POST',
        token: token || undefined,
        body: {
          goal,
          level,
          weightKg: w.value,
          heightCm: h.value,
        },
      });

      if (!res.ok) {
        const msg =
          data.error ||
          data.errors?.join?.('; ') ||
          `Ошибка сервера (${res.status})`;
        throw new Error(msg);
      }
      if (!data.ok) {
        throw new Error(data.error || 'Неизвестная ошибка');
      }

      setResult(data.plan);
      setPlanId(data.planId);
      setLastAiPlan({
        planId: data.planId,
        plan: data.plan,
        savedAt: Date.now(),
      });
    } catch (e) {
      setError(e.message || 'Сеть недоступна. Проверьте URL API и что backend запущен.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppScreen scroll>
      <ScreenHeader
        title="Генерация плана"
        subtitle="План на месяц + ежедневные задачи. Ключ DeepSeek только на сервере."
      />

      <Text style={styles.label}>Цель</Text>
      <View style={styles.chips}>
        {GOALS.map((g) => (
          <Chip key={g.value} label={g.label} selected={goal === g.value} onPress={() => setGoal(g.value)} styles={styles} />
        ))}
      </View>

      <Text style={styles.label}>Уровень</Text>
      <View style={styles.chips}>
        {LEVELS.map((l) => (
          <Chip key={l.value} label={l.label} selected={level === l.value} onPress={() => setLevel(l.value)} styles={styles} />
        ))}
      </View>

      <LabeledInput label="Вес (кг)" keyboardType="decimal-pad" value={weightKg} onChangeText={setWeightKg} />
      <LabeledInput label="Рост (см)" keyboardType="decimal-pad" value={heightCm} onChangeText={setHeightCm} />

      <PrimaryButton title="Сгенерировать" onPress={handleGenerate} loading={loading} />

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loaderHint}>Запрос к DeepSeek может занять 1–2 минуты</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {planId != null ? <Text style={styles.saved}>Сохранено в БД, plan_id: {planId}</Text> : null}

      {result ? (
        <View style={styles.result}>
          <Card>
            <Text style={styles.blockTitle}>Кратко</Text>
            <Text style={styles.summary}>{result.summary}</Text>
          </Card>

          {result.monthly_overview ? (
            <Card style={styles.cardGap}>
              <Text style={styles.blockTitle}>Обзор месяца</Text>
              <Text style={styles.summary}>{result.monthly_overview}</Text>
            </Card>
          ) : null}

          <Text style={styles.blockTitle}>Задачи по дням</Text>
          {result.daily_tasks?.map((d, i) => (
            <Card key={i} style={styles.cardGap}>
              <Text style={styles.taskDay}>
                {d.label || `День ${d.day_index}`}
              </Text>
              {(d.tasks || []).map((t, j) => (
                <Text key={j} style={styles.taskLine}>
                  • {t}
                </Text>
              ))}
            </Card>
          ))}

          <Text style={styles.blockTitle}>Тренировки (план)</Text>
          {result.workouts?.map((w, i) => (
            <Card key={i} style={styles.cardGap}>
              <Text style={styles.wTitle}>
                Нед.{w.week_number ?? '?'} День {w.day_number}: {w.title}
              </Text>
              <Text style={styles.wBody}>{w.content}</Text>
            </Card>
          ))}

          <Text style={styles.blockTitle}>Питание (рекомендации)</Text>
          {result.meals?.map((m, i) => (
            <Card key={i} style={styles.cardGap}>
              <Text style={styles.wTitle}>
                {m.meal_type}
                {m.calories != null ? ` · ~${m.calories} ккал` : ''}
              </Text>
              <Text style={styles.wBody}>{m.description}</Text>
            </Card>
          ))}
        </View>
      ) : null}
    </AppScreen>
  );
}

function Chip({ label, selected, onPress, styles: st }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [st.chip, selected && st.chipSelected, pressed && st.chipPressed]}
    >
      <Text style={[st.chipText, selected && st.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}
