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
import { formatExercisesForDisplay, splitNotesAndExercises } from '@/utils/workoutExercises';

export function WorkoutsScreen() {
  const router = useRouter();
  const { workouts } = useAppData();
  const { colors } = useThemeColors();
  const [search, setSearch] = useState('');
  const [filterDay, setFilterDay] = useState('');

  function renderNotesBlock(item) {
    const { userNotes, exercises } = splitNotesAndExercises(item.notes);
    const exText = formatExercisesForDisplay(exercises);
    if (!userNotes && !exText) {
      return null;
    }
    return (
      <>
        {userNotes ? <Text style={styles.notes}>{userNotes}</Text> : null}
        {exText ? (
          <Text style={styles.notes}>
            {userNotes ? '\n' : ''}
            {'Упражнения:\n'}
            {exText}
          </Text>
        ) : null}
      </>
    );
  }

  const filtered = useMemo(() => {
    let list = workouts;
    if (filterDay.trim() && isValidDayKey(filterDay.trim())) {
      list = list.filter((w) => w.date === filterDay.trim());
    }
    const q = search.trim().toLowerCase();
    if (!q) {
      return list;
    }
    return list.filter((w) => {
      const blob = [w.title, w.type, w.notes].filter(Boolean).join(' ').toLowerCase();
      return blob.includes(q);
    });
  }, [workouts, search, filterDay]);

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
          alignItems: 'flex-start',
          gap: 8,
        },
        rowTitle: {
          flex: 1,
          color: colors.text,
          fontSize: 17,
          fontWeight: '700',
        },
        rowDate: {
          color: colors.textMuted,
          fontSize: 12,
        },
        dayTag: {
          fontSize: 13,
          color: colors.accent,
          fontWeight: '600',
          marginTop: 4,
        },
        rowMeta: {
          color: colors.accent,
          fontSize: 14,
          marginTop: 6,
        },
        notes: {
          color: colors.textMuted,
          fontSize: 14,
          marginTop: 8,
          lineHeight: 20,
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
      <ScreenHeader title="Тренировки" subtitle="Поиск, фильтр по дате, история по дням" />
      <DateFilterBar value={filterDay} onChange={setFilterDay} />
      <SearchField value={search} onChangeText={setSearch} placeholder="Поиск по названию, типу, заметкам…" />
      <View style={styles.btnRow}>
        <PrimaryButton title="История" variant="outline" onPress={() => router.push('/workouts-history')} />
        <PrimaryButton title="+ Добавить тренировку" onPress={() => router.push('/add-workout')} />
      </View>

      <FlatList
        style={styles.flexList}
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            emoji="🏋️"
            title={search.trim() || filterDay.trim() ? 'Ничего не найдено' : 'Пока нет тренировок'}
            subtitle="Измените запрос, дату или добавьте запись"
          />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/workout/${item.id}`)}>
            <Card style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={styles.rowTitle}>{item.title || 'Без названия'}</Text>
                <Text style={styles.rowDate}>{formatShortDate(item.createdAt)}</Text>
              </View>
              {item.date ? <Text style={styles.dayTag}>{formatDayRu(item.date)}</Text> : null}
              <Text style={styles.rowMeta}>
                {item.type ? `${item.type} · ` : ''}
                {item.durationMin ? `${item.durationMin} мин` : 'Длительность не указана'}
              </Text>
              {renderNotesBlock(item)}
            </Card>
          </Pressable>
        )}
      />
    </AppScreen>
  );
}
