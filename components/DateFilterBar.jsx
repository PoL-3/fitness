import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LabeledInput } from '@/components/LabeledInput';
import { useThemeColors } from '@/store/ThemeContext';
import { formatDayRu, isValidDayKey, todayDayKey } from '@/utils/dateDay';

/**
 * Фильтр по дате: ввод YYYY-MM-DD, кнопки «Сегодня» и «Все дни».
 */
export function DateFilterBar({ value, onChange }) {
  const { colors } = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 12,
        },
        chip: {
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface2,
        },
        chipText: {
          color: colors.text,
          fontWeight: '600',
          fontSize: 13,
        },
        hint: {
          fontSize: 12,
          color: colors.textMuted,
          marginBottom: 6,
        },
      }),
    [colors],
  );

  const hint =
    value && isValidDayKey(value) ? `Показано: ${formatDayRu(value)}` : value ? 'Неверный формат, используйте ГГГГ-ММ-ДД' : 'Показаны все дни';

  return (
    <View>
      <Text style={styles.hint}>{hint}</Text>
      <LabeledInput
        label="Фильтр по дате (ГГГГ-ММ-ДД)"
        placeholder={todayDayKey()}
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View style={styles.row}>
        <Pressable style={styles.chip} onPress={() => onChange(todayDayKey())}>
          <Text style={styles.chipText}>Сегодня</Text>
        </Pressable>
        <Pressable style={styles.chip} onPress={() => onChange('')}>
          <Text style={styles.chipText}>Все дни</Text>
        </Pressable>
      </View>
    </View>
  );
}
