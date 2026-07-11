import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ArrowLeft, Megaphone } from 'lucide-react-native';

import { useTheme } from '../../../src/theme/theme';
import { useAnnouncements, useMarkAnnouncementRead, useMarkAllAnnouncementsRead } from '../../../src/hooks/useAnnouncements';
import { AnnouncementDto } from '../../../src/lib/api';
import type { StatusType } from '../../../src/components/StatusBadge';

import { StatusBadge } from '../../../src/components/StatusBadge';
import { LoadingState } from '../../../src/components/LoadingState';
import { ErrorState } from '../../../src/components/ErrorState';
import { EmptyState } from '../../../src/components/EmptyState';

function priorityMeta(priority: string): { label: string; type: StatusType } | null {
  const p = (priority || '').toLowerCase();
  if (p === 'critical') return { label: 'Critical', type: 'error' };
  if (p === 'high') return { label: 'High', type: 'warning' };
  if (p === 'low') return { label: 'Low', type: 'default' };
  return null; // Normal — no badge
}

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

export default function AnnouncementsScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isFetching } = useAnnouncements();
  const markRead = useMarkAnnouncementRead();
  const markAllRead = useMarkAllAnnouncementsRead();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const unread = (data || []).filter((a) => !a.read).length;

  const onPress = (a: AnnouncementDto) => {
    setExpanded((e) => ({ ...e, [a.id]: !e[a.id] }));
    if (!a.read) markRead.mutate(a.id);
  };

  const renderItem = ({ item, index }: { item: AnnouncementDto; index: number }) => {
    const pri = priorityMeta(item.priority);
    const isOpen = !!expanded[item.id];
    return (
      <Animated.View entering={FadeInUp.delay(Math.min(index, 8) * 40).duration(300)}>
        <Pressable
          onPress={() => onPress(item)}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: item.read ? colors.surface : colors.surfaceElevated,
              borderColor: pri?.type === 'error' ? colors.error : colors.border,
              borderRadius: radius.lg,
              opacity: pressed ? 0.96 : 1,
            },
          ]}
        >
          <View style={styles.top}>
            {!item.read && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
            <Text style={{ flex: 1, fontSize: typography.sizes.bodyMedium.fontSize, fontWeight: '800', color: colors.text }} numberOfLines={isOpen ? undefined : 1}>
              {item.title}
            </Text>
            {pri && <StatusBadge label={pri.label} type={pri.type} />}
          </View>
          <Text style={{ fontSize: typography.sizes.body.fontSize, color: colors.textSecondary, marginTop: 6, lineHeight: 20 }} numberOfLines={isOpen ? undefined : 2}>
            {item.body}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
            {timeAgo(item.sentAt || item.createdAt)}
          </Text>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, flex: 1 }}>Announcements</Text>
        {unread > 0 && (
          <Pressable onPress={() => markAllRead.mutate()} style={{ padding: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <LoadingState message="Loading announcements..." />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Could not load announcements.'} onRetry={refetch} />
      ) : (
        <FlashList
          data={data || []}
          renderItem={renderItem}
          estimatedItemSize={110}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon={<Megaphone size={44} color={colors.textMuted} />}
              title="No announcements"
              description="Updates and announcements from the GymFlow team will appear here."
              style={{ marginTop: spacing.xxl }}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  iconBtn: { padding: 6 },
  card: { borderWidth: 1, padding: 14, marginBottom: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
