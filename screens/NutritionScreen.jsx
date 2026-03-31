import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { Card } from '@/components/Card';
import { DateFilterBar } from '@/components/DateFilterBar';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchField } from '@/components/SearchField';
import { useAppData } from '@/store/AppDataContext';
import { useThemeColors } from '@/store/ThemeContext';
import { formatDayRu, isValidDayKey } from '@/utils/dateDay';
import { formatShortDate } from '@/utils/formatDate';

export function NutritionScreen() {
  const router = useRouter();
  const { meals } = useAppData();
  const { colors } = useThemeColors();
  const [search, setSearch] = useState('');
  const [filterDay, setFilterDay] = useState('');

  const filtered = useMemo(() => {
    let list = meals;
    if (filterDay.trim() && isValidDayKey(filterDay.trim())) {
      list = list.filter((m) => m.date === filterDay.trim());
    }
    const q = search.trim().toLowerCase();
    if (!q) {
      return list;
    }
    return list.filter((m) => {
      const blob = [
        m.mealLabel,
        m.description,
        m.calories != null ? String(m.calories) : '',
        m.proteinG != null ? String(m.proteinG) : '',
        m.fatG != null ? String(m.fatG) : '',
        m.carbsG != null ? String(m.carbsG) : '',
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [meals, search, filterDay]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        flexList: {
          flex: 1,
        },
        list: {
          paddingTop: 16,
          paddingBottom: 24,
        },
        row: {
          marginBottom: 12,
        },
        rowTop: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        },
        rowTitle: {
          flex: 1,
          color: colors.text,
          fontSize: 17,
          fontWeight: '700',
        },
        kcal: {
          color: colors.accent,
          fontSize: 15,
          fontWeight: '700',
        },
        date: {
          color: colors.textMuted,
          fontSize: 12,
          marginTop: 6,
        },
        dayTag: {
          fontSize: 13,
          color: colors.accent,
          fontWeight: '600',
          marginTop: 4,
        },
        desc: {
          color: colors.textMuted,
          fontSize: 14,
          marginTop: 8,
          lineHeight: 20,
        },
        macros: {
          color: colors.textMuted,
          fontSize: 13,
          marginTop: 6,
          fontWeight: '600',
        },
        btnRow: {
          gap: 10,
          marginBottom: 8,
        },
      }),
    [colors],
  );

  return (
    <AppScreen>
      <ScreenHeader title="Питание" subtitle="Поиск, фильтр по дате, история по дням" />
      <DateFilterBar value={filterDay} onChange={setFilterDay} />
      <SearchField value={search} onChangeText={setSearch} placeholder="Поиск по приёму пищи, описанию, ккал…" />
      <View style={styles.btnRow}>
        <PrimaryButton title="История" variant="outline" onPress={() => router.push('/nutrition-history')} />
        <PrimaryButton title="+ Добавить приём пищи" onPress={() => router.push('/add-meal')} />
      </View>

      <FlatList
        style={styles.flexList}
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            emoji="🥗"
            title={search.trim() || filterDay.trim() ? 'Ничего не найдено' : 'Записей пока нет'}
            subtitle="Измените запрос, дату или добавьте приём пищи"
          />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/meal/${item.id}`)}>
            <Card style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={styles.rowTitle}>{item.mealLabel || 'Приём пищи'}</Text>
                <Text style={styles.kcal}>{item.calories ? `${item.calories} ккал` : '—'}</Text>
              </View>
              <Text style={styles.date}>{formatShortDate(item.createdAt)}</Text>
              {item.date ? <Text style={styles.dayTag}>{formatDayRu(item.date)}</Text> : null}
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
