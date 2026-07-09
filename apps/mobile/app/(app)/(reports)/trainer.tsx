import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { useTheme } from '../../../src/theme/theme';
import { Card } from '../../../src/components/Card';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { BarChart, ProgressRing } from '../../../src/components/reports/MobileCharts';

// Mock Trainer Statistics
const TRAINER_LEADERBOARD = [
  { label: 'Coach Ali', value: 84 },
  { label: 'Coach Bob', value: 68 },
  { label: 'Coach Sarah', value: 72 },
  { label: 'Coach Dan', value: 45 },
];

export default function TrainerReport() {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: spacing.lg }}>
      <SectionHeader title="PT Coaching Sessions" />
      <Card style={{ marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', padding: spacing.md }}>
        <ProgressRing percentage={76} size={70} strokeWidth={8} color="#14B8A6" />
        <View style={{ marginLeft: spacing.lg, flex: 1 }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>Session Completion Rate</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 2 }}>76% Completed</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>268 completed out of 350 booked sessions</Text>
        </View>
      </Card>

      <SectionHeader title="Sessions Logged by Coach" />
      <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
        <BarChart data={TRAINER_LEADERBOARD} height={140} color="#14B8A6" />
      </Card>

      <SectionHeader title="Assigned Members Ratio" />
      <Card style={{ padding: spacing.md }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>Members with Personal Trainer</Text>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 4 }}>112 Members (35%)</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>112 members have assigned trainers, while 206 are self-guided.</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
