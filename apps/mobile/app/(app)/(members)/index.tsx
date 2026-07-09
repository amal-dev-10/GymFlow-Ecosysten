import { useAuthStore } from '../../../src/store/auth.store';
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, RefreshControl, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Scan, UserPlus, Filter } from 'lucide-react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

import { useTheme } from '../../../src/theme/theme';
import { useMembers } from '../../../src/hooks/useMembers';
import { useWorkspace } from '../../../src/providers/WorkspaceProvider';
import type { MemberDto } from '../../../src/lib/api';

import { SearchBar } from '../../../src/components/SearchBar';
import { IconButton } from '../../../src/components/IconButton';
import { FloatingActionButton } from '../../../src/components/FloatingActionButton';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { MemberCard } from '../../../src/components/members/MemberCard';
import { MemberListSkeleton } from '../../../src/components/members/MemberListSkeleton';
import { MemberFilterSheet, MemberFilters, MemberFilterSheetRef } from '../../../src/components/members/MemberFilterSheet';
import { typography } from '@/theme/typography';
import { useSearchStore } from '../../../src/store/search.store';
import { Pressable } from 'react-native';

export default function MembersListScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { can, role } = useWorkspace();
  const { user } = useAuthStore();
  const isTrainer = role?.toLowerCase().includes('trainer');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<MemberFilters>({ status: '', gender: '', sortBy: '' });

  const filterSheetRef = useRef<MemberFilterSheetRef>(null);

  // Debounce search input
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (text: string) => {
    setSearch(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(text);
    }, 500);
  };

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMembers(debouncedSearch, filters as unknown as Record<string, string>);

  const members = useMemo(() => {
    const all = data?.pages.flatMap((p) => p.data) || [];
    if (isTrainer && user) {
      return all.filter((m: any) => m.assignedTrainer?.id === user.id || m.assignedTrainerId === user.id);
    }
    return all;
  }, [data, isTrainer, user]);

  // Use backend total count from the query cache so it doesn't increment on scroll
  const totalMembers = data?.pages?.[0]?.total ?? members.length;

  const handleMemberPress = useCallback((member: MemberDto) => {
    router.push(`/(app)/(members)/${member.id}`);
  }, [router]);

  const renderItem = useCallback(({ item, index }: { item: MemberDto; index: number }) => (
    <Animated.View entering={FadeInUp.delay(Math.min(index * 50, 500)).duration(400)}>
      <MemberCard member={item} onPress={() => handleMemberPress(item)} />
    </Animated.View>
  ), [handleMemberPress]);

  const TypedFlashList = FlashList as any;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
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
              Members
            </Animated.Text>
            {!isLoading && (
              <Animated.Text
                style={{
                  fontSize: typography.sizes.title.fontSize,
                  fontWeight: '600',
                  color: colors.textSecondary,
                }}
              >
                {totalMembers}
              </Animated.Text>
            )}
          </Animated.View>
          
          <Animated.View entering={FadeInDown.delay(200).duration(400).springify()} style={{ flexDirection: 'row', gap: spacing.sm }}>
            <IconButton
              icon={<Filter size={20} color={Object.values(filters).some(Boolean) ? colors.primary : colors.textSecondary} />}
              onPress={() => filterSheetRef.current?.show()}
              accessibilityLabel="Filter members"
              variant={Object.values(filters).some(Boolean) ? 'filled' : 'outlined'}
            />
            <IconButton
              icon={<Scan size={20} color={colors.text} />}
              onPress={() => router.push('/(app)/(members)/scan')}
              accessibilityLabel="Scan QR"
              variant="outlined"
            />
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
          <Pressable onPress={() => useSearchStore.getState().openSearch()}>
            <View pointerEvents="none">
              <SearchBar
                value={search}
                onChangeText={handleSearch}
                placeholder="Search by name, phone, or ID..."
                onClear={() => handleSearch('')}
              />
            </View>
          </Pressable>
        </Animated.View>
      </View>

      {/* List content */}
      <View style={styles.listContainer}>
        {isLoading && members.length === 0 ? (
          <MemberListSkeleton count={6} />
        ) : isError ? (
          <ErrorState message="Failed to load members." onRetry={refetch} />
        ) : (
          <>
            <TypedFlashList
              data={members}
              renderItem={renderItem}
              keyExtractor={(item: any) => item.id}
              estimatedItemSize={88}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120, paddingTop: spacing.sm }}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching && !isFetchingNextPage}
                  onRefresh={refetch}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
              onEndReached={() => {
                if (hasNextPage && !isFetchingNextPage) {
                  fetchNextPage();
                }
              }}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                <EmptyState
                  title="No members found"
                  description={search || Object.values(filters).some(Boolean)
                    ? "Try adjusting your search or filters."
                    : "Start building your community by adding your first member."
                  }
                  actionLabel={can('manage-members') && !search && !Object.values(filters).some(Boolean) ? "Add Member" : undefined}
                  onActionPress={() => router.push('/(app)/(members)/create')}
                />
              }
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View style={{ padding: spacing.md, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : null
              }
            />
          </>
        )}
      </View>

      {/* Filter Sheet */}
      <MemberFilterSheet
        ref={filterSheetRef}
        filters={filters}
        onApply={setFilters}
      />

      {/* FAB */}
      {can('manage-members') && (
        <FloatingActionButton
          icon={<UserPlus size={24} color={colors.textOnPrimary} />}
          onPress={() => router.push('/(app)/(members)/create')}
          accessibilityLabel="Create member"
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
