import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { AppScreen } from '@/components/AppScreen';
import { HistoryDateList } from '@/components/HistoryDateList';
import { useAppData } from '@/store/AppDataContext';
import { uniqueSortedDayKeys } from '@/utils/dateDay';

export function NutritionHistoryScreen() {
  const router = useRouter();
  const { meals } = useAppData();

  const { dayKeys, counts } = useMemo(() => {
    const c = {};
    for (const m of meals) {
      if (m.date) {
        c[m.date] = (c[m.date] || 0) + 1;
      }
    }
    return { dayKeys: uniqueSortedDayKeys(meals), counts: c };
  }, [meals]);

  return (
    <AppScreen>
      <HistoryDateList
        dayKeys={dayKeys}
        counts={counts}
        onSelectDay={(dayKey) => router.push(`/nutrition-history/${dayKey}`)}
        emptyTitle="Пока нет дней с приёмами пищи"
        emptySubtitle="Добавьте записи — они сгруппируются по дате"
      />
    </AppScreen>
  );
}
