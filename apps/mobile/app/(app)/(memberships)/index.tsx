import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, RefreshControl, ActivityIndicator, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Search, Filter } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

import { useTheme } from '../../../src/theme/theme';
import { useMemberships } from '../../../src/hooks/useMemberships';
import { useWorkspace } from '../../../src/providers/WorkspaceProvider';
import { useWorkspaceStore } from '../../../src/store/workspace.store';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { typography } from '../../../src/theme/typography';

import { ListItem } from '../../../src/components/ListItem';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { MemberListSkeleton } from '../../../src/components/members/MemberListSkeleton';
import { IconButton } from '../../../src/components/IconButton';
import { SearchBar } from '../../../src/components/SearchBar';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { FloatingActionButton } from '../../../src/components/FloatingActionButton';
import { OfflineBanner } from '../../../src/components/OfflineBanner';

export default function MembershipListScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const { can } = useWorkspace();
  const { isOffline } = useNetworkStatus();

  useEffect(() => {
    const backAction = () => {
      router.replace('/(app)/(more)');
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [router]);

  const [search, setSearch] = useState('');

  const { data: memberships, isLoading, isError, refetch, isFetching } = useMemberships();

  const filteredMemberships = useMemo(() => {
    if (!memberships) return [];
    let list = memberships;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => 
        (m.member?.firstName + ' ' + m.member?.lastName).toLowerCase().includes(q) ||
        m.membershipPlan?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [memberships, search]);

  const renderItem = useCallback(({ item, index }: { item: any, index: number }) => {
    const memberName = item.member ? `${item.member.firstName} ${item.member.lastName}` : 'Unknown Member';
    const planName = item.membershipPlan?.name || 'Custom Plan';
    const isExpiringSoon = item.daysUntilExpiry !== undefined && item.daysUntilExpiry <= 7 && item.daysUntilExpiry >= 0;
    
    let type: 'success' | 'warning' | 'error' | 'info' = 'success';
    let label = item.status || 'Active';
    
    if (item.status === 'Frozen') type = 'info';
    else if (item.status === 'Cancelled' || item.status === 'Expired') type = 'error';
    else if (isExpiringSoon) {
      type = 'warning';
      label = 'Expiring Soon';
    }

    return (
      <Animated.View entering={FadeInUp.delay(Math.min(index * 50, 500)).duration(400)}>
        <ListItem
          title={memberName}
          subtitle={`${planName} · ${item.daysUntilExpiry !== undefined ? item.daysUntilExpiry + 'd left' : ''}`}
          rightComponent={<StatusBadge label={label} type={type} />}
          onPress={() => router.push(`/(app)/(memberships)/${item.id}`)}
          style={{ marginBottom: spacing.sm, borderRadius: radius.lg }}
        />
      </Animated.View>
    );
  }, [router, spacing.sm, radius.lg]);

  const TypedFlashList = FlashList as any;

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      {isOffline && <OfflineBanner />}

      {/* Premium Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <Animated.View 
            entering={FadeInDown.duration(400).springify()}
            style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}
          >
            <Animated.Text
              style={{
                fontSize: typography.sizes.display.fontSize,
                fontWeight: '800',
                color: colors.text,
                letterSpacing: -0.5,
              }}
            >
              Active Purchases
            </Animated.Text>
            {!isLoading && (
              <Animated.Text
                style={{
                  fontSize: typography.sizes.title.fontSize,
                  fontWeight: '600',
                  color: colors.textSecondary,
                }}
              >
                {filteredMemberships.length}
              </Animated.Text>
            )}
          </Animated.View>
          
          <Animated.View entering={FadeInDown.delay(200).duration(400).springify()} style={{ flexDirection: 'row', gap: spacing.sm }}>
            <IconButton
              icon={<Filter size={20} color={colors.textSecondary} />}
              onPress={() => {}}
              accessibilityLabel="Filter memberships"
              variant="outlined"
            />
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search memberships..."
            onClear={() => setSearch('')}
          />
        </Animated.View>
      </View>

      <View style={styles.listContainer}>
        {isLoading && filteredMemberships.length === 0 ? (
          <MemberListSkeleton count={6} />
        ) : isError ? (
          <ErrorState message="Failed to load memberships" onRetry={refetch} />
        ) : (
          <TypedFlashList
            data={filteredMemberships}
            keyExtractor={(item: any) => item.id}
            renderItem={renderItem}
            estimatedItemSize={88}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120, paddingTop: spacing.sm }}
            refreshControl={
              <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <EmptyState
                title="No memberships found"
                description={search ? "Try adjusting your search terms" : "Create a membership to get started"}
                icon={<Search size={36} color={colors.textMuted} />}
                actionLabel={can('manage-members') && !search ? "Add Membership" : undefined}
                onActionPress={() => router.push('/(app)/(memberships)/create')}
                style={{ marginTop: spacing.xxl }}
              />
            }
          />
        )}
      </View>

      {can('manage-members') && (
        <FloatingActionButton
          icon={<Plus size={24} color={colors.textOnPrimary} />}
          onPress={() => router.push('/(app)/(memberships)/create')}
          accessibilityLabel="Add Membership"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {},
  listContainer: {
    flex: 1,
  },
});
