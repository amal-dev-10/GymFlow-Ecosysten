import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { useTheme } from '../../../src/theme/theme';
import { Card } from '../../../src/components/Card';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { BarChart, LineChart } from '../../../src/components/reports/MobileCharts';

// Mock attendance data
const WEEKLY_ATTENDANCE = [
  { label: 'Mon', value: 88 },
  { label: 'Tue', value: 96 },
  { label: 'Wed', value: 84 },
  { label: 'Thu', value: 92 },
  { label: 'Fri', value: 110 },
  { label: 'Sat', value: 75 },
  { label: 'Sun', value: 45 },
];

const PEAK_HOURS = [
  { label: '06-08', value: 85 },
  { label: '08-10', value: 60 },
  { label: '12-14', value: 25 },
  { label: '16-18', value: 45 },
  { label: '18-20', value: 110 },
  { label: '20-22', value: 55 },
];

export default function AttendanceReport() {
  const { colors, spacing } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: spacing.lg }}>
      <SectionHeader title="Visits Overview" />
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>Average Daily Visits (This Week)</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 4 }}>84 members</Text>
        <Text style={{ fontSize: 11, color: colors.success, fontWeight: '700', marginTop: 4 }}>Peak day: Friday (110 visits)</Text>
      </Card>

      <SectionHeader title="Weekly Attendance Distribution" />
      <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
        <BarChart data={WEEKLY_ATTENDANCE} height={140} color={colors.primary} />
      </Card>

      <SectionHeader title="Peak Hours Summary" />
      <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
        <BarChart data={PEAK_HOURS} height={140} color="#F59E0B" />
        <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md }}>
          Highest member density recorded between 06:00-08:00 AM and 06:00-08:00 PM.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
