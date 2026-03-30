import { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useThemeColors } from '@/store/ThemeContext';

export function LabeledInput({ label, style, inputStyle, ...inputProps }) {
  const { colors } = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginBottom: 14,
        },
        label: {
          color: colors.textMuted,
          fontSize: 13,
          marginBottom: 6,
          fontWeight: '600',
        },
        input: {
          backgroundColor: colors.surface2,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 16,
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.border,
        },
      }),
    [colors],
  );

  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, inputStyle]}
        placeholderTextColor={colors.textMuted}
        {...inputProps}
      />
    </View>
  );
}
