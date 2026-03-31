import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLayoutEffect, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { useAppData } from '@/store/AppDataContext';
import { useThemeColors } from '@/store/ThemeContext';
import { formatDayRu } from '@/utils/dateDay';
import { formatShortDate } from '@/utils/formatDate';

export function NutritionHistoryDayScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { day } = useLocalSearchParams();
  const { meals } = useAppData();
  const { colors } = useThemeColors();

  const dayKey = typeof day === 'string' ? day : day?.[0] ?? '';

  useLayoutEffect(() => {
    const t = formatDayRu(dayKey) || dayKey || 'День';
    navigation.setOptions({ title: t });
  }, [dayKey, navigation]);

  const items = useMemo(
    () => meals.filter((m) => m.date === dayKey).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [meals, dayKey],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        flexList: { flex: 1 },
        list: { paddingTop: 8, paddingBottom: 24 },
        row: { marginBottom: 12 },
        rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
        rowTitle: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '700' },
        kcal: { color: colors.accent, fontSize: 15, fontWeight: '700' },
        date: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
        desc: { color: colors.textMuted, fontSize: 14, marginTop: 8, lineHeight: 20 },
        macros: { color: colors.textMuted, fontSize: 13, marginTop: 6, fontWeight: '600' },
      }),
    [colors],
  );

  return (
    <AppScreen>
      <FlatList
        style={styles.flexList}
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState emoji="🥗" title="Нет записей" subtitle="На этот день приёмов не найдено" />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/meal/${item.id}`)}>
            <Card style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={styles.rowTitle}>{item.mealLabel || 'Приём пищи'}</Text>
                <Text style={styles.kcal}>{item.calories ? `${item.calories} ккал` : '—'}</Text>
              </View>
              <Text style={styles.date}>{formatShortDate(item.createdAt)}</Text>
              {(() => {
                const parts = [];
                if (item.proteinG != null) parts.push(`Б ${item.proteinG} г`);
                if (item.fatG != null) parts.push(`Ж ${item.fatG} г`);
                if (item.carbsG != null) parts.push(`У ${item.carbsG} г`);
                if (!parts.length) return null;
                return <Text style={styles.macros}>{parts.join(' · ')}</Text>;
              })()}
              {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
            </Card>
          </Pressable>
        )}
      />
    </AppScreen>
  );
}
