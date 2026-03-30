import { FlatList, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { HistoryDateRow } from '@/components/HistoryDateRow';

/**
 * Список дней (даты уже отсортированы — новые сверху).
 * dayKeys: string[] (YYYY-MM-DD)
 * counts: Record<dayKey, number> | null — сколько записей за день (опционально)
 */
export function HistoryDateList({ dayKeys, counts, onSelectDay, emptyTitle, emptySubtitle }) {
  return (
    <FlatList
      data={dayKeys}
      keyExtractor={(k) => k}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<EmptyState emoji="📅" title={emptyTitle} subtitle={emptySubtitle} />}
      renderItem={({ item }) => (
        <HistoryDateRow dayKey={item} count={counts ? counts[item] : null} onPress={onSelectDay} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: 8,
    paddingBottom: 24,
  },
});
