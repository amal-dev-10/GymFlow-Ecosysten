import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { useTheme } from '../../../src/theme/theme';
import { Card } from '../../../src/components/Card';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { LineChart, BarChart } from '../../../src/components/reports/MobileCharts';

// Mock demographics
const GROWTH_TREND = [210, 240, 265, 290, 318];
const GROWTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];

const GENDER_BREAKDOWN = [
  { label: 'Male', value: 180 },
  { label: 'Female', value: 128 },
  { label: 'Other', value: 10 },
];

export default function MemberReport() {
  const { colors, spacing } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: spacing.lg }}>
      <SectionHeader title="Roster Size Trend" />
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>Total Members</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 4 }}>318 Members</Text>
        <Text style={{ fontSize: 11, color: colors.success, fontWeight: '700', marginTop: 4 }}>+51% growth over 5 months</Text>
      </Card>

      <SectionHeader title="Signup Growth Line" />
      <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
        <LineChart data={GROWTH_TREND} labels={GROWTH_LABELS} height={140} color={colors.primary} />
      </Card>

      <SectionHeader title="Gender Demographic Profile" />
      <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
        <BarChart data={GENDER_BREAKDOWN} height={130} color="#EC4899" />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
