import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/store/ThemeContext';

export function EmptyState({ emoji = '📭', title, subtitle }) {
  const { colors } = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 40,
          paddingHorizontal: 24,
        },
        emoji: {
          fontSize: 40,
          marginBottom: 12,
        },
        title: {
          color: colors.text,
          fontSize: 17,
          fontWeight: '700',
          textAlign: 'center',
        },
        subtitle: {
          color: colors.textMuted,
          fontSize: 14,
          textAlign: 'center',
          marginTop: 8,
          lineHeight: 20,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}
