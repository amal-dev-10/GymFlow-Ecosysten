import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, RefreshControl, ActivityIndicator, FlatList, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Search, Tag, DollarSign, Calendar, Award } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

import { useTheme } from '../../../src/theme/theme';
import { useMembershipPlans } from '../../../src/hooks/useMemberships';
import { useWorkspace } from '../../../src/providers/WorkspaceProvider';
import { ListItem } from '../../../src/components/ListItem';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { MemberListSkeleton } from '../../../src/components/members/MemberListSkeleton';
import { SearchBar } from '../../../src/components/SearchBar';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { FloatingActionButton } from '../../../src/components/FloatingActionButton';

export default function MembershipPlansScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { can } = useWorkspace();

  useEffect(() => {
    const backAction = () => {
      router.replace('/(app)/(more)');
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [router]);

  const [search, setSearch] = useState('');

  const { data: plans, isLoading, isError, refetch, isFetching } = useMembershipPlans();

  const filteredPlans = useMemo(() => {
    if (!plans) return [];
    let list = plans;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.code?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [plans, search]);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const formattedPrice = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(item.basePrice);

    const durationText = `${item.durationValue} ${item.durationType}`;
    
    let type: 'success' | 'warning' | 'error' | 'info' = 'success';
    let label = item.status || 'Active';
    if (label.toLowerCase() === 'inactive' || label.toLowerCase() === 'archived') {
      type = 'error';
    } else if (label.toLowerCase() === 'draft') {
      type = 'warning';
    }

    return (
      <Animated.View 
        entering={FadeInUp.delay(Math.min(index * 50, 400)).duration(350)}
        style={{ marginBottom: spacing.md }}
      >
        <ListItem
          title={item.name}
          subtitle={`${item.category} · ${durationText} · Code: ${item.code}`}
          leftComponent={
            <View style={[styles.planIcon, { backgroundColor: colors.primary + '12', borderRadius: radius.md }]}>
              <Award size={20} color={colors.primary} />
            </View>
          }
          rightComponent={
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={[styles.priceText, { color: colors.text, fontSize: typography.sizes.body.fontSize }]}>
                {formattedPrice}
              </Text>
              <StatusBadge label={label} type={type} />
            </View>
          }
          style={{ borderRadius: radius.xl }}
          onPress={() => {}} // Could link to detail/edit screen later
        />
      </Animated.View>
    );
  }, [colors.primary, colors.text, spacing.md, radius.xl, radius.md, typography.sizes.body.fontSize]);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
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
              Plans Catalog
            </Animated.Text>
            {!isLoading && (
              <Animated.Text
                style={{
                  fontSize: typography.sizes.title.fontSize,
                  fontWeight: '600',
                  color: colors.textSecondary,
                }}
              >
                {filteredPlans.length}
              </Animated.Text>
            )}
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search plans catalog..."
            onClear={() => setSearch('')}
          />
        </Animated.View>
      </View>

      <View style={styles.listContainer}>
        {isLoading && filteredPlans.length === 0 ? (
          <MemberListSkeleton count={6} />
        ) : isError ? (
          <ErrorState message="Failed to load membership plans catalog" onRetry={refetch} />
        ) : (
          <FlatList
            data={filteredPlans}
            keyExtractor={(item: any) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120, paddingTop: spacing.sm }}
            refreshControl={
              <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />
            }
            ListEmptyComponent={
              <EmptyState
                title="No membership plans"
                description={search ? "Try adjusting your search terms" : "Configure membership plans for your gym catalog"}
                icon={<Tag size={36} color={colors.textMuted} />}
                actionLabel={can('manage-members') && !search ? "Create Plan" : undefined}
                onActionPress={() => router.push('/(app)/(memberships)/plans-create')}
                style={{ marginTop: spacing.xxl }}
              />
            }
          />
        )}
      </View>

      {can('manage-members') && (
        <FloatingActionButton
          icon={<Plus size={24} color={colors.textOnPrimary} />}
          onPress={() => router.push('/(app)/(memberships)/plans-create')}
          accessibilityLabel="Create Plan"
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
  planIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceText: {
    fontWeight: '700',
  },
});
