import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, RotateCcw, Check, ArrowLeft, Dumbbell, Apple, Plus, Award } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme/theme';
import { useMember, useUpdateMember } from '@/hooks/useMembers';
import { useHaptics } from '@/hooks/useHaptics';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { enqueue } from '@/lib/offlineQueue';

import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { Card } from '@/components/Card';

export default function LiveSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();
  const { lightImpact, successNotification } = useHaptics();
  const { isOffline } = useNetworkStatus();

  const { data: member, isLoading } = useMember(id as string);
  const updateMutation = useUpdateMember();

  // Active workout exercises state
  const [exercises, setExercises] = useState([
    { id: '1', name: 'Barbell Squat', sets: 4, reps: '10, 8, 8, 6', weight: '80, 90, 100, 110', completed: [false, false, false, false] },
    { id: '2', name: 'Bench Press', sets: 3, reps: '8, 8, 6', weight: '60, 70, 80', completed: [false, false, false] },
    { id: '3', name: 'Deadlift', sets: 3, reps: '8, 6, 4', weight: '100, 120, 140', completed: [false, false, false] },
  ]);

  // Diet Compliance checklist
  const [dietCompliant, setDietCompliant] = useState(true);
  const [sessionNotes, setSessionNotes] = useState('');

  // Stopwatch Timer state
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((sec) => sec + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleSet = (exId: string, setIndex: number) => {
    lightImpact();
    setExercises(prev => prev.map(ex => {
      if (ex.id === exId) {
        const nextCompleted = [...ex.completed];
        nextCompleted[setIndex] = !nextCompleted[setIndex];
        return { ...ex, completed: nextCompleted };
      }
      return ex;
    }));
  };

  const handleFinishSession = () => {
    successNotification();
    const payload = {
      id: id as string,
      data: {
        notes: `PT Session Completed: ${formatTime(seconds)} duration. Notes: ${sessionNotes}`,
        timelineUpdate: {
          type: 'pt-session',
          title: 'PT Session Completed',
          description: `${formatTime(seconds)} mins coaching. Diet compliant: ${dietCompliant ? 'Yes' : 'No'}`
        }
      }
    };

    if (isOffline) {
      enqueue({ type: 'update-member', payload });
      Alert.alert('Offline Mode', 'PT Session completed locally. Data will synchronize once online!');
      router.back();
    } else {
      updateMutation.mutate(payload, {
        onSuccess: () => {
          Alert.alert('Success', 'PT Session completed & saved!');
          router.back();
        }
      });
    }
  };

  if (isLoading || !member) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Session Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Coaching Session</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{member.firstName} {member.lastName}</Text>
        </View>

        {/* Stopwatch Display */}
        <View style={[styles.timerBox, { backgroundColor: colors.surfaceElevated, borderRadius: radius.md }]}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>{formatTime(seconds)}</Text>
          <Pressable onPress={() => setIsActive(!isActive)} style={{ marginLeft: 6 }}>
            {isActive ? <Pause size={14} color={colors.primary} /> : <Play size={14} color={colors.primary} />}
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        {/* Active Workout Log */}
        <SectionHeader title="Exercise Checklist" />
        {exercises.map((ex) => (
          <Card key={ex.id} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Dumbbell size={16} color={colors.primary} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{ex.name}</Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>{ex.sets} Sets</Text>
            </View>

            {/* Set row layout */}
            <View style={{ gap: spacing.xs }}>
              {ex.completed.map((comp, idx) => (
                <View key={idx} style={[styles.setRow, { backgroundColor: colors.background, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6 }]}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>Set {idx + 1}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{ex.reps.split(',')[idx] || ex.reps.split(',')[0]} reps @ {ex.weight.split(',')[idx] || ex.weight.split(',')[0]} kg</Text>
                  <Pressable
                    onPress={() => handleToggleSet(ex.id, idx)}
                    style={[
                      styles.checkBtn,
                      {
                        backgroundColor: comp ? colors.success : 'transparent',
                        borderColor: comp ? colors.success : colors.border,
                        borderWidth: 1,
                        borderRadius: radius.xs
                      }
                    ]}
                  >
                    {comp && <Check size={12} color="#FFF" />}
                  </Pressable>
                </View>
              ))}
            </View>
          </Card>
        ))}

        {/* Diet compliance */}
        <SectionHeader title="Diet Compliance" style={{ marginTop: spacing.lg }} />
        <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Apple size={18} color={colors.warning} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Following Diet?</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pressable
              onPress={() => { lightImpact(); setDietCompliant(true); }}
              style={[styles.compBtn, { backgroundColor: dietCompliant ? colors.successLight : 'transparent', borderColor: dietCompliant ? colors.success : colors.border, borderWidth: 1 }]}
            >
              <Text style={{ color: dietCompliant ? colors.successText : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>Compliant</Text>
            </Pressable>
            <Pressable
              onPress={() => { lightImpact(); setDietCompliant(false); }}
              style={[styles.compBtn, { backgroundColor: !dietCompliant ? colors.errorLight : 'transparent', borderColor: !dietCompliant ? colors.error : colors.border, borderWidth: 1 }]}
            >
              <Text style={{ color: !dietCompliant ? colors.errorText : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>Skipped</Text>
            </Pressable>
          </View>
        </Card>

        {/* Coaching Notes */}
        <SectionHeader title="Coaching Notes" style={{ marginTop: spacing.lg }} />
        <Card style={{ padding: spacing.sm }}>
          <TextInput
            multiline
            value={sessionNotes}
            onChangeText={setSessionNotes}
            placeholder="Log details about form, intensity, or workout adjustments..."
            placeholderTextColor={colors.textMuted}
            style={{ minHeight: 80, fontSize: 13, color: colors.text, textAlignVertical: 'top' }}
          />
        </Card>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={[styles.bottomBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <PrimaryButton
          label="Finish PT Session"
          onPress={handleFinishSession}
          loading={updateMutation.isPending}
        />
      </View>
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
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  checkBtn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  }
});
