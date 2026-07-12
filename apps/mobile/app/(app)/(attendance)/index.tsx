import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { ScanLine, Search, Users, LogIn, LogOut, AlertCircle, Clock, User, Monitor } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useTheme } from '../../../src/theme/theme';
import { useWorkspaceStore } from '../../../src/store/workspace.store';
import { useAttendanceStats, useAttendanceLogs, useCheckOut } from '../../../src/hooks/useAttendance';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';

import { AttendanceStatsWidget } from '../../../src/components/attendance/AttendanceStatsWidget';
import { QuickActionButton } from '../../../src/components/dashboard/QuickActionButton';
import { ListItem } from '../../../src/components/ListItem';
import { EmptyState } from '../../../src/components/EmptyState';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { OfflineBanner } from '../../../src/components/OfflineBanner';
import { BottomSheet, BottomSheetRef } from '../../../src/components/BottomSheet';
import { UserAvatar } from '../../../src/components/UserAvatar';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { SecondaryButton } from '../../../src/components/SecondaryButton';
import { useHaptics } from '../../../src/hooks/useHaptics';

export default function AttendanceDashboardScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();
  const { activeGymId } = useWorkspaceStore();
  const { isOffline } = useNetworkStatus();
  const { success: hapticSuccess } = useHaptics();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAttendanceStats(activeGymId || '');
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs, isFetching } = useAttendanceLogs(activeGymId || '');

  const checkOutMutation = useCheckOut();

  const detailsSheetRef = useRef<BottomSheetRef>(null);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const handleRefresh = () => {
    refetchStats();
    refetchLogs();
  };

  const handleItemPress = (item: any) => {
    setSelectedLog(item);
    detailsSheetRef.current?.show();
  };

  const handleForceCheckOut = () => {
    if (!selectedLog) return;
    Alert.alert(
      'Force Check-Out',
      `Check out ${selectedLog.memberName || 'Member'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            checkOutMutation.mutate({
              memberId: selectedLog.memberId,
              gymId: activeGymId || '',
              attendanceId: selectedLog.id
            }, {
              onSuccess: () => {
                hapticSuccess();
                detailsSheetRef.current?.hide();
                handleRefresh();
              },
              onError: (err: any) => {
                Alert.alert('Error', err.message || 'Check-out failed');
              }
            });
          }
        }
      ]
    );
  };

  const renderHeader = () => (
    <View style={{ paddingBottom: spacing.lg, paddingHorizontal: spacing.lg }}>
      <Animated.View entering={FadeInDown.duration(400).springify()} style={[styles.header, { paddingBottom: spacing.lg, paddingTop: spacing.md }]}>
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
        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
          <QuickActionButton
            label="Scan QR"
            icon={<ScanLine size={24} color={colors.primary} />}
            onPress={() => router.push('/(app)/(attendance)/scan')}
            style={{ flex: 1 }}
          />
          <QuickActionButton
            label="Search"
            icon={<Search size={24} color={colors.primary} />}
            onPress={() => router.push('/(app)/(attendance)/search')}
            style={{ flex: 1 }}
          />
          <QuickActionButton
            label="Active Inside"
            icon={<Users size={24} color={colors.primary} />}
            onPress={() => router.push('/(app)/(attendance)/active')}
            style={{ flex: 1 }}
          />
          <QuickActionButton
            label="Devices"
            icon={<Monitor size={24} color={colors.primary} />}
            onPress={() => router.push('/(app)/(attendance)/devices')}
            style={{ flex: 1 }}
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(400).springify()}>
        <SectionHeader title="Recent Activity" style={{ marginTop: spacing.xl, marginBottom: spacing.sm }} />
      </Animated.View>
    </View>
  );

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const denied = String(item.status || '').toLowerCase() === 'denied';
    const checkedOut = !!item.checkOutTime;

    const { Icon, tint } = denied
      ? { Icon: AlertCircle, tint: colors.error }
      : checkedOut
        ? { Icon: LogOut, tint: colors.textSecondary }
        : { Icon: LogIn, tint: colors.success };

    const subtitle = denied
      ? `Denied · ${item.reason || item.method || 'No access'}`
      : checkedOut
        ? `In ${item.checkInTime} · Out ${item.checkOutTime}${item.durationText ? ` · ${item.durationText}` : ''}`
        : `Checked in at ${item.checkInTime}`;

    return (
      <Animated.View entering={FadeInUp.delay(Math.min(index * 50, 400)).duration(300)} style={{ paddingHorizontal: spacing.lg }}>
        <ListItem
          title={item.memberName || 'Unknown Member'}
          subtitle={subtitle}
          showChevron={false}
          leftComponent={
            <View style={[styles.iconDot, { backgroundColor: tint + '20' }]}>
              <Icon size={15} color={tint} />
            </View>
          }
          onPress={() => handleItemPress(item)}
          style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: 12 }}
        />
      </Animated.View>
    );
  };

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

      {/* Attendance Detail Sheet */}
      <BottomSheet ref={detailsSheetRef} snapPoints={[400, 420]}>
        {selectedLog && (
          <View style={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl }}>
              <UserAvatar name={selectedLog.memberName || 'Unknown'} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: typography.sizes.title.fontSize, fontWeight: '800', color: colors.text }}>
                  {selectedLog.memberName || 'Unknown Member'}
                </Text>
                <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textSecondary, marginTop: 2 }}>
                  Method: {selectedLog.method || 'FRONT_DESK'}
                </Text>
              </View>
              <StatusBadge
                label={selectedLog.status || 'Active'}
                type={String(selectedLog.status).toLowerCase() === 'denied' ? 'error' : 'success'}
              />
            </View>

            {/* Timings */}
            <View style={[styles.detailsBox, { borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xl }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                <LogIn size={16} color={colors.success} />
                <Text style={{ color: colors.text, fontSize: 14 }}>
                  Check-in Time: <Text style={{ fontWeight: '600' }}>{selectedLog.checkInTime || '—'}</Text>
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: selectedLog.durationText ? spacing.sm : 0 }}>
                <LogOut size={16} color={colors.textSecondary} />
                <Text style={{ color: colors.text, fontSize: 14 }}>
                  Check-out Time: <Text style={{ fontWeight: '600' }}>{selectedLog.checkOutTime || 'Currently inside'}</Text>
                </Text>
              </View>
              {selectedLog.durationText && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Clock size={16} color={colors.primary} />
                  <Text style={{ color: colors.text, fontSize: 14 }}>
                    Total Duration: <Text style={{ fontWeight: '600' }}>{selectedLog.durationText}</Text>
                  </Text>
                </View>
              )}
            </View>

            {/* Actions */}
            <View style={{ gap: spacing.sm }}>
              {!selectedLog.checkOutTime && String(selectedLog.status).toLowerCase() !== 'denied' && (
                <PrimaryButton
                  label="Check Out Member"
                  onPress={handleForceCheckOut}
                  loading={checkOutMutation.isPending}
                  icon={<LogOut size={18} color={colors.textOnPrimary} style={{ marginRight: 8 }} />}
                />
              )}
              {selectedLog.memberId && selectedLog.memberId !== 'GUEST' && (
                <SecondaryButton
                  label="View Member Profile"
                  onPress={() => {
                    detailsSheetRef.current?.hide();
                    router.push(`/(app)/(members)/${selectedLog.memberId}`);
                  }}
                  icon={<User size={18} color={colors.text} style={{ marginRight: 8 }} />}
                />
              )}
            </View>
          </View>
        )}
      </BottomSheet>
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
  detailsBox: {
    borderWidth: 1,
  }
});
