import React from 'react';
import { View, StyleSheet, Text, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../../../src/theme/theme';
import { Card } from '../../../src/components/Card';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { LineChart, BarChart } from '../../../src/components/reports/MobileCharts';
import { LoadingState } from '../../../src/components/LoadingState';
import { ErrorState } from '../../../src/components/ErrorState';
import { EmptyState } from '../../../src/components/EmptyState';
import { useMemberReport } from '../../../src/hooks/useReports';

export default function MemberReport() {
  const { colors, spacing } = useTheme();
  const { data, isLoading, isError, error, refetch, isFetching } = useMemberReport();

  if (isLoading) return <LoadingState message="Analyzing members..." />;
  if (isError) return <ErrorState message={(error as Error)?.message || 'Could not load members.'} onRetry={refetch} />;
  if (!data) return null;

  if (data.total === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <EmptyState title="No members yet" description="Add members to see demographics here." />
      </View>
    );
  }

  const growthPct =
    data.growth.data.length >= 2 && data.growth.data[0] > 0
      ? Math.round(((data.growth.data[data.growth.data.length - 1] - data.growth.data[0]) / data.growth.data[0]) * 100)
      : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <SectionHeader title="Roster Size" />
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>Total Members</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 4 }}>{data.total} Members</Text>
        <Text style={{ fontSize: 11, color: colors.success, fontWeight: '700', marginTop: 4 }}>
          +{data.newThisMonth} this month{growthPct !== 0 ? ` · ${growthPct > 0 ? '+' : ''}${growthPct}% over 5 months` : ''}
        </Text>
      </Card>

      <SectionHeader title="Roster Growth" />
      <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
        <LineChart data={data.growth.data} labels={data.growth.labels} height={140} color={colors.primary} />
      </Card>

      {data.byGender.length > 0 && (
        <>
          <SectionHeader title="Gender Split" />
          <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
            <BarChart data={data.byGender} height={130} color="#EC4899" />
          </Card>
        </>
      )}

      <SectionHeader title="Age Groups" />
      <Card style={{ padding: spacing.md }}>
        <BarChart data={data.byAge} height={130} color="#3B82F6" />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
