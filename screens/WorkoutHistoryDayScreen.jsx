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
import { formatExercisesForDisplay, splitNotesAndExercises } from '@/utils/workoutExercises';

export function WorkoutHistoryDayScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { day } = useLocalSearchParams();
  const { workouts } = useAppData();
  const { colors } = useThemeColors();

  const dayKey = typeof day === 'string' ? day : day?.[0] ?? '';

  useLayoutEffect(() => {
    const t = formatDayRu(dayKey) || dayKey || 'День';
    navigation.setOptions({ title: t });
  }, [dayKey, navigation]);

  const items = useMemo(
    () => workouts.filter((w) => w.date === dayKey).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [workouts, dayKey],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        flexList: { flex: 1 },
        list: { paddingTop: 8, paddingBottom: 24 },
        row: { marginBottom: 12 },
        rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
        rowTitle: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '700' },
        rowDate: { color: colors.textMuted, fontSize: 12 },
        rowMeta: { color: colors.accent, fontSize: 14, marginTop: 6 },
        notes: { color: colors.textMuted, fontSize: 14, marginTop: 8 },
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
          <EmptyState emoji="🏋️" title="Нет записей" subtitle="На этот день тренировок не найдено" />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/workout/${item.id}`)}>
            <Card style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={styles.rowTitle}>{item.title || 'Без названия'}</Text>
                <Text style={styles.rowDate}>{formatShortDate(item.createdAt)}</Text>
              </View>
              <Text style={styles.rowMeta}>
                {item.type ? `${item.type} · ` : ''}
                {item.durationMin ? `${item.durationMin} мин` : '—'}
              </Text>
              {(() => {
                const { userNotes, exercises } = splitNotesAndExercises(item.notes);
                const exText = formatExercisesForDisplay(exercises);
                const hasNotes = Boolean(userNotes && userNotes.trim().length);
                const hasEx = Boolean(exText);
                if (!hasNotes && !hasEx) {
                  return null;
                }
                return (
                  <Text style={styles.notes}>
                    {hasNotes ? userNotes : ''}
                    {hasEx ? `${hasNotes ? '\n' : ''}Упражнения:\n${exText}` : ''}
                  </Text>
                );
              })()}
            </Card>
          </Pressable>
        )}
      />
    </AppScreen>
  );
}
