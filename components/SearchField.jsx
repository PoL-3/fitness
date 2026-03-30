import { useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useThemeColors } from '@/store/ThemeContext';

export function SearchField({ value, onChangeText, placeholder = 'Поиск…' }) {
  const { colors } = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        input: {
          backgroundColor: colors.surface2,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
          fontSize: 16,
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 12,
        },
      }),
    [colors],
  );

  return (
    <View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        autoCapitalize="none"
      />
    </View>
  );
}
