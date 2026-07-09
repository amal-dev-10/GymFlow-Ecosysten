import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { useTheme } from '../../../src/theme/theme';
import { Card } from '../../../src/components/Card';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { BarChart, LineChart } from '../../../src/components/reports/MobileCharts';

// Mock revenue data
const WEEKLY_REVENUE = [
  { label: 'Mon', value: 12000 },
  { label: 'Tue', value: 18000 },
  { label: 'Wed', value: 15000 },
  { label: 'Thu', value: 24000 },
  { label: 'Fri', value: 22000 },
  { label: 'Sat', value: 31000 },
  { label: 'Sun', value: 20000 },
];

const REVENUE_METHODS = [
  { label: 'UPI', value: 68000 },
  { label: 'Card', value: 45000 },
  { label: 'Cash', value: 21800 },
  { label: 'Transfer', value: 8000 },
];

const MONTHLY_TREND = [45000, 68000, 92000, 115000, 142800];
const MONTHLY_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];

export default function RevenueReport() {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: spacing.lg }}>
      {/* Overview */}
      <SectionHeader title="Revenue Overview" />
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>Total Revenue (This Month)</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 4 }}>₹1,42,800</Text>
        <Text style={{ fontSize: 11, color: colors.success, fontWeight: '700', marginTop: 4 }}>+18% increase from last month</Text>
      </Card>

      {/* Daily Revenue Bar Chart */}
      <SectionHeader title="Daily Revenue (This Week)" />
      <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
        <BarChart data={WEEKLY_REVENUE} height={140} color={colors.primary} />
      </Card>

      {/* Revenue Trend Line Chart */}
      <SectionHeader title="Cumulative Growth Trend" />
      <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
        <LineChart data={MONTHLY_TREND} labels={MONTHLY_LABELS} height={140} color="#10B981" />
      </Card>

      {/* Payment Method Breakdown */}
      <SectionHeader title="Breakdown by Payment Method" />
      <Card padded={false} style={{ marginBottom: spacing.lg }}>
        {REVENUE_METHODS.map((method, idx, arr) => {
          const total = REVENUE_METHODS.reduce((acc, curr) => acc + curr.value, 0);
          const percent = ((method.value / total) * 100).toFixed(0);
          return (
            <View 
              key={method.label} 
              style={[
                styles.methodRow, 
                { 
                  borderBottomColor: colors.border,
                  borderBottomWidth: idx === arr.length - 1 ? 0 : 1,
                  padding: spacing.md 
                }
              ]}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, flex: 1 }}>{method.label}</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>₹{method.value.toLocaleString('en-IN')}</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginLeft: 10, width: 34, textAlign: 'right' }}>{percent}%</Text>
            </View>
          );
        })}
      </Card>
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
  }
});
