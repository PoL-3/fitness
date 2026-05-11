import { ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AppDataProvider } from '@/store/AppDataContext';
import { AuthProvider } from '@/store/AuthContext';
import { ThemeModeProvider, useThemeColors } from '@/store/ThemeContext';

function RootStack() {
  const { navigationTheme, colors, isDark } = useThemeColors();

  const stackScreenOptions = {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.text,
    headerTitleStyle: { fontWeight: '700' },
    contentStyle: { backgroundColor: colors.bg },
    headerBackTitle: 'Назад',
    headerTruncatedBackTitle: 'Назад',
  };

  return (
    <NavThemeProvider value={navigationTheme}>
      <AuthProvider>
        <AppDataProvider>
          <Stack screenOptions={stackScreenOptions}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="auth-start" options={{ title: 'Начало работы', headerBackTitle: 'Назад' }} />
            <Stack.Screen name="login" options={{ title: 'Вход' }} />
            <Stack.Screen name="register" options={{ title: 'Регистрация' }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="add-workout"
              options={{
                presentation: 'modal',
                title: 'Новая тренировка',
                headerBackTitle: 'Назад',
              }}
            />
            <Stack.Screen
              name="add-meal"
              options={{
                presentation: 'modal',
                title: 'Приём пищи',
                headerBackTitle: 'Назад',
              }}
            />
            <Stack.Screen name="workout/[id]" options={{ title: 'Тренировка', headerBackTitle: 'Назад' }} />
            <Stack.Screen name="meal/[id]" options={{ title: 'Приём пищи', headerBackTitle: 'Назад' }} />
            <Stack.Screen name="workouts-history" options={{ headerShown: false }} />
            <Stack.Screen name="nutrition-history" options={{ headerShown: false }} />
            <Stack.Screen
              name="edit-workout/[id]"
              options={{
                presentation: 'modal',
                title: 'Редактировать тренировку',
                headerBackTitle: 'Назад',
              }}
            />
            <Stack.Screen
              name="edit-meal/[id]"
              options={{
                presentation: 'modal',
                title: 'Редактировать приём пищи',
                headerBackTitle: 'Назад',
              }}
            />
            <Stack.Screen name="progress" options={{ title: 'Прогресс', headerBackTitle: 'Назад' }} />
            <Stack.Screen name="plan-overview" options={{ title: 'Весь план', headerBackTitle: 'Назад' }} />
            <Stack.Screen
              name="celebration"
              options={{
                presentation: 'modal',
                title: '',
                headerShown: false,
              }}
            />
          </Stack>
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </AppDataProvider>
      </AuthProvider>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <RootStack />
    </ThemeModeProvider>
  );
}
