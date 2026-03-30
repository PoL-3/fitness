import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { LabeledInput } from '@/components/LabeledInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAppData } from '@/store/AppDataContext';
import { useThemeColors } from '@/store/ThemeContext';
import { isValidDayKey, todayDayKey } from '@/utils/dateDay';
import { createId } from '@/utils/id';
import { embedBodyWeightInNotes, embedExercisesInNotes, splitNotesAndExercises } from '@/utils/workoutExercises';
import { parseOptionalPositiveNumber, validateRequired } from '@/utils/validation';

function emptyExerciseRow() {
  return {
    key: createId(),
    name: '',
    weightKg: '',
    reps: '',
    durationSec: '',
    sets: '',
  };
}

function rowKeyForSet(s) {
  const w = s?.weightKg != null ? Number(s.weightKg) : '';
  const r = s?.reps != null ? Number(s.reps) : '';
  const d = s?.durationSec != null ? Number(s.durationSec) : '';
  return `${w}|${r}|${d}`;
}

function rowsFromExercise(ex) {
  if (Array.isArray(ex?.setsData) && ex.setsData.length) {
    const map = new Map();
    for (const s of ex.setsData) {
      const k = rowKeyForSet(s);
      const prev = map.get(k);
      if (prev) {
        prev.sets += 1;
      } else {
        map.set(k, {
          key: createId(),
          name: ex.name || '',
          weightKg: s.weightKg != null ? String(s.weightKg) : '',
          reps: s.reps != null ? String(s.reps) : '',
          durationSec: s.durationSec != null ? String(s.durationSec) : '',
          sets: '1',
        });
      }
    }
    return [...map.values()].map((r) => ({ ...r, sets: String(r.sets) }));
  }
  return [
    {
      key: createId(),
      name: ex?.name || '',
      weightKg: ex?.weightKg != null ? String(ex.weightKg) : '',
      reps: ex?.reps != null ? String(ex.reps) : '',
      durationSec: ex?.durationSec != null ? String(ex.durationSec) : '',
      sets: ex?.sets != null ? String(ex.sets) : '',
    },
  ];
}

