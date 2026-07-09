import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Activity, Dumbbell, Apple, Scale, Camera, Calendar, Users, ChevronRight, Play } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useTheme } from '../../theme/theme';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import { useAuthStore } from '../../store/auth.store';
import { useHaptics } from '../../hooks/useHaptics';

import { SectionHeader } from '../SectionHeader';
import { Card } from '../Card';
import { ListItem } from '../ListItem';
import { MetricCard } from '../MetricCard';

// Mock schedule data representing today's PT Sessions
const TODAY_PT_SESSIONS = [
  { id: '1', memberId: 'm-1', name: 'John Doe', time: '09:00 AM', duration: '60 min', type: 'Weight Training', status: 'Scheduled' },
  { id: '2', memberId: 'm-2', name: 'Sarah Connor', time: '11:30 AM', duration: '45 min', type: 'Cardio Coaching', status: 'Scheduled' },
  { id: '3', memberId: 'm-3', name: 'Michael Scott', time: '04:00 PM', duration: '60 min', type: 'General Fitness', status: 'Scheduled' },
];

export function TrainerDashboard() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { lightImpact, mediumImpact } = useHaptics();

  const handleStartSession = (memberId: string) => {
    mediumImpact();
    router.push(`/(app)/(members)/${memberId}/session`);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Quick Metrics Banner */}
      <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
        <View style={styles.gridRow}>
          <MetricCard
            label="My Members"
            value="12"
            icon={<Users size={18} color={colors.primary} />}
            delay={100}
          />
          <MetricCard
            label="Today's Sessions"
            value="3"
            icon={<Calendar size={18} color={colors.primary} />}
            delay={200}
          />
        </View>
        <View style={styles.gridRow}>
          <MetricCard
            label="Pending Workouts"
            value="4"
            icon={<Dumbbell size={18} color={colors.warning} />}
            delay={300}
          />
          <MetricCard
            label="Pending Diets"
            value="2"
            icon={<Apple size={18} color={colors.error} />}
            delay={400}
          />
        </View>
      </View>

      {/* Trainer Quick Actions Grid */}
      <SectionHeader title="Quick Coaching Actions" style={{ marginBottom: spacing.sm }} />
      <View style={styles.quickGrid}>
        <Pressable
          onPress={() => { lightImpact(); router.push('/(app)/(members)'); }}
          style={[styles.quickCard, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border }]}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Users size={20} color={colors.primary} />
          </View>
          <Text style={[styles.quickLabel, { color: colors.text }]}>My Members</Text>
        </Pressable>

        <Pressable
          onPress={() => { lightImpact(); Alert.alert('Start Session', 'Select a member from your list or scheduled sessions below to begin!'); }}
          style={[styles.quickCard, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border }]}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#10B98115' }]}>
            <Play size={20} color="#10B981" />
          </View>
          <Text style={[styles.quickLabel, { color: colors.text }]}>Start Session</Text>
        </Pressable>
      </View>

      {/* Today's PT Schedule */}
      <SectionHeader title="Today's PT Sessions" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }} />
      <Card padded={false}>
        {TODAY_PT_SESSIONS.map((session, index) => (
          <ListItem
            key={session.id}
            title={session.name}
            subtitle={`${session.time} • ${session.duration} • ${session.type}`}
            leftComponent={
              <View style={[styles.timeBox, { backgroundColor: colors.background, borderRadius: radius.sm }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>{session.time.split(' ')[0]}</Text>
                <Text style={{ fontSize: 8, fontWeight: '600', color: colors.textMuted }}>{session.time.split(' ')[1]}</Text>
              </View>
            }
            rightComponent={
              <Pressable
                onPress={() => handleStartSession(session.memberId)}
                style={({ pressed }) => [
                  styles.startBtn,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: radius.md,
                    opacity: pressed ? 0.9 : 1,
                  }
                ]}
              >
                <Play size={12} color="#FFF" fill="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>Start</Text>
              </Pressable>
            }
            showChevron={false}
            style={index === TODAY_PT_SESSIONS.length - 1 ? { borderBottomWidth: 0 } : undefined}
          />
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  quickCard: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeBox: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  }
});
