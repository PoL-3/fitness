import { useMemo } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeColors } from '@/store/ThemeContext';

export function AppScreen({ children, scroll = false }) {
  const { colors } = useThemeColors();
  const { width } = useWindowDimensions();
  const isWide = width >= 600;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: {
          flex: 1,
          backgroundColor: colors.bg,
        },
        fill: {
          flex: 1,
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 16,
          maxWidth: isWide ? 560 : undefined,
          alignSelf: isWide ? 'center' : 'stretch',
          width: isWide ? '100%' : undefined,
        },
        scrollContent: {
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 32,
          flexGrow: 1,
          maxWidth: isWide ? 560 : undefined,
          alignSelf: isWide ? 'center' : 'stretch',
          width: isWide ? '100%' : undefined,
        },
      }),
    [colors, isWide],
  );

  if (scroll) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.fill}>{children}</View>
    </SafeAreaView>
  );
}
