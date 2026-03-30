import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { useThemeColors } from '@/store/ThemeContext';

export function PrimaryButton({ title, onPress, disabled, loading, variant = 'primary', style }) {
  const { colors } = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 48,
        },
        filled: {
          backgroundColor: colors.accent,
        },
        outline: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        },
        disabled: {
          opacity: 0.55,
        },
        label: {
          color: '#020617',
          fontSize: 16,
          fontWeight: '700',
        },
        labelOutline: {
          color: colors.text,
        },
      }),
    [colors],
  );

  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      style={[
        styles.base,
        isOutline ? styles.outline : styles.filled,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.88}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.accent : '#020617'} />
      ) : (
        <Text style={[styles.label, isOutline && styles.labelOutline]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
