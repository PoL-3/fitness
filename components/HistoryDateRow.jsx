import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/store/ThemeContext';
import { formatDayRu } from '@/utils/dateDay';

/**
 * Одна строка в списке истории: кликабельная дата.
 */
export function HistoryDateRow({ dayKey, count, onPress }) {
  const { colors } = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          marginBottom: 10,
        },
        label: {
          fontSize: 17,
          fontWeight: '700',
          color: colors.text,
        },
        sub: {
          fontSize: 13,
          color: colors.textMuted,
          marginTop: 4,
        },
        badge: {
          backgroundColor: colors.surface2,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 8,
        },
        badgeText: {
          color: colors.accent,
          fontWeight: '700',
          fontSize: 14,
        },
      }),
    [colors],
  );

  return (
    <Pressable onPress={() => onPress(dayKey)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
      <View>
        <Text style={styles.label}>{formatDayRu(dayKey)}</Text>
        <Text style={styles.sub}>{dayKey}</Text>
      </View>
      {count != null ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
