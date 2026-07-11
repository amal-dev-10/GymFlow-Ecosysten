import React, { useMemo, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, Platform, Alert, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  DollarSign,
  Users,
  UserCheck,
  UserPlus,
  Snowflake,
  Clock,
  LogIn,
  LogOut,
  Award,
  CreditCard,
  UserCog,
  Target,
  Bell,
  Megaphone,
  ChevronDown,
  Building2,
} from 'lucide-react-native';

import { useTheme } from '../../../src/theme/theme';
import { useAuthStore } from '../../../src/store/auth.store';
import { useWorkspaceStore } from '../../../src/store/workspace.store';
import { useWorkspace } from '../../../src/providers/WorkspaceProvider';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { useHaptics } from '../../../src/hooks/useHaptics';
import { useLiveActivity } from '../../../src/hooks/useLiveActivity';
import { attendanceApi, membershipsApi, membersApi, rolesApi, leadsApi, getDashboardBillingStats } from '../../../src/lib/api';

import { MetricCard } from '../../../src/components/MetricCard';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { UserAvatar } from '../../../src/components/UserAvatar';
import { ListItem } from '../../../src/components/ListItem';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { SkeletonLoader } from '../../../src/components/SkeletonLoader';
import { QUICK_ACTIONS, GlobalFAB } from '../../../src/components/navigation/QuickActions';
import { WorkspaceHeader } from '../../../src/components/navigation/WorkspaceHeader';
import { TrainerDashboard } from '../../../src/components/trainer/TrainerDashboard';

function comingSoon(feature: string) {
  Alert.alert(feature, `${feature} isn't built into the mobile app yet — coming soon.`);
}

// A live "breathing" dot — a solid core with an expanding, fading ring — used
// in the header to signal real-time occupancy.
function PulseDot({ color }: { color: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }), -1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 1.6 }],
    opacity: 1 - progress.value,
  }));
  return (
    <View style={{ width: 8, height: 8, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: color }, ringStyle]}
      />
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

const formatToday = () =>
  new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

function formatElapsed(mins: number): string {
  if (!mins) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
}

