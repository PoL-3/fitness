import { Stack } from 'expo-router';

import { useThemeColors } from '@/store/ThemeContext';

export default function WorkoutsHistoryLayout() {
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
      <Stack.Screen name="index" options={{ title: 'История тренировок' }} />
      <Stack.Screen name="[day]" options={{ title: 'Тренировки за день' }} />
    </Stack>
  );
}
