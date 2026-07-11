import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, Calendar, CheckSquare, Clock, Filter, Search, ShieldCheck } from 'lucide-react-native';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';

import { useTheme } from '../../../src/theme/theme';
import { useNotificationsStore, NotificationItem, TaskItem } from '../../../src/store/notifications.store';
import { useWorkspace } from '../../../src/providers/WorkspaceProvider';
import { useHaptics } from '../../../src/hooks/useHaptics';
import { useLiveActivity } from '../../../src/hooks/useLiveActivity';

import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { SectionHeader } from '../../../src/components/SectionHeader';

export default function NotificationsInboxScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { lightImpact, successNotification } = useHaptics();
  const { can } = useWorkspace();

  // Derive the real feed (expiring memberships + outstanding dues) into the store.
  const { isFetching, refetch } = useLiveActivity();

  const { notifications, tasks, markAllRead, completeTask, deleteNotification } = useNotificationsStore();

  const [activeTab, setActiveTab] = useState<'alerts' | 'tasks'>('alerts');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering based on permissions
  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    // RBAC: Gate categories
    if (n.category === 'payments' && !can('record-payment')) return false;
    if (n.category === 'membership' && !can('manage-members')) return false;
    if (n.category === 'attendance' && !can('mark-attendance')) return false;
    return true;
  });

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (t.completed) return false;
    
    // RBAC: Gate tasks
    if (t.category === 'collect' && !can('record-payment')) return false;
    if (t.category === 'renew' && !can('manage-members')) return false;
    if (t.category === 'attendance' && !can('mark-attendance')) return false;
    return true;
  });

  const handleMarkAllRead = () => {
    successNotification();
    markAllRead();
  };

  const handleCompleteTask = (id: string) => {
    successNotification();
    completeTask(id);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.replace('/(app)/(dashboard)')} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, flex: 1 }}>Inbox & Tasks</Text>
        {activeTab === 'alerts' && filteredNotifications.some(n => !n.read) && (
          <Pressable onPress={handleMarkAllRead} style={{ padding: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {/* Search Input */}
      <View style={{ paddingHorizontal: spacing.lg, marginVertical: spacing.md }}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={activeTab === 'alerts' ? "Search alerts..." : "Search pending tasks..."}
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, height: 40, marginLeft: 8, fontSize: 13, color: colors.text }}
          />
        </View>
      </View>

      {/* Tab Selectors */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => { lightImpact(); setActiveTab('alerts'); }}
          style={[styles.tab, activeTab === 'alerts' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'alerts' ? colors.primary : colors.textSecondary }}>
            Alerts ({filteredNotifications.filter(n => !n.read).length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => { lightImpact(); setActiveTab('tasks'); }}
          style={[styles.tab, activeTab === 'tasks' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'tasks' ? colors.primary : colors.textSecondary }}>
            Tasks ({filteredTasks.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {activeTab === 'alerts' ? (
          /* NOTIFICATIONS / ALERTS LIST */
          filteredNotifications.length === 0 ? (
            <EmptyState
              title="Inbox Clean!"
              description="No new updates or alerts for your role right now."
              icon={<Bell size={36} color={colors.textMuted} />}
              style={{ marginTop: spacing.xxl }}
            />
          ) : (
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              {filteredNotifications.map((item, idx) => (
                <Animated.View key={item.id} entering={FadeInDown.delay(idx * 50).duration(300)}>
                  <Pressable
                    onPress={() => { lightImpact(); router.push(`/(app)/(notifications)/${item.id}`); }}
                    style={({ pressed }) => [
                      styles.alertCard,
                      {
                        backgroundColor: item.read ? colors.surface : colors.surfaceElevated,
                        borderColor: item.priority === 'critical' ? colors.error : colors.border,
                        borderWidth: 1,
                        borderRadius: radius.lg,
                        opacity: pressed ? 0.95 : 1
                      }
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={[styles.dot, { backgroundColor: item.read ? 'transparent' : colors.primary }]} />
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, flex: 1 }}>{item.title}</Text>
                      {item.priority === 'critical' && (
                        <View style={[styles.priorityPill, { backgroundColor: colors.errorLight }]}>
                          <Text style={{ fontSize: 9, fontWeight: '800', color: colors.errorText }}>CRITICAL</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>{item.description}</Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 8 }}>
                      {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          )
        ) : (
          /* OPERATIONAL TASKS LIST */
          filteredTasks.length === 0 ? (
            <EmptyState
              title="All Done!"
              description="No tasks pending review. Great job!"
              icon={<ShieldCheck size={36} color={colors.textMuted} />}
              style={{ marginTop: spacing.xxl }}
            />
          ) : (
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              {filteredTasks.map((task, idx) => (
                <Animated.View key={task.id} entering={SlideInRight.delay(idx * 50).duration(300)}>
                  <Card style={{ borderColor: colors.border, borderWidth: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, marginRight: spacing.md }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{task.title}</Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>{task.description}</Text>
                      </View>
                      <Pressable 
                        onPress={() => handleCompleteTask(task.id)}
                        style={[styles.taskCheck, { borderColor: colors.primary, borderRadius: radius.full }]}
                      >
                        <CheckSquare size={16} color={colors.primary} />
                      </Pressable>
                    </View>
                  </Card>
                </Animated.View>
              ))}
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  alertCard: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taskCheck: {
    padding: 4,
  }
});
