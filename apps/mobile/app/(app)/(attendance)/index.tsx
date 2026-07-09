import React from 'react';
import { View, StyleSheet, Text, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { ScanLine, Search, Users } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useTheme } from '../../../src/theme/theme';
import { useWorkspaceStore } from '../../../src/store/workspace.store';
import { useAttendanceStats, useAttendanceLogs } from '../../../src/hooks/useAttendance';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';

import { AttendanceStatsWidget } from '../../../src/components/attendance/AttendanceStatsWidget';
import { QuickActionButton } from '../../../src/components/dashboard/QuickActionButton';
import { ListItem } from '../../../src/components/ListItem';
import { EmptyState } from '../../../src/components/EmptyState';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { OfflineBanner } from '../../../src/components/OfflineBanner';

export default function AttendanceDashboardScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();
  const { activeGymId } = useWorkspaceStore();
  const { isOffline } = useNetworkStatus();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAttendanceStats(activeGymId || '');
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs, isFetching } = useAttendanceLogs(activeGymId || '');

  const handleRefresh = () => {
    refetchStats();
    refetchLogs();
  };

  const renderHeader = () => (
    <View style={{ paddingBottom: spacing.lg }}>
      <Animated.View entering={FadeInDown.duration(400).springify()} style={[styles.header, { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.md }]}>
        <Text style={{ fontSize: typography.sizes.display.fontSize, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
          Attendance
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
        <AttendanceStatsWidget
          isLoading={statsLoading}
          activeInside={stats?.activeInside}
          totalCheckInsToday={stats?.totalCheckInsToday}
          totalDenied={stats?.totalDenied}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
        <SectionHeader title="Actions" style={{ marginTop: spacing.xl }} />
        <View style={{ flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
          <QuickActionButton
            label="Scan QR"
            icon={<ScanLine size={24} color={colors.primary} />}
            onPress={() => router.push('/(app)/(attendance)/scan')}
          />
          <QuickActionButton
            label="Search"
            icon={<Search size={24} color={colors.primary} />}
            onPress={() => router.push('/(app)/(attendance)/search')}
          />
          <QuickActionButton
            label="Active Inside"
            icon={<Users size={24} color={colors.primary} />}
            onPress={() => router.push('/(app)/(attendance)/active')}
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(400).springify()}>
        <SectionHeader title="Recent Activity" style={{ marginTop: spacing.xl, marginBottom: spacing.sm }} />
      </Animated.View>
    </View>
  );

  const renderItem = ({ item, index }: { item: any, index: number }) => (
    <Animated.View entering={FadeInUp.delay(Math.min(index * 50, 400)).duration(300)}>
      <ListItem
        title={item.member?.firstName ? `${item.member.firstName} ${item.member.lastName}` : 'Unknown Member'}
        subtitle={`${item.type === 'check-in' ? 'Checked In' : 'Checked Out'} at ${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
        leftComponent={
          <View style={[styles.iconDot, { backgroundColor: item.type === 'check-in' ? colors.success + '20' : colors.primary + '20' }]}>
            {item.type === 'check-in' ? <ScanLine size={14} color={colors.success} /> : <Users size={14} color={colors.primary} />}
          </View>
        }
        onPress={() => router.push(`/(app)/(members)/${item.member?.id}`)}
        style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: 12 }}
      />
    </Animated.View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      {isOffline && <OfflineBanner />}

      <FlashList
        data={logs || []}
        ListHeaderComponent={renderHeader}
        renderItem={renderItem}
        estimatedItemSize={70}
        keyExtractor={(item: any) => item.id || Math.random().toString()}
        refreshControl={<RefreshControl refreshing={isFetching && !logsLoading} onRefresh={handleRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          logsLoading ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
          ) : (
            <EmptyState
              title="No recent activity"
              description="Check in members to see logs here."
              icon={<ScanLine size={36} color={colors.textMuted} />}
              style={{ marginTop: spacing.xl }}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {},
  iconDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
