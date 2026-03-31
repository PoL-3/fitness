import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { LabeledInput } from '@/components/LabeledInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAppData } from '@/store/AppDataContext';
import { useThemeColors } from '@/store/ThemeContext';
import { isValidDayKey, todayDayKey } from '@/utils/dateDay';
import { parseOptionalPositiveNumber, validateRequired } from '@/utils/validation';

export function AddMealScreen() {
  const { id: editId } = useLocalSearchParams();
  const { addMeal, updateMeal, getMealById, hydrated } = useAppData();
  const { colors } = useThemeColors();
  const [mealLabel, setMealLabel] = useState('');
  const [calories, setCalories] = useState('');
  const [proteinG, setProteinG] = useState('');
  const [fatG, setFatG] = useState('');
  const [carbsG, setCarbsG] = useState('');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState(todayDayKey());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editId || !hydrated) {
      return;
    }
    const m = getMealById(typeof editId === 'string' ? editId : editId?.[0]);
    if (m) {
      setMealLabel(m.mealLabel || '');
      setCalories(m.calories != null ? String(m.calories) : '');
      setProteinG(m.proteinG != null ? String(m.proteinG) : '');
      setFatG(m.fatG != null ? String(m.fatG) : '');
      setCarbsG(m.carbsG != null ? String(m.carbsG) : '');
      setDescription(m.description || '');
      setDateStr(m.date || todayDayKey());
    }
  }, [editId, hydrated, getMealById]);

  function handleSave() {
    setError('');
    const req = validateRequired(mealLabel, 'Приём пищи');
    if (req) {
      setError(req);
      return;
    }
    if (!isValidDayKey(dateStr.trim())) {
      setError('Дата: формат ГГГГ-ММ-ДД');
      return;
    }
    const cal = parseOptionalPositiveNumber(calories, 'Калории', 20000);
    if (!cal.ok) {
      setError(cal.error);
      return;
    }
    const p = parseOptionalPositiveNumber(proteinG, 'Белки (г)', 2000);
    if (!p.ok) {
      setError(p.error);
      return;
    }
    const f = parseOptionalPositiveNumber(fatG, 'Жиры (г)', 2000);
    if (!f.ok) {
      setError(f.error);
      return;
    }
    const c = parseOptionalPositiveNumber(carbsG, 'Углеводы (г)', 2000);
    if (!c.ok) {
      setError(c.error);
      return;
    }
    const day = dateStr.trim();
    const payload = {
      mealLabel: mealLabel.trim(),
      calories: cal.value != null ? Math.round(cal.value) : null,
      proteinG: p.value != null ? Math.round(p.value * 10) / 10 : null,
      fatG: f.value != null ? Math.round(f.value * 10) / 10 : null,
      carbsG: c.value != null ? Math.round(c.value * 10) / 10 : null,
      description: description.trim() || null,
      date: day,
    };

    if (editId) {
      const id = typeof editId === 'string' ? editId : editId?.[0];
      updateMeal(id, payload);
    } else {
      addMeal(payload);
    }
    router.back();
  }

  return (
    <AppScreen scroll>
      <Text style={[styles.caption, { color: colors.textMuted }]}>
        {editId
          ? 'Измените поля — запись обновится в списке и в истории.'
          : 'Дата задаёт календарный день для истории и фильтра.'}
      </Text>

      {error ? <Text style={[styles.error, { color: colors.warning }]}>{error}</Text> : null}

      <LabeledInput
        label="Дата дня (ГГГГ-ММ-ДД) *"
        placeholder={todayDayKey()}
        value={dateStr}
        onChangeText={setDateStr}
        autoCapitalize="none"
      />
      <LabeledInput label="Приём пищи *" placeholder="Завтрак, обед, ужин…" value={mealLabel} onChangeText={setMealLabel} />
      <LabeledInput
        label="Ккал (примерно)"
        placeholder="520"
        keyboardType="number-pad"
        value={calories}
        onChangeText={setCalories}
      />
      <LabeledInput
        label="Белки (г)"
        placeholder="опционально"
        keyboardType="decimal-pad"
        value={proteinG}
        onChangeText={setProteinG}
      />
      <LabeledInput
        label="Жиры (г)"
        placeholder="опционально"
        keyboardType="decimal-pad"
        value={fatG}
        onChangeText={setFatG}
      />
      <LabeledInput
        label="Углеводы (г)"
        placeholder="опционально"
        keyboardType="decimal-pad"
        value={carbsG}
        onChangeText={setCarbsG}
      />
      <LabeledInput
        label="Что ели"
        placeholder="Овсянка, яйца, салат…"
        multiline
        numberOfLines={3}
        inputStyle={styles.descInput}
        value={description}
        onChangeText={setDescription}
      />

      <PrimaryButton title={editId ? 'Сохранить изменения' : 'Сохранить'} onPress={handleSave} />
      <PrimaryButton title="Отмена" variant="outline" onPress={() => router.back()} style={styles.cancel} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  error: {
    marginBottom: 12,
    fontWeight: '600',
  },
  descInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  cancel: {
    marginTop: 10,
  },
});