export default function DashboardScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { activeGymId, activeGymName, clearWorkspace } = useWorkspaceStore();
  const { can, role } = useWorkspace();
  const isTrainer = role?.toLowerCase().includes('trainer');
  const { isOffline } = useNetworkStatus();
  const { mediumImpact } = useHaptics();

  // Keep the header alert badge (unreadCount) live from the moment the app
  // opens, not just after the inbox is visited. Shares query cache with the
  // inbox screen so it's deduped.
  useLiveActivity();

  const gymId = activeGymId || '';

  // --- Data queries: each scoped to the active gym via the workspace store.
  // All queries carry staleTime so navigating back to the dashboard never
  // triggers redundant refetches within a short window. ---
  const STALE_MS = 60_000; // 1 minute

  const statsQuery = useQuery({
    queryKey: ['dashboard', 'attendance-stats', gymId],
    queryFn: () => attendanceApi.getStats(gymId),
    enabled: !!gymId && !isTrainer,
    staleTime: STALE_MS,
  });
  const analyticsQuery = useQuery({
    queryKey: ['dashboard', 'attendance-analytics', gymId],
    queryFn: () => attendanceApi.getAnalytics(gymId),
    enabled: !!gymId && !isTrainer && can('mark-attendance'),
    staleTime: STALE_MS * 5, // analytics refreshes less frequently
  });
  const activeInsideQuery = useQuery({
    queryKey: ['dashboard', 'attendance-active', gymId],
    queryFn: () => attendanceApi.listActive(gymId),
    enabled: !!gymId && can('mark-attendance'),
    staleTime: 30_000, // live occupancy is more time-sensitive
  });
  const recentLogsQuery = useQuery({
    queryKey: ['dashboard', 'attendance-logs', gymId],
    queryFn: () => attendanceApi.listLogs(gymId),
    enabled: !!gymId && !isTrainer,
    staleTime: 30_000,
  });
  const expiringQuery = useQuery({
    queryKey: ['dashboard', 'expiring', gymId],
    queryFn: () => membershipsApi.getExpiring(gymId, 7),
    enabled: !!gymId && can('freeze-membership'),
    staleTime: STALE_MS * 5,
  });
  const freezesQuery = useQuery({
    queryKey: ['dashboard', 'freezes', gymId],
    queryFn: () => membershipsApi.listFreezes(),
    enabled: !!gymId && can('freeze-membership'),
    staleTime: STALE_MS * 5,
  });
  const membersQuery = useQuery({
    queryKey: ['dashboard', 'members', gymId],
    queryFn: () => membersApi.listFlat(gymId),
    enabled: !!gymId && can('manage-members'),
    staleTime: STALE_MS * 3,
  });
  const employeesQuery = useQuery({
    queryKey: ['dashboard', 'employees'],
    queryFn: () => rolesApi.getEmployees(),
    enabled: can('manage-staff'),
    staleTime: STALE_MS * 10,
  });
  const leadsQuery = useQuery({
    queryKey: ['dashboard', 'leads', gymId],
    queryFn: () => leadsApi.list(gymId),
    enabled: !!gymId && can('manage-leads'),
    staleTime: STALE_MS * 3,
  });
  // Real billing KPIs: derived from membership subscription data on the backend
  const billingStatsQuery = useQuery({
    queryKey: ['dashboard', 'billing-stats', gymId],
    queryFn: () => getDashboardBillingStats(gymId),
    enabled: !!gymId && can('record-payment') && !isTrainer,
    staleTime: STALE_MS * 5,
  });

  const allQueries = [statsQuery, activeInsideQuery, recentLogsQuery, expiringQuery, freezesQuery, membersQuery, employeesQuery, leadsQuery, billingStatsQuery];
  const isRefreshing = allQueries.some((q) => q.isFetching && !q.isLoading);
  const isInitialLoading = allQueries.some((q) => q.isLoading && q.fetchStatus !== 'idle');

  // Only surface hard failures (not permission denials or expected 404s)
  const hasAnyError = allQueries.some((q) => {
    if (!q.isError) return false;
    const msg = (q.error as any)?.message?.toLowerCase() ?? '';
    const status = (q.error as any)?.status ?? 0;
    if (msg.includes('permission') || status === 403 || status === 404) return false;
    return true;
  });

  const oldestDataTimestamp = Math.min(
    ...allQueries.filter((q) => q.dataUpdatedAt > 0).map((q) => q.dataUpdatedAt),
    Date.now()
  );

  const onRefresh = useCallback(() => {
    mediumImpact();
    allQueries.forEach((q) => q.refetch());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId]);

  // --- Derived KPIs (computed from real API data) ---
  const freezesForGym = useMemo(() => {
    const list = freezesQuery.data || [];
    return list.filter((f: any) => f.memberMembership?.member?.homeGymId === gymId && f.status === 'Approved');
  }, [freezesQuery.data, gymId]);

  const staffForGym = useMemo(() => {
    const list = employeesQuery.data || [];
    if (!activeGymName) return list;
    return list.filter((e: any) => (e.gyms || []).includes(activeGymName));
  }, [employeesQuery.data, activeGymName]);

  const newMembersThisMonth = useMemo(() => {
    const members = membersQuery.data || [];
    const now = new Date();
    return members.filter((m: any) => {
      const created = new Date(m.createdAt);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;
  }, [membersQuery.data]);

  // Real outstanding dues from billing stats query (derived from subscriptions API)
  const pendingDues = billingStatsQuery.data?.pendingDues ?? 0;
  const overduePayments = billingStatsQuery.data?.overduePayments ?? 0;
  const todaysCollections = billingStatsQuery.data?.todaysCollections ?? 0;

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSwitchWorkspace = () => {
    mediumImpact();
    clearWorkspace();
    router.replace('/(lobby)/organizations');
  };

  const currencyFmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      {isOffline && (
        <View style={[styles.offlineBar, { backgroundColor: colors.warningLight }]}>
          <Text style={{ color: colors.warningText, fontSize: typography.sizes.caption.fontSize, fontWeight: '600' }}>
            You're offline — showing last synced data
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        refreshControl={<RefreshControl refreshing={isRefreshing && !isInitialLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Reusable Premium Workspace Header */}
        <WorkspaceHeader activeInside={statsQuery.data?.activeInside} />

        {hasAnyError && !isInitialLoading && (
          <ErrorState
            message="Some dashboard data couldn't load. Pull down to try again."
            onRetry={onRefresh}
            style={{ marginTop: spacing.lg }}
          />
        )}
        {isTrainer ? (
          <TrainerDashboard />
        ) : (
          <>
            {/* KPI Cards */}
            <SectionHeader title="Today's Snapshot" style={{ marginTop: spacing.xl }} />
            {isInitialLoading ? (
              <View style={{ gap: spacing.md }}>
                <View style={styles.gridRow}>
                  <SkeletonLoader width="100%" height={92} borderRadius={radius.md} style={{ flex: 1 }} />
                  <SkeletonLoader width="100%" height={92} borderRadius={radius.md} style={{ flex: 1 }} />
                </View>
                <View style={styles.gridRow}>
                  <SkeletonLoader width="100%" height={92} borderRadius={radius.md} style={{ flex: 1 }} />
                  <SkeletonLoader width="100%" height={92} borderRadius={radius.md} style={{ flex: 1 }} />
                </View>
              </View>
            ) : (
              <View style={{ gap: spacing.md }}>
                <View style={styles.gridRow}>
                  <MetricCard
                    label="Members Inside"
                    value={String(statsQuery.data?.activeInside ?? '—')}
                    icon={<UserCheck size={18} color={colors.primary} />}
                    delay={80}
                  />
                  <MetricCard
                    label="Attendance Today"
                    value={String(statsQuery.data?.totalCheckInsToday ?? '—')}
                    icon={<Users size={18} color={colors.primary} />}
                    delay={140}
                  />
                </View>
                {can('record-payment') && (
                  <View style={styles.gridRow}>
                    <MetricCard
                      label="Collected Today"
                      value={billingStatsQuery.isLoading ? '…' : currencyFmt(todaysCollections)}
                      icon={<CreditCard size={18} color={colors.success} />}
                      delay={200}
                    />
                    <MetricCard
                      label="Pending Dues"
                      value={billingStatsQuery.isLoading ? '…' : currencyFmt(pendingDues)}
                      icon={<DollarSign size={18} color={colors.error} />}
                      delay={260}
                    />
                  </View>
                )}
                {(can('manage-members') || statsQuery.data?.totalDenied !== undefined) && (
                  <View style={styles.gridRow}>
                    {can('manage-members') && (
                      <MetricCard
                        label="New Members (Mo.)"
                        value={String(newMembersThisMonth)}
                        icon={<UserPlus size={18} color={colors.primary} />}
                        delay={320}
                      />
                    )}
                    {statsQuery.data?.totalDenied !== undefined && (
                      <MetricCard
                        label="Denied Today"
                        value={String(statsQuery.data.totalDenied)}
                        icon={<LogOut size={18} color={colors.warning} />}
                        delay={380}
                      />
                    )}
                    {!can('manage-members') && <View style={{ flex: 1 }} />}
                  </View>
                )}
                {can('freeze-membership') && (
                  <View style={styles.gridRow}>
                    <MetricCard
                      label="Expiring (7d)"
                      value={String(expiringQuery.data?.length ?? '—')}
                      icon={<Clock size={18} color={colors.primary} />}
                      delay={440}
                    />
                    <MetricCard
                      label="Frozen"
                      value={String(freezesForGym.length)}
                      icon={<Snowflake size={18} color={colors.primary} />}
                      delay={500}
                    />
                  </View>
                )}
              </View>
            )}

            {/* Members Inside */}
            {can('mark-attendance') && (
              <>
                <SectionHeader title="Members Inside" actionLabel="View all" onActionPress={() => router.push('/(app)/(checkin)')} style={{ marginTop: spacing.xxl }} />
                {activeInsideQuery.isLoading ? (
                  <SkeletonLoader width="100%" height={140} borderRadius={radius.md} />
                ) : (activeInsideQuery.data || []).length === 0 ? (
                  <EmptyState
                    title="Nobody Checked In"
                    description="Members who check in will show up here in real time."
                    icon={<Users size={36} color={colors.textMuted} />}
                    style={{ flex: undefined, paddingVertical: spacing.xl }}
                  />
                ) : (
                  <Card padded={false}>
                    {(activeInsideQuery.data || []).slice(0, 5).map((m: any, idx: number, arr: any[]) => {
                      const elapsedStr = formatElapsed(m.elapsedMinutes);
                      return (
                        <Animated.View key={m.id} entering={FadeInDown.duration(300).delay(idx * 60)}>
                          <Pressable
                            onPress={() => router.push(`/(app)/(members)/${m.memberId}`)}
                            style={({ pressed }) => [
                              styles.insideMemberRow,
                              {
                                borderBottomWidth: idx < arr.length - 1 ? StyleSheet.hairlineWidth : 0,
                                borderBottomColor: colors.border,
                                backgroundColor: pressed ? colors.background : 'transparent',
                                paddingVertical: spacing.md,
                                paddingHorizontal: spacing.lg,
                              }
                            ]}
                          >
                            <UserAvatar name={m.name} size={40} />
                            
                            <View style={{ flex: 1, marginLeft: spacing.md }}>
                              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>
                                {m.name}
                              </Text>
                              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                                {m.planName}
                              </Text>
                            </View>

                            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600' }}>
                                In: {m.checkInTime}
                              </Text>
                              <View style={[
                                styles.timePill,
                                {
                                  backgroundColor: m.isOverLimit ? colors.error + '12' : colors.primaryLight,
                                  borderColor: m.isOverLimit ? colors.error + '30' : colors.primary + '30',
                                  marginTop: 4,
                                }
                              ]}>
                                <Text style={{
                                  fontSize: 10,
                                  fontWeight: '700',
                                  color: m.isOverLimit ? colors.error : colors.primary,
                                }}>
                                  {elapsedStr}
                                </Text>
                              </View>
                            </View>
                          </Pressable>
                        </Animated.View>
                      );
                    })}
                  </Card>
                )}
              </>
            )}

            {/* Expiring Memberships */}
            {can('freeze-membership') && (
              <>
                <SectionHeader title="Membership Alerts" style={{ marginTop: spacing.xxl }} />
                {(expiringQuery.data || []).length === 0 && freezesForGym.length === 0 ? (
                  <EmptyState
                    title="All Clear"
                    description="No memberships are expiring soon or frozen right now."
                    icon={<Clock size={36} color={colors.textMuted} />}
                    style={{ flex: undefined, paddingVertical: spacing.xl }}
                  />
                ) : (
                  <Card padded={false}>
                    {(expiringQuery.data || []).slice(0, 3).map((sub: any, idx: number) => {
                      const mId = sub.member?.id || sub.memberId;
                      return (
                        <ListItem
                          key={sub.id}
                          title={`${sub.member?.firstName} ${sub.member?.lastName}`}
                          subtitle={`${sub.membershipPlan?.name || 'Plan'} · expires in ${sub.daysUntilExpiry}d`}
                          leftComponent={<Clock size={18} color={colors.warning} />}
                          rightComponent={<StatusBadge label="Expiring" type="warning" />}
                          showChevron={true}
                          onPress={mId ? () => {
                            mediumImpact();
                            router.push(`/(app)/(members)/${mId}`);
                          } : undefined}
                          style={idx === (expiringQuery.data || []).length - 1 && freezesForGym.length === 0 ? { borderBottomWidth: 0 } : undefined}
                        />
                      );
                    })}
                    {freezesForGym.slice(0, 3).map((freeze: any, idx: number, arr: any[]) => {
                      const mId = freeze.memberMembership?.member?.id || freeze.memberMembership?.memberId || freeze.memberId;
                      return (
                        <ListItem
                          key={freeze.id}
                          title={`${freeze.memberMembership?.member?.firstName} ${freeze.memberMembership?.member?.lastName}`}
                          subtitle={`Frozen · starts ${new Date(freeze.startDate).toLocaleDateString()}`}
                          leftComponent={<Snowflake size={18} color={colors.error} />}
                          rightComponent={<StatusBadge label="Frozen" type="error" />}
                          showChevron={true}
                          onPress={mId ? () => {
                            mediumImpact();
                            router.push(`/(app)/(members)/${mId}`);
                          } : undefined}
                          style={idx === arr.length - 1 ? { borderBottomWidth: 0 } : undefined}
                        />
                      );
                    })}
                  </Card>
                )}
              </>
            )}

            {/* Leads Snapshot */}
            {can('manage-leads') && (
              <>
                <SectionHeader title="Leads Snapshot" style={{ marginTop: spacing.xxl }} />
                {leadsQuery.isLoading ? (
                  <SkeletonLoader width="100%" height={140} borderRadius={radius.md} />
                ) : (leadsQuery.data || []).length === 0 ? (
                  <EmptyState
                    title="No Leads"
                    description="New prospective members will show up here."
                    icon={<Target size={36} color={colors.textMuted} />}
                    style={{ flex: undefined, paddingVertical: spacing.xl }}
                  />
                ) : (
                  <Card padded={false}>
                    {(leadsQuery.data || []).slice(0, 5).map((lead: any, idx: number, arr: any[]) => (
                      <ListItem
                        key={lead.id}
                        title={lead.name || 'Lead'}
                        subtitle={lead.phone || lead.status?.name || ''}
                        leftComponent={<UserAvatar name={lead.name || 'L'} size={36} />}
                        showChevron={false}
                        style={idx === arr.length - 1 ? { borderBottomWidth: 0 } : undefined}
                      />
                    ))}
                  </Card>
                )}
              </>
            )}
          </>
        )}

        {/* Recent Activity */}
        <SectionHeader title="Recent Activity" style={{ marginTop: spacing.xxl }} />
        {recentLogsQuery.isLoading ? (
          <SkeletonLoader width="100%" height={140} borderRadius={radius.md} />
        ) : (recentLogsQuery.data || []).length === 0 ? (
          <EmptyState
            title="No Activity Yet"
            description="Check-ins and check-outs from today will appear here."
            icon={<Clock size={36} color={colors.textMuted} />}
            style={{ flex: undefined, paddingVertical: spacing.xl }}
          />
        ) : (
          <Card padded={false}>
            {(recentLogsQuery.data || []).slice(0, 6).map((log: any, idx: number, arr: any[]) => {
              const isDenied = log.status === 'Denied' || log.denied === true;
              const isOut = !isDenied && !!log.checkOutTime;
              const time = new Date(log.checkInTime || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <ListItem
                  key={log.id}
                  title={log.memberName || log.member?.name || 'Member'}
                  subtitle={`${isDenied ? 'Access Denied' : isOut ? 'Checked out' : 'Checked in'} · ${time}`}
                  leftComponent={
                    isDenied
                      ? <LogOut size={18} color={colors.error} />
                      : isOut
                        ? <LogOut size={18} color={colors.textSecondary} />
                        : <LogIn size={18} color={colors.success} />
                  }
                  rightComponent={isDenied ? <StatusBadge label="Denied" type="error" /> : undefined}
                  showChevron={false}
                  style={idx === arr.length - 1 ? { borderBottomWidth: 0 } : undefined}
                />
              );
            })}
          </Card>
        )}

        {/* Staff */}
        {can('manage-staff') && (
          <>
            <SectionHeader title="Staff" style={{ marginTop: spacing.xxl }} />
            {staffForGym.length === 0 ? (
              <EmptyState
                title="No Staff Assigned"
                description="Staff assigned to this gym will appear here."
                icon={<UserCog size={36} color={colors.textMuted} />}
                style={{ flex: undefined, paddingVertical: spacing.xl }}
              />
            ) : (
              <Card>
                {staffForGym.slice(0, 6).map((e: any, idx: number, arr: any[]) => (
                  <ListItem
                    key={e.id}
                    title={e.name}
                    subtitle={(e.roleNames || []).join(', ') || 'Staff'}
                    leftComponent={<UserAvatar name={e.name} size={36} />}
                    showChevron={false}
                    style={idx === arr.length - 1 ? { borderBottomWidth: 0 } : undefined}
                  />
                ))}
              </Card>
            )}
          </>
        )}

        {/* Leads (Receptionist) */}
        {can('manage-leads') && (
          <>
            <SectionHeader title="Leads" actionLabel="View all" onActionPress={() => comingSoon('Leads')} style={{ marginTop: spacing.xxl }} />
            {(leadsQuery.data || []).length === 0 ? (
              <EmptyState
                title="No Leads Yet"
                description="New prospective members will show up here."
                icon={<Target size={36} color={colors.textMuted} />}
                style={{ flex: undefined, paddingVertical: spacing.xl }}
              />
            ) : (
              <Card padded={false}>
                {(leadsQuery.data || []).slice(0, 5).map((lead: any, idx: number, arr: any[]) => (
                  <ListItem
                    key={lead.id}
                    title={lead.name || 'Lead'}
                    subtitle={lead.phone || lead.status?.name || ''}
                    leftComponent={<UserAvatar name={lead.name || 'L'} size={36} />}
                    showChevron={false}
                    style={idx === arr.length - 1 ? { borderBottomWidth: 0 } : undefined}
                  />
                ))}
              </Card>
            )}
          </>
        )}

        {/* Announcements */}
        <SectionHeader title="Announcements" style={{ marginTop: spacing.xxl }} />
        <EmptyState
          title="No Announcements"
          description="Updates from your gym owner or GymFlow will appear here."
          icon={<Megaphone size={36} color={colors.textMuted} />}
          style={{ flex: undefined, paddingVertical: spacing.xl }}
        />

        {/* Last synced */}
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.sizes.overline.fontSize,
            textAlign: 'center',
            marginTop: spacing.xl,
          }}
        >
          Last synced {new Date(oldestDataTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </ScrollView>
      <GlobalFAB />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  offlineBar: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  workspaceStrip: {
    letterSpacing: 0.5,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  insideMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
});
