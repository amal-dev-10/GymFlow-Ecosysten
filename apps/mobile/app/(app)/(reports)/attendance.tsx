import React from 'react';
import { View, StyleSheet, Text, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../../../src/theme/theme';
import { Card } from '../../../src/components/Card';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { BarChart } from '../../../src/components/reports/MobileCharts';
import { LoadingState } from '../../../src/components/LoadingState';
import { ErrorState } from '../../../src/components/ErrorState';
import { EmptyState } from '../../../src/components/EmptyState';
import { useAttendanceReport } from '../../../src/hooks/useReports';

export default function AttendanceReport() {
  const { colors, spacing } = useTheme();
  const { data, isLoading, isError, error, refetch, isFetching } = useAttendanceReport();

  if (isLoading) return <LoadingState message="Crunching attendance..." />;
  if (isError) return <ErrorState message={(error as Error)?.message || 'Could not load attendance.'} onRetry={refetch} />;
  if (!data) return null;

  if (data.totalVisits === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <EmptyState title="No attendance yet" description="Check-ins over the last 30 days will show up here." />
      </View>
    );
  }

  const peakBucket = data.peakBuckets.reduce((a, b) => (b.value > a.value ? b : a), data.peakBuckets[0]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <SectionHeader title="Visits Overview" />
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>Total Check-ins (Last 30 Days)</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 4 }}>{data.totalVisits}</Text>
        <Text style={{ fontSize: 11, color: colors.success, fontWeight: '700', marginTop: 4 }}>
          Avg visit {data.avgVisitDuration} min · busiest {peakBucket?.label}h
        </Text>
      </Card>

      <SectionHeader title="Daily Check-ins (Last 14 Days)" />
      <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
        <BarChart data={data.daily} height={140} color={colors.primary} />
      </Card>

      <SectionHeader title="Busiest Hours" />
      <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
        <BarChart data={data.peakBuckets} height={130} color="#F59E0B" />
      </Card>

      <SectionHeader title="Live Status" />
      <Card padded={false}>
        {data.status.map((s, idx, arr) => (
          <View
            key={s.label}
            style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: idx === arr.length - 1 ? 0 : 1, padding: spacing.md }]}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 }}>{s.label}</Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{s.value}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
