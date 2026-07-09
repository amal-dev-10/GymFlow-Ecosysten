import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ShieldAlert, LogOut, ChevronRight, Dumbbell } from 'lucide-react-native';
import { useTheme } from '../../src/theme/theme';
import { useAuthStore } from '../../src/store/auth.store';
import { useWorkspaceStore } from '../../src/store/workspace.store';
import { useWorkspace } from '../../src/providers/WorkspaceProvider';
import { orgApi, OrganizationSummaryDto, ApiError } from '../../src/lib/api';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { SkeletonLoader } from '../../src/components/SkeletonLoader';

export default function OrganizationsScreen() {
  const { colors, typography, spacing, radius, elevation } = useTheme();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const selectOrganization = useWorkspaceStore((state) => state.selectOrganization);
  const { invalidateWorkspaceCache } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [organizations, setOrganizations] = useState<OrganizationSummaryDto[]>([]);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const data = await orgApi.list();
      setOrganizations(data);

      // Only one organization to choose from — skip straight to gym selection
      if (data.length === 1) {
        handleSelect(data[0]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your organizations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = (org: OrganizationSummaryDto) => {
    invalidateWorkspaceCache();
    selectOrganization({ id: org.id, name: org.name }, org.myRole);
    if (org.gyms.length === 1) {
      // Only one gym — nothing left to choose, jump straight into the workspace
      useWorkspaceStore.getState().selectGym({ id: org.gyms[0].id, name: org.gyms[0].name });
    } else {
      router.push({ pathname: '/(lobby)/gyms', params: { orgId: org.id, orgName: org.name } });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <SkeletonLoader width={48} height={48} borderRadius={radius.md} />
              <View style={{ flex: 1, gap: 8 }}>
                <SkeletonLoader width="70%" height={16} />
                <SkeletonLoader width="45%" height={12} />
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState message={error} onRetry={() => load()} />
      </SafeAreaView>
    );
  }

  if (organizations.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon={<ShieldAlert size={40} color={colors.textMuted} />}
          title="No Gym Access Yet"
          description="Your account isn't linked to any gym or organization. Ask your gym owner to add you as staff, then sign in again."
          actionLabel="Sign Out"
          onActionPress={logout}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.body.fontSize }}>
          Choose which organization you're working in today.
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        {organizations.map((org, index) => (
          <Animated.View key={org.id} entering={FadeInDown.duration(400).delay(index * 80)}>
            <OrganizationCard org={org} onPress={() => handleSelect(org)} />
          </Animated.View>
        ))}
      </ScrollView>

      <View style={{ padding: spacing.lg }}>
        <Pressable
          onPress={logout}
          style={[
            styles.signOutRow,
            { borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
          ]}
        >
          <LogOut size={16} color={colors.error} />
          <Text style={{ color: colors.error, marginLeft: 8, fontWeight: '600', fontSize: typography.sizes.bodyMedium.fontSize }}>
            Sign Out
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function OrganizationCard({ org, onPress }: { org: OrganizationSummaryDto; onPress: () => void }) {
  const { colors, typography, spacing, radius, elevation } = useTheme();
  const initials = org.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

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
          padding: spacing.lg,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.cardRow}>
        <View style={[styles.logo, { backgroundColor: colors.primaryLight, borderRadius: radius.md }]}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: typography.sizes.subtitle.fontSize }}>
            {initials}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text
            numberOfLines={1}
            style={{ color: colors.text, fontSize: typography.sizes.subtitle.fontSize, fontWeight: '700' }}
          >
            {org.name}
          </Text>
          <View style={[styles.metaRow, { marginTop: 4 }]}>
            <View style={[styles.roleBadge, { backgroundColor: colors.primaryLight, borderRadius: radius.xs }]}>
              <Text style={{ color: colors.primary, fontSize: typography.sizes.overline.fontSize, fontWeight: '700' }}>
                {org.myRole ? org.myRole.replace(/_/g, ' ').toUpperCase() : 'MEMBER'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Dumbbell size={12} color={colors.textMuted} />
              <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.caption.fontSize, marginLeft: 4 }}>
                {org.gyms.length} {org.gyms.length === 1 ? 'gym' : 'gyms'}
              </Text>
            </View>
          </View>
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
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 14,
  },
});
