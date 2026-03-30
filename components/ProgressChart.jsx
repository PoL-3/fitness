import { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { useThemeColors } from '@/store/ThemeContext';

/**
 * @param {{ date: string, value: number }[]} series
 */
export function ProgressChart({ series }) {
  const { colors } = useThemeColors();
  const width = Math.min(Dimensions.get('window').width - 32, 360);

  const { labels, data } = useMemo(() => {
    if (!series?.length) {
      return { labels: ['—'], data: [0] };
    }
    const s = [...series].sort((a, b) => a.date.localeCompare(b.date));
    let labels = s.map((p) => p.date.slice(5));
    let data = s.map((p) => Number(p.value) || 0);
    if (data.length === 1) {
      labels = [labels[0], labels[0]];
      data = [data[0], data[0]];
    }
    if (labels.length > 8) {
      const step = Math.ceil(labels.length / 6);
      labels = labels.map((lb, i) => (i % step === 0 ? lb : ''));
    }
    return { labels, data };
  }, [series]);

  const chartConfig = useMemo(
    () => ({
      backgroundColor: colors.surface,
      backgroundGradientFrom: colors.surface,
      backgroundGradientTo: colors.surface,
      decimalPlaces: data.some((x) => !Number.isInteger(x)) ? 1 : 0,
      color: () => colors.accent,
      labelColor: () => colors.textMuted,
      propsForDots: { r: '4', strokeWidth: '1', stroke: colors.accent },
      propsForBackgroundLines: {
        stroke: colors.border,
        strokeDasharray: '',
      },
    }),
    [colors, data],
  );

  if (!series?.length) {
    return (
      <View style={[styles.empty, { borderColor: colors.border }]}>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>Добавьте данные — здесь появится график</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <LineChart
        data={{
          labels,
          datasets: [{ data }],
        }}
        width={width}
        height={200}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withInnerLines
        withOuterLines
        withVerticalLabels
        withHorizontalLabels
        fromZero
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginTop: 8,
  },
  chart: {
    borderRadius: 12,
    marginVertical: 4,
  },
  empty: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
});
