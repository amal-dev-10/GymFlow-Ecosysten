import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { useTheme } from '../../../src/theme/theme';
import { Card } from '../../../src/components/Card';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { ProgressRing } from '../../../src/components/reports/MobileCharts';

// Mock membership data
const MEMBERSHIPS = [
  { label: 'Active Plans', count: 284, color: '#10B981', pct: 85 },
  { label: 'Frozen Plans', count: 18, color: '#3B82F6', pct: 5 },
  { label: 'Expired (Mo.)', count: 24, color: '#EF4444', pct: 7 },
  { label: 'Cancelled (Mo.)', count: 8, color: '#6B7280', pct: 3 },
];

export default function MembershipReport() {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: spacing.lg }}>
      <SectionHeader title="Active vs. Total Plans" />
      <Card style={{ marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', padding: spacing.md }}>
        <ProgressRing percentage={85} size={70} strokeWidth={8} color={colors.primary} />
        <View style={{ marginLeft: spacing.lg, flex: 1 }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>Active Membership Ratio</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 2 }}>85% Active</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>284 active out of 334 total plans registered</Text>
        </View>
      </Card>

      <SectionHeader title="Status Breakdown" />
      <Card padded={false} style={{ marginBottom: spacing.lg }}>
        {MEMBERSHIPS.map((plan, idx, arr) => (
          <View 
            key={plan.label} 
            style={[
              styles.planRow, 
              { 
                borderBottomColor: colors.border,
                borderBottomWidth: idx === arr.length - 1 ? 0 : 1,
                padding: spacing.md 
              }
            ]}
          >
            <View style={[styles.bullet, { backgroundColor: plan.color }]} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, flex: 1, marginLeft: 8 }}>{plan.label}</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{plan.count}</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginLeft: 10, width: 34, textAlign: 'right' }}>{plan.pct}%</Text>
          </View>
        ))}
      </Card>

      <SectionHeader title="Renewal Pipelines" />
      <Card style={{ padding: spacing.md }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Expiring Next 7 Days</Text>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.warning }}>14 Plans</Text>
        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>Alert staff to reach out for renewals during attendance checks.</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
  }
});
