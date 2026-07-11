import React from 'react';
import { View, StyleSheet, Text, ScrollView, RefreshControl } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { useTheme } from '../../../src/theme/theme';
import { Card } from '../../../src/components/Card';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { BarChart } from '../../../src/components/reports/MobileCharts';
import { LoadingState } from '../../../src/components/LoadingState';
import { ErrorState } from '../../../src/components/ErrorState';
import { EmptyState } from '../../../src/components/EmptyState';
import { useRevenueReport } from '../../../src/hooks/useReports';

export default function RevenueReport() {
  const { colors, spacing } = useTheme();
  const { data, isLoading, isError, error, refetch, isFetching } = useRevenueReport();

  if (isLoading) return <LoadingState message="Crunching revenue..." />;
  if (isError) {
    return <ErrorState message={(error as Error)?.message || 'Could not load revenue.'} onRetry={refetch} />;
  }
  if (!data) return null;

  const hasRevenue = data.totalCollected > 0 || data.totalBilled > 0;
  const methodTotal = data.byCategory.reduce((s, m) => s + m.value, 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
    >
      {!hasRevenue ? (
        <EmptyState
          icon={<TrendingUp size={44} color={colors.textMuted} />}
          title="No revenue yet"
          description="Once memberships are sold and payments collected, revenue will show up here."
          style={{ marginTop: spacing.xxl }}
        />
      ) : (
        <>
          {/* Overview */}
          <SectionHeader title="Revenue Overview" />
          <Card style={{ marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Total Collected</Text>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 4 }}>
              ₹{data.totalCollected.toLocaleString('en-IN')}
            </Text>
            <View style={{ flexDirection: 'row', marginTop: spacing.md, gap: spacing.xl }}>
              <View>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Billed</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 }}>
                  ₹{data.totalBilled.toLocaleString('en-IN')}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Outstanding</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: data.totalOutstanding > 0 ? colors.error : colors.success, marginTop: 2 }}>
                  ₹{data.totalOutstanding.toLocaleString('en-IN')}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Invoices</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 }}>
                  {data.invoiceCount}
                </Text>
              </View>
            </View>
          </Card>

          {/* Daily Revenue Bar Chart */}
          <SectionHeader title="Collections (Last 7 Days)" />
          <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
            <BarChart data={data.daily} height={140} color={colors.primary} />
          </Card>

          {/* Category Breakdown */}
          {data.byCategory.length > 0 && (
            <>
              <SectionHeader title="Collected by Plan" />
              <Card padded={false} style={{ marginBottom: spacing.lg }}>
                {data.byCategory.map((method, idx, arr) => {
                  const percent = methodTotal > 0 ? ((method.value / methodTotal) * 100).toFixed(0) : '0';
                  return (
                    <View
                      key={method.label}
                      style={[
                        styles.methodRow,
                        {
                          borderBottomColor: colors.border,
                          borderBottomWidth: idx === arr.length - 1 ? 0 : 1,
                          padding: spacing.md,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={1}>{method.label}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>₹{method.value.toLocaleString('en-IN')}</Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginLeft: 10, width: 34, textAlign: 'right' }}>{percent}%</Text>
                    </View>
                  );
                })}
              </Card>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
