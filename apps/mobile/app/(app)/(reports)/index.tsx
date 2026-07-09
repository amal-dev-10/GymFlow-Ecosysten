import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart2, Award, Users, Calendar, Clock, DollarSign, ChevronRight, Activity, ArrowLeft } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTheme } from '../../../src/theme/theme';
import { useWorkspace } from '../../../src/providers/WorkspaceProvider';
import { useHaptics } from '../../../src/hooks/useHaptics';

import { Card } from '../../../src/components/Card';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { MetricCard } from '../../../src/components/MetricCard';

const FILTER_OPTIONS = ['Today', 'Yesterday', 'This Week', 'This Month'];

export default function ReportsDashboard() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { lightImpact } = useHaptics();
  const { can, role } = useWorkspace();

  const [selectedFilter, setSelectedFilter] = useState('This Month');

  const reportItems = [
    { label: 'Revenue & Payments', icon: DollarSign, color: '#10B981', route: '/(app)/(reports)/revenue', visible: can('view-reports') },
    { label: 'Membership Status', icon: Award, color: '#3B82F6', route: '/(app)/(reports)/membership', visible: can('view-reports') },
    { label: 'Attendance Tracking', icon: Clock, color: '#F59E0B', route: '/(app)/(reports)/attendance', visible: can('view-reports') },
    { label: 'Member Demographics', icon: Users, color: '#EC4899', route: '/(app)/(reports)/member', visible: can('view-reports') },
    { label: 'Trainer Statistics', icon: Activity, color: '#14B8A6', route: '/(app)/(reports)/trainer', visible: true },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.replace('/(app)/(more)')} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Reports & Analytics</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        {/* Date Filters Row */}
        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((opt) => {
            const isSelected = opt === selectedFilter;
            return (
              <Pressable
                key={opt}
                onPress={() => { lightImpact(); setSelectedFilter(opt); }}
                style={[
                  styles.filterBtn,
                  { 
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border
                  }
                ]}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: isSelected ? '#FFF' : colors.textSecondary }}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Dashboard Snapshot Stats */}
        <SectionHeader title="KPI Summary" style={{ marginTop: spacing.lg }} />
        <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
          <View style={styles.gridRow}>
            <MetricCard
              label="Gross Revenue"
              value={selectedFilter === 'Today' ? '₹8,200' : '₹1,42,800'}
              icon={<DollarSign size={18} color={colors.success} />}
              delay={50}
            />
            <MetricCard
              label="New Signups"
              value={selectedFilter === 'Today' ? '2' : '24'}
              icon={<Users size={18} color={colors.primary} />}
              delay={100}
            />
          </View>
          <View style={styles.gridRow}>
            <MetricCard
              label="Attendance Count"
              value={selectedFilter === 'Today' ? '68' : '842'}
              icon={<Clock size={18} color={colors.warning} />}
              delay={150}
            />
            <MetricCard
              label="Active Members"
              value="318"
              icon={<Activity size={18} color="#14B8A6" />}
              delay={200}
            />
          </View>
        </View>

        {/* Specific Reports Categories */}
        <SectionHeader title="Select Operational Report" style={{ marginTop: spacing.md }} />
        <Card padded={false}>
          {reportItems
            .filter((item) => item.visible)
            .map((item, idx, arr) => (
              <Pressable
                key={item.label}
                onPress={() => { lightImpact(); router.push(item.route as any); }}
                style={({ pressed }) => [
                  styles.reportItemRow,
                  { 
                    borderBottomColor: colors.border,
                    borderBottomWidth: idx === arr.length - 1 ? 0 : 1,
                    opacity: pressed ? 0.9 : 1
                  }
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: item.color + '12' }]}>
                  <item.icon size={18} color={item.color} />
                </View>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.text, marginLeft: spacing.md }}>
                  {item.label}
                </Text>
                <ChevronRight size={18} color={colors.textMuted} />
              </Pressable>
            ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  reportItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
