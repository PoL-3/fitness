import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { AppScreen } from '@/components/AppScreen';
import { HistoryDateList } from '@/components/HistoryDateList';
import { useAppData } from '@/store/AppDataContext';
import { uniqueSortedDayKeys } from '@/utils/dateDay';

export function WorkoutsHistoryScreen() {
  const router = useRouter();
  const { workouts } = useAppData();

  const { dayKeys, counts } = useMemo(() => {
    const c = {};
    for (const w of workouts) {
      if (w.date) {
        c[w.date] = (c[w.date] || 0) + 1;
      }
    }
    return { dayKeys: uniqueSortedDayKeys(workouts), counts: c };
  }, [workouts]);

  return (
    <AppScreen>
      <HistoryDateList
        dayKeys={dayKeys}
        counts={counts}
        onSelectDay={(dayKey) => router.push(`/workouts-history/${dayKey}`)}
        emptyTitle="Пока нет дней с тренировками"
        emptySubtitle="Добавьте тренировки — они сгруппируются по дате"
      />
    </AppScreen>
  );
}
