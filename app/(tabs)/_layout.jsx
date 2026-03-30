import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { useThemeColors } from '@/store/ThemeContext';

export default function TabLayout() {
  const { colors } = useThemeColors();

  function tabIcon(name, focused) {
    return <Ionicons name={name} size={24} color={focused ? colors.accent : colors.textMuted} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Главная',
          tabBarIcon: ({ focused }) => tabIcon(focused ? 'home' : 'home-outline', focused),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Цели',
          tabBarIcon: ({ focused }) => tabIcon(focused ? 'flag' : 'flag-outline', focused),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Тренировки',
          tabBarIcon: ({ focused }) => tabIcon(focused ? 'barbell' : 'barbell-outline', focused),
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Питание',
          tabBarIcon: ({ focused }) => tabIcon(focused ? 'restaurant' : 'restaurant-outline', focused),
        }}
      />
      <Tabs.Screen
        name="generate-plan"
        options={{
          title: 'План ИИ',
          tabBarIcon: ({ focused }) => tabIcon(focused ? 'sparkles' : 'sparkles-outline', focused),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ focused }) => tabIcon(focused ? 'person' : 'person-outline', focused),
        }}
      />
    </Tabs>
  );
}
