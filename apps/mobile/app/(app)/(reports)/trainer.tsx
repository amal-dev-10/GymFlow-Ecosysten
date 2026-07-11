import React from 'react';
import { View, StyleSheet, Text, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../../../src/theme/theme';
import { Card } from '../../../src/components/Card';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { BarChart, ProgressRing } from '../../../src/components/reports/MobileCharts';
import { LoadingState } from '../../../src/components/LoadingState';
import { ErrorState } from '../../../src/components/ErrorState';
import { EmptyState } from '../../../src/components/EmptyState';
import { useTrainerReport } from '../../../src/hooks/useReports';

export default function TrainerReport() {
  const { colors, spacing } = useTheme();
  const { data, isLoading, isError, error, refetch, isFetching } = useTrainerReport();

  if (isLoading) return <LoadingState message="Analyzing trainers..." />;
  if (isError) return <ErrorState message={(error as Error)?.message || 'Could not load trainer stats.'} onRetry={refetch} />;
  if (!data) return null;

  if (data.trainerCount === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <EmptyState title="No trainers yet" description="Add staff with a trainer role to see coaching stats here." />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <SectionHeader title="Member Coverage" />
      <Card style={{ marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', padding: spacing.md }}>
        <ProgressRing percentage={data.assignedPct} size={70} strokeWidth={8} color="#14B8A6" />
        <View style={{ marginLeft: spacing.lg, flex: 1 }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>Members with a Trainer</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 2 }}>{data.assignedPct}%</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
            {data.assigned} assigned · {data.unassigned} self-guided · {data.trainerCount} trainers
          </Text>
        </View>
      </Card>

      {data.leaderboard.length > 0 ? (
        <>
          <SectionHeader title="Members per Trainer" />
          <Card style={{ padding: spacing.md }}>
            <BarChart data={data.leaderboard} height={140} color="#14B8A6" />
          </Card>
        </>
      ) : (
        <Card style={{ padding: spacing.md }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            No members are assigned to a trainer yet. Assign trainers from a member's profile to build this leaderboard.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