export function AddWorkoutScreen() {
  const { id: editId } = useLocalSearchParams();
  const { addWorkout, updateWorkout, getWorkoutById, hydrated } = useAppData();
  const { colors } = useThemeColors();
  const [title, setTitle] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [type, setType] = useState('');
  const [notes, setNotes] = useState('');
  const [bodyWeightKg, setBodyWeightKg] = useState('');
  const [exerciseRows, setExerciseRows] = useState([]);
  const [dateStr, setDateStr] = useState(todayDayKey());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editId || !hydrated) {
      return;
    }
    const w = getWorkoutById(typeof editId === 'string' ? editId : editId?.[0]);
    if (w) {
      const { userNotes, bodyWeightKg: bw, exercises } = splitNotesAndExercises(w.notes);
      setTitle(w.title || '');
      setDurationMin(w.durationMin != null ? String(w.durationMin) : '');
      setType(w.type || '');
      setNotes(userNotes || '');
      setBodyWeightKg(bw != null ? String(bw) : '');
      if (exercises?.length) {
        const rows = exercises.flatMap((ex) => rowsFromExercise(ex));
        setExerciseRows(rows);
      } else {
        setExerciseRows([]);
      }
      setDateStr(w.date || todayDayKey());
    }
  }, [editId, hydrated, getWorkoutById]);

  function addExerciseRow() {
    setExerciseRows((prev) => [...prev, emptyExerciseRow()]);
  }

  function removeExerciseRow(key) {
    setExerciseRows((prev) => prev.filter((r) => r.key !== key));
  }

  function updateRow(key, field, value) {
    setExerciseRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function handleSave() {
    setError('');
    const req = validateRequired(title, 'Название');
    if (req) {
      setError(req);
      return;
    }
    if (!isValidDayKey(dateStr.trim())) {
      setError('Дата: формат ГГГГ-ММ-ДД (например 2026-03-25)');
      return;
    }

    const bw = parseOptionalPositiveNumber(bodyWeightKg, 'Вес (кг)', 400);
    if (!bw.ok) {
      setError(bw.error);
      return;
    }

    const dur = parseOptionalPositiveNumber(durationMin, 'Длительность', 24 * 60);
    if (!dur.ok) {
      setError(dur.error);
      return;
    }
    const day = dateStr.trim();

    const grouped = new Map();
    for (const row of exerciseRows) {
      const n = row.name.trim();
      if (!n) {
        continue;
      }
      if (!grouped.has(n.toLowerCase())) {
        grouped.set(n.toLowerCase(), { name: n, setsData: [] });
      }
      const exObj = grouped.get(n.toLowerCase());
      const w = parseOptionalPositiveNumber(row.weightKg, 'Вес (кг)', 2000);
      if (!w.ok) {
        setError(w.error);
        return;
      }
      const weightKg = w.value != null ? w.value : undefined;
      const r = parseOptionalPositiveNumber(row.reps, 'Повторы', 100000);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const reps = r.value != null ? Math.round(r.value) : undefined;
      const d = parseOptionalPositiveNumber(row.durationSec, 'Секунды', 86400);
      if (!d.ok) {
        setError(d.error);
        return;
      }
      const durationSec = d.value != null ? Math.round(d.value) : undefined;
      const s = parseOptionalPositiveNumber(row.sets, 'Подходы', 1000);
      if (!s.ok) {
        setError(s.error);
        return;
      }
      const setCount = s.value != null ? Math.max(1, Math.round(s.value)) : 1;
      for (let i = 0; i < setCount; i += 1) {
        exObj.setsData.push({ weightKg, reps, durationSec });
      }
    }

    const builtExercises = [...grouped.values()].map((ex) => {
      let maxWeight = 0;
      let maxReps = 0;
      let maxDuration = 0;
      for (const s of ex.setsData) {
        if (Number(s.weightKg) > maxWeight) maxWeight = Number(s.weightKg);
        if (Number(s.reps) > maxReps) maxReps = Number(s.reps);
        if (Number(s.durationSec) > maxDuration) maxDuration = Number(s.durationSec);
      }
      return {
        name: ex.name,
        setsData: ex.setsData,
        weightKg: maxWeight || undefined,
        reps: maxReps || undefined,
        durationSec: maxDuration || undefined,
        sets: ex.setsData.length || undefined,
      };
    });

    const notesWithBody = embedBodyWeightInNotes(notes, bw.value);
    const notesWithEx = embedExercisesInNotes(notesWithBody, builtExercises);

    const payload = {
      title: title.trim(),
      durationMin: dur.value,
      type: type.trim() || null,
      notes: notesWithEx,
      date: day,
      exercises: builtExercises,
    };

    if (editId) {
      const id = typeof editId === 'string' ? editId : editId?.[0];
      updateWorkout(id, payload);
    } else {
      addWorkout(payload);
    }
    router.back();
  }

  return (
    <AppScreen scroll>
      <Text style={[styles.caption, { color: colors.textMuted }]}>
        {editId
          ? 'Измените поля и сохраните — запись обновится в списке и в истории по дням.'
          : 'Укажите день (календарную дату) — запись попадёт в историю и фильтр по дате.'}
      </Text>

      {error ? <Text style={[styles.error, { color: colors.warning }]}>{error}</Text> : null}

      <LabeledInput
        label="Дата дня (ГГГГ-ММ-ДД) *"
        placeholder={todayDayKey()}
        value={dateStr}
        onChangeText={setDateStr}
        autoCapitalize="none"
      />
      <LabeledInput label="Название *" placeholder="Например, Силовая — верх" value={title} onChangeText={setTitle} />
      <LabeledInput
        label="Ваш вес в этот день (кг, опционально)"
        keyboardType="decimal-pad"
        value={bodyWeightKg}
        onChangeText={setBodyWeightKg}
      />
      <LabeledInput
        label="Длительность (мин)"
        placeholder="45"
        keyboardType="number-pad"
        value={durationMin}
        onChangeText={setDurationMin}
      />
      <LabeledInput label="Тип" placeholder="Кардио, силовая, растяжка…" value={type} onChangeText={setType} />
      <LabeledInput
        label="Заметки"
        placeholder="Ощущения, комментарии…"
        multiline
        numberOfLines={4}
        inputStyle={styles.notesInput}
        value={notes}
        onChangeText={setNotes}
      />

      <Text style={[styles.blockTitle, { color: colors.text }]}>Упражнения (для целей)</Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Можно добавить несколько строк с одним и тем же упражнением, но разным весом. При сохранении они объединяются в
        структуру sets (вес/повторы/секунды на каждый подход).
      </Text>

      {exerciseRows.map((row) => (
        <View key={row.key} style={[styles.exBlock, { borderColor: colors.border }]}>
          <LabeledInput
            label="Упражнение"
            placeholder="Жим лёжа"
            value={row.name}
            onChangeText={(t) => updateRow(row.key, 'name', t)}
          />
          <View style={styles.exGrid}>
            <View style={styles.exCell}>
              <LabeledInput
                label="Вес (кг)"
                keyboardType="decimal-pad"
                value={row.weightKg}
                onChangeText={(t) => updateRow(row.key, 'weightKg', t)}
              />
            </View>
            <View style={styles.exCell}>
              <LabeledInput
                label="Повторы"
                keyboardType="number-pad"
                value={row.reps}
                onChangeText={(t) => updateRow(row.key, 'reps', t)}
              />
            </View>
            <View style={styles.exCell}>
              <LabeledInput
                label="Секунды"
                keyboardType="number-pad"
                value={row.durationSec}
                onChangeText={(t) => updateRow(row.key, 'durationSec', t)}
              />
            </View>
            <View style={styles.exCell}>
              <LabeledInput
                label="Подходы"
                keyboardType="number-pad"
                value={row.sets}
                onChangeText={(t) => updateRow(row.key, 'sets', t)}
              />
            </View>
          </View>
          <Pressable onPress={() => removeExerciseRow(row.key)} hitSlop={8}>
            <Text style={{ color: colors.warning, fontWeight: '700', marginTop: 4 }}>Удалить упражнение</Text>
          </Pressable>
        </View>
      ))}

      <PrimaryButton title="Добавить упражнение" variant="outline" onPress={addExerciseRow} style={styles.addEx} />

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
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  blockTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  exBlock: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  exGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exCell: {
    flex: 1,
    minWidth: 100,
  },
  addEx: {
    marginBottom: 12,
  },
  cancel: {
    marginTop: 10,
  },
});
