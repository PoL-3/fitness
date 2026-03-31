import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAppData } from '@/store/AppDataContext';
import { useThemeColors } from '@/store/ThemeContext';
import { formatDayRu } from '@/utils/dateDay';
import { formatShortDate } from '@/utils/formatDate';
import { formatExercisesForDisplay, splitNotesAndExercises } from '@/utils/workoutExercises';

export function WorkoutDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { getWorkoutById, removeWorkout } = useAppData();
  const { colors } = useThemeColors();
  const item = getWorkoutById(typeof id === 'string' ? id : id?.[0]);

  if (!item) {
    return (
      <AppScreen scroll>
        <Text style={[styles.miss, { color: colors.textMuted }]}>Запись не найдена.</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <Text style={[styles.title, { color: colors.text }]}>{item.title || 'Тренировка'}</Text>
      <Text style={[styles.date, { color: colors.textMuted }]}>{formatShortDate(item.createdAt)}</Text>
      {item.date ? (
        <Text style={[styles.dayLine, { color: colors.accent }]}>День: {formatDayRu(item.date)}</Text>
      ) : null}

      <Card style={styles.card}>
        <Text style={[styles.k, { color: colors.textMuted }]}>Тип</Text>
        <Text style={[styles.v, { color: colors.text }]}>{item.type || '—'}</Text>
        <Text style={[styles.k, { color: colors.textMuted }]}>Длительность</Text>
        <Text style={[styles.v, { color: colors.text }]}>
          {item.durationMin != null ? `${item.durationMin} мин` : '—'}
        </Text>
        <Text style={[styles.k, { color: colors.textMuted }]}>Заметки</Text>
        {(() => {
          const { userNotes, exercises } = splitNotesAndExercises(item.notes);
          const exText = formatExercisesForDisplay(exercises);
          const hasNotes = Boolean(userNotes && userNotes.trim().length);
          const hasEx = Boolean(exText);
          if (!hasNotes && !hasEx) {
            return <Text style={[styles.v, { color: colors.text }]}>{'—'}</Text>;
          }
          return (
            <>
              <Text style={[styles.v, { color: colors.text }]}>{hasNotes ? userNotes : ''}</Text>
              {hasEx ? (
                <Text style={[styles.v, { color: colors.textMuted, marginTop: 6 }]}>{`Упражнения:\n${exText}`}</Text>
              ) : null}
            </>
          );
        })()}
      </Card>

      <PrimaryButton title="Редактировать" onPress={() => router.push(`/edit-workout/${item.id}`)} />
      <PrimaryButton
        title="Удалить тренировку"
        variant="outline"
        onPress={() => {
          Alert.alert('Удалить тренировку?', 'Запись будет удалена с устройства и с сервера (если вы вошли в аккаунт).', [
            { text: 'Отмена', style: 'cancel' },
            {
              text: 'Удалить',
              style: 'destructive',
              onPress: () => {
                removeWorkout(item.id);
                router.back();
              },
            },
          ]);
        }}
        style={styles.gapBtn}
      />
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
    marginBottom: 16,
  },
  card: {
    marginTop: 8,
    marginBottom: 16,
  },
  k: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    textTransform: 'uppercase',
  },
  v: {
    fontSize: 16,
    marginTop: 4,
    lineHeight: 22,
  },
  gapBtn: {
    marginTop: 10,
  },
});
