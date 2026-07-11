import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, RefreshControl, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LifeBuoy, ChevronRight, Plus } from 'lucide-react-native';

import { useTheme } from '@/theme/theme';
import { useSupportTickets } from '@/hooks/useSupport';
import { statusLabel, statusType } from '@/lib/support';
import { SupportTicketSummary } from '@/lib/api';

import { StatusBadge } from '@/components/StatusBadge';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { FloatingActionButton } from '@/components/FloatingActionButton';

type Tab = 'open' | 'closed';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN');
}

export default function SupportListScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const backAction = () => {
      router.replace('/(app)/(more)');
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [router]);

  const [tab, setTab] = useState<Tab>('open');

  const { data: tickets, isLoading, isError, error, refetch, isFetching } = useSupportTickets(tab);

  const renderItem = ({ item, index }: { item: SupportTicketSummary; index: number }) => (
    <Animated.View entering={FadeInUp.delay(Math.min(index, 8) * 40).duration(300)}>
      <Pressable
        onPress={() => router.push(`/(app)/(support)/${item.id}`)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
            opacity: pressed ? 0.95 : 1,
          },
        ]}
      >
        <View style={styles.cardTop}>
          <Text style={{ flex: 1, fontSize: typography.sizes.bodyMedium.fontSize, fontWeight: '700', color: colors.text }} numberOfLines={1}>
            {item.subject}
          </Text>
          <StatusBadge label={statusLabel(item.status)} type={statusType(item.status)} />
        </View>
        {!!item.lastMessage && (
          <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textSecondary, marginTop: 4 }} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        )}
        <View style={styles.cardBottom}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>
            #{item.ticketNumber}{item.category ? ` · ${item.category}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>{timeAgo(item.updatedAt)}</Text>
            <ChevronRight size={14} color={colors.textMuted} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Text style={{ fontSize: typography.sizes.display.fontSize, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
          Support Centre
        </Text>
        <Text style={{ fontSize: typography.sizes.body.fontSize, color: colors.textSecondary, marginTop: 2 }}>
          Get help from the GymFlow team.
        </Text>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.surfaceElevated, borderRadius: radius.md, marginTop: spacing.lg }]}>
          {(['open', 'closed'] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[
                styles.tab,
                { borderRadius: radius.sm },
                tab === t && { backgroundColor: colors.surface },
              ]}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: tab === t ? colors.text : colors.textSecondary }}>
                {t === 'open' ? 'Open' : 'Resolved'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <LoadingState message="Loading tickets..." />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Could not load tickets.'} onRetry={refetch} />
      ) : (
        <FlashList
          data={tickets || []}
          renderItem={renderItem}
          estimatedItemSize={96}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon={<LifeBuoy size={44} color={colors.textMuted} />}
              title={tab === 'open' ? 'No open tickets' : 'No resolved tickets'}
              description={
                tab === 'open'
                  ? 'Need a hand? Raise a ticket and our team will get back to you.'
                  : 'Resolved and closed tickets will appear here.'
              }
              actionLabel={tab === 'open' ? 'New Ticket' : undefined}
              onActionPress={() => router.push('/(app)/(support)/new')}
              style={{ marginTop: spacing.xxl }}
            />
          }
        />
      )}

      <FloatingActionButton
        icon={<Plus size={24} color={colors.textOnPrimary} />}
        onPress={() => router.push('/(app)/(support)/new')}
        accessibilityLabel="New support ticket"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  card: {
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
});
