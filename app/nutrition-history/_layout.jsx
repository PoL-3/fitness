import { Stack } from 'expo-router';

import { useThemeColors } from '@/store/ThemeContext';

export default function NutritionHistoryLayout() {
  const { colors } = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Назад',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'История питания' }} />
      <Stack.Screen name="[day]" options={{ title: 'Питание за день' }} />
    </Stack>
  );
}
