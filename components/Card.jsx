import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/store/ThemeContext';

export function Card({ children, style }) {
  const { colors } = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.border,
        },
      }),
    [colors],
  );

  return <View style={[styles.card, style]}>{children}</View>;
}
