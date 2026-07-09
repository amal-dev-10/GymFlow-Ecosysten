import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Text, RefreshControl, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clock, Calendar, AlertTriangle, Play, Pause, ChevronUp, ChevronDown, RefreshCw, XCircle } from 'lucide-react-native';

import { useTheme } from '../../../src/theme/theme';
import { useMembershipDetails, useUpdateMembership, useReactivateMembership } from '../../../src/hooks/useMemberships';
import { useWorkspace } from '../../../src/providers/WorkspaceProvider';

import { Card } from '../../../src/components/Card';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { ListItem } from '../../../src/components/ListItem';
import { ErrorState } from '../../../src/components/ErrorState';
import { SkeletonLoader } from '../../../src/components/SkeletonLoader';
import { QuickActionButton } from '../../../src/components/dashboard/QuickActionButton';

export default function MembershipDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing, radius } = useTheme();
  const router = useRouter();
  const { can } = useWorkspace();

  const { data: membership, isLoading, isError, refetch, isFetching } = useMembershipDetails(id || '');
  const updateMutation = useUpdateMembership();
  const reactivateMutation = useReactivateMembership();

  const memberName = membership?.member ? `${membership.member.firstName} ${membership.member.lastName}` : 'Unknown Member';
  const planName = membership?.membershipPlan?.name || 'Custom Plan';
  
  const status = membership?.status || 'Unknown';
  let type: 'success' | 'warning' | 'error' | 'info' = 'success';
  if (status === 'Frozen') type = 'info';
  else if (status === 'Cancelled' || status === 'Expired') type = 'error';
  else if (membership?.daysUntilExpiry !== undefined && membership?.daysUntilExpiry <= 7) type = 'warning';

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md }]}>
        <SkeletonLoader width="100%" height={120} borderRadius={radius.lg} />
        <SkeletonLoader width="100%" height={120} borderRadius={radius.lg} />
        <SkeletonLoader width="100%" height={120} borderRadius={radius.lg} />
      </View>
    );
  }

  if (isError || !membership) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.lg }]}>
        <ErrorState message="Failed to load membership details" onRetry={refetch} />
      </View>
    );
  }

  const handleAction = (action: string) => {
    if (action === 'Renew') {
      router.push(`/(app)/(memberships)/renew?id=${membership.id}`);
    } else if (action === 'Freeze') {
      router.push(`/(app)/(memberships)/freeze?id=${membership.id}`);
    } else if (action === 'Reactivate') {
      Alert.alert('Reactivate Membership', 'Are you sure you want to reactivate this membership early?', [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reactivate', 
          onPress: () => {
            reactivateMutation.mutate(membership.id, {
              onSuccess: () => Alert.alert('Success', 'Membership reactivated.'),
              onError: (e: any) => Alert.alert('Error', e.message || 'Failed to reactivate'),
            });
          }
        }
      ]);
    } else if (action === 'Cancel') {
      Alert.alert(
        'Cancel Membership',
        'Are you sure you want to cancel this membership? This cannot be undone.',
        [
          { text: 'Keep It', style: 'cancel' },
          { 
            text: 'Cancel Membership', 
            style: 'destructive',
            onPress: () => {
              updateMutation.mutate({ id: membership.id, payload: { status: 'Cancelled' } }, {
                onSuccess: () => Alert.alert('Success', 'Membership has been cancelled.'),
                onError: (e: any) => Alert.alert('Error', e.message || 'Failed to cancel'),
              });
            }
          }
        ]
      );
    } else {
      // Upgrade, Downgrade, Extend
      router.push(`/(app)/(memberships)/adjust?id=${membership.id}&actionType=${action}`);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 }]}>
        <View style={styles.titleRow}>
          <Text style={{ flex: 1, fontSize: typography.sizes.headline.fontSize, fontWeight: '700', color: colors.text }}>
            {planName}
          </Text>
          <StatusBadge label={status} type={type} />
        </View>
        <Text style={{ fontSize: typography.sizes.body.fontSize, color: colors.textSecondary, marginTop: spacing.xs }}>
          For {memberName}
        </Text>
        
        <View style={{ flexDirection: 'row', marginTop: spacing.lg, gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textMuted }}>Start Date</Text>
            <Text style={{ fontSize: typography.sizes.bodyMedium.fontSize, color: colors.text, fontWeight: '500', marginTop: 2 }}>
              {new Date(membership.startDate).toLocaleDateString()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textMuted }}>End Date</Text>
            <Text style={{ fontSize: typography.sizes.bodyMedium.fontSize, color: colors.text, fontWeight: '500', marginTop: 2 }}>
              {new Date(membership.endDate).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {membership.daysUntilExpiry !== undefined && membership.daysUntilExpiry >= 0 && (
          <View style={{ marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceElevated, padding: spacing.md, borderRadius: radius.md }}>
            <Clock size={16} color={type === 'warning' ? colors.warning : colors.primary} />
            <Text style={{ marginLeft: spacing.sm, fontSize: typography.sizes.bodyMedium.fontSize, color: type === 'warning' ? colors.warningText : colors.text, fontWeight: '600' }}>
              {membership.daysUntilExpiry} days remaining
            </Text>
          </View>
        )}
      </View>

      <SectionHeader title="Quick Actions" style={{ marginTop: spacing.xxl }} />
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={{ marginHorizontal: -spacing.lg }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md, paddingVertical: spacing.xs }}
      >
        {can('manage-members') && (
          <>
            <QuickActionButton label="Renew" icon={<RefreshCw size={20} color={colors.primary} />} onPress={() => handleAction('Renew')} />
            {status !== 'Frozen' && (
              <QuickActionButton label="Freeze" icon={<Pause size={20} color={colors.primary} />} onPress={() => handleAction('Freeze')} />
            )}
            {status === 'Frozen' && (
              <QuickActionButton label="Reactivate" icon={<Play size={20} color={colors.primary} />} onPress={() => handleAction('Reactivate')} />
            )}
            <QuickActionButton label="Upgrade" icon={<ChevronUp size={20} color={colors.primary} />} onPress={() => handleAction('Upgrade')} />
            <QuickActionButton label="Downgrade" icon={<ChevronDown size={20} color={colors.primary} />} onPress={() => handleAction('Downgrade')} />
            <QuickActionButton label="Extend" icon={<Calendar size={20} color={colors.primary} />} onPress={() => handleAction('Extend')} />
            <QuickActionButton label="Cancel" icon={<XCircle size={20} color={colors.error} />} onPress={() => handleAction('Cancel')} />
          </>
        )}
      </ScrollView>

      <SectionHeader title="Timeline & History" style={{ marginTop: spacing.xxl }} />
      <Card padded={false}>
        {/* Timeline placeholder - will be populated by API data in full implementation */}
        <ListItem
          title="Membership Activated"
          subtitle={new Date(membership.startDate).toLocaleDateString()}
          leftComponent={<Play size={18} color={colors.success} />}
          showChevron={false}
        />
        <ListItem
          title="Membership Created"
          subtitle={new Date(membership.createdAt || membership.startDate).toLocaleDateString()}
          leftComponent={<Calendar size={18} color={colors.primary} />}
          showChevron={false}
          style={{ borderBottomWidth: 0 }}
        />
      </Card>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    // Base styles handled in inline style for theme access
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
