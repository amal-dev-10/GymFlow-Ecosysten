import React from 'react';
import { View, StyleSheet, Text, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../../../src/theme/theme';
import { Card } from '../../../src/components/Card';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { ProgressRing } from '../../../src/components/reports/MobileCharts';
import { LoadingState } from '../../../src/components/LoadingState';
import { ErrorState } from '../../../src/components/ErrorState';
import { EmptyState } from '../../../src/components/EmptyState';
import { useMembershipReport } from '../../../src/hooks/useReports';

export default function MembershipReport() {
  const { colors, spacing } = useTheme();
  const { data, isLoading, isError, error, refetch, isFetching } = useMembershipReport();

  if (isLoading) return <LoadingState message="Analyzing memberships..." />;
  if (isError) return <ErrorState message={(error as Error)?.message || 'Could not load memberships.'} onRetry={refetch} />;
  if (!data) return null;

  if (data.total === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <EmptyState title="No memberships yet" description="Sell memberships to see status insights here." />
      </View>
    );
  }

  const rows = [
    { label: 'Active', count: data.active, color: colors.success },
    { label: 'Frozen', count: data.frozen, color: colors.info },
    { label: 'Expired', count: data.expired, color: colors.error },
    { label: 'Cancelled', count: data.cancelled, color: colors.textMuted },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <SectionHeader title="Active vs. Total Plans" />
      <Card style={{ marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', padding: spacing.md }}>
        <ProgressRing percentage={data.activeRatio} size={70} strokeWidth={8} color={colors.primary} />
        <View style={{ marginLeft: spacing.lg, flex: 1 }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>Active Membership Ratio</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 2 }}>{data.activeRatio}% Active</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{data.active} active out of {data.total} total plans</Text>
        </View>
      </Card>

      <SectionHeader title="Status Breakdown" />
      <Card padded={false} style={{ marginBottom: spacing.lg }}>
        {rows.map((r, idx, arr) => {
          const pct = data.total > 0 ? Math.round((r.count / data.total) * 100) : 0;
          return (
            <View key={r.label} style={[styles.planRow, { borderBottomColor: colors.border, borderBottomWidth: idx === arr.length - 1 ? 0 : 1, padding: spacing.md }]}>
              <View style={[styles.bullet, { backgroundColor: r.color }]} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, flex: 1, marginLeft: 8 }}>{r.label}</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{r.count}</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginLeft: 10, width: 34, textAlign: 'right' }}>{pct}%</Text>
            </View>
          );
        })}
      </Card>

      {data.byPlan.length > 0 && (
        <>
          <SectionHeader title="By Plan" />
          <Card padded={false} style={{ marginBottom: spacing.lg }}>
            {data.byPlan.map((p, idx, arr) => (
              <View key={p.label} style={[styles.planRow, { borderBottomColor: colors.border, borderBottomWidth: idx === arr.length - 1 ? 0 : 1, padding: spacing.md }]}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 }} numberOfLines={1}>{p.label}</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{p.value}</Text>
              </View>
            ))}
          </Card>
        </>
      )}

      <SectionHeader title="Renewal Pipeline" />
      <Card style={{ padding: spacing.md }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Expiring Next 7 Days</Text>
        <Text style={{ fontSize: 18, fontWeight: '800', color: data.expiringSoon > 0 ? colors.warning : colors.success }}>{data.expiringSoon} Plans</Text>
        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>Reach out to these members for renewals during check-ins.</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  planRow: { flexDirection: 'row', alignItems: 'center' },
  bullet: { width: 10, height: 10, borderRadius: 5 },
});
