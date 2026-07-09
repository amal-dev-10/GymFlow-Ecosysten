import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MapPin, ShieldAlert, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../src/theme/theme';
import { useWorkspaceStore } from '../../src/store/workspace.store';
import { useWorkspace } from '../../src/providers/WorkspaceProvider';
import { orgApi, OrganizationSummaryDto, ApiError } from '../../src/lib/api';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { SkeletonLoader } from '../../src/components/SkeletonLoader';

export default function GymsScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ orgId: string; orgName: string }>();
  const selectGym = useWorkspaceStore((state) => state.selectGym);
  const { invalidateWorkspaceCache } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [org, setOrg] = useState<OrganizationSummaryDto | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const data = await orgApi.list();
      const match = data.find((o) => o.id === params.orgId);
      setOrg(match || null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load gyms for this organization.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = (gym: { id: string; name: string }) => {
    invalidateWorkspaceCache();
    selectGym(gym);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          {[0, 1].map((i) => (
            <SkeletonLoader key={i} width="100%" height={88} borderRadius={radius.lg} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ErrorState message={error} onRetry={() => load()} />
      </SafeAreaView>
    );
  }

  const gyms = org?.gyms || [];

  if (gyms.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <EmptyState
          icon={<ShieldAlert size={40} color={colors.textMuted} />}
          title="No Gyms Yet"
          description={`${params.orgName || 'This organization'} doesn't have any gyms set up yet.`}
          actionLabel="Choose a Different Organization"
          onActionPress={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
        <Text style={{ color: colors.textSecondary }}>
          Which {params.orgName} location are you working from?
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        {gyms.map((gym, index) => (
          <Animated.View key={gym.id} entering={FadeInDown.duration(400).delay(index * 80)}>
            <GymCard gym={gym} onPress={() => handleSelect(gym)} />
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function GymCard({ gym, onPress }: { gym: { id: string; name: string; address?: string | null }; onPress: () => void }) {
  const { colors, typography, spacing, radius, elevation } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        elevation.sm,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderColor: colors.border,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {/* Cover placeholder */}
      <View style={[styles.cover, { backgroundColor: colors.primaryLight, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }]}>
        <MapPin size={22} color={colors.primary} />
        <View style={[styles.statusBadge, { backgroundColor: colors.successLight, borderRadius: radius.xs }]}>
          <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
          <Text style={{ color: colors.successText, fontSize: typography.sizes.overline.fontSize, fontWeight: '700', marginLeft: 4 }}>
            ACTIVE
          </Text>
        </View>
      </View>

      <View style={[styles.cardBody, { padding: spacing.md }]}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: colors.text, fontSize: typography.sizes.bodyMedium.fontSize, fontWeight: '700' }}>
            {gym.name}
          </Text>
          {!!gym.address && (
            <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: typography.sizes.caption.fontSize, marginTop: 2 }}>
              {gym.address}
            </Text>
          )}
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  cover: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
