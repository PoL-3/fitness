import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAppData } from '@/store/AppDataContext';
import { useThemeColors } from '@/store/ThemeContext';
import { formatDayRu } from '@/utils/dateDay';
import { formatShortDate } from '@/utils/formatDate';

export function MealDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { getMealById } = useAppData();
  const { colors } = useThemeColors();
  const item = getMealById(typeof id === 'string' ? id : id?.[0]);

  if (!item) {
    return (
      <AppScreen scroll>
        <Text style={[styles.miss, { color: colors.textMuted }]}>Запись не найдена.</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <Text style={[styles.title, { color: colors.text }]}>{item.mealLabel || 'Приём пищи'}</Text>
      <Text style={[styles.date, { color: colors.textMuted }]}>{formatShortDate(item.createdAt)}</Text>
      {item.date ? (
        <Text style={[styles.dayLine, { color: colors.accent }]}>День: {formatDayRu(item.date)}</Text>
      ) : null}
      <Text style={[styles.kcal, { color: colors.accent }]}>
        {item.calories != null ? `~${item.calories} ккал` : 'Калории не указаны'}
      </Text>

      <Card style={styles.card}>
        <Text style={[styles.k, { color: colors.textMuted }]}>Описание</Text>
        <Text style={[styles.v, { color: colors.text }]}>{item.description || '—'}</Text>
      </Card>

      <PrimaryButton title="Редактировать" onPress={() => router.push(`/edit-meal/${item.id}`)} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  miss: {
    marginTop: 24,
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  date: {
    fontSize: 14,
    marginBottom: 6,
  },
  dayLine: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  kcal: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  card: {
    marginTop: 8,
    marginBottom: 16,
  },
  k: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  v: {
    fontSize: 16,
    lineHeight: 22,
  },
});
