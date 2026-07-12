import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, TextInput, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ArrowLeft, Dumbbell, Plus, Trash2, Search, X } from 'lucide-react-native';

import { useTheme } from '@/theme/theme';
import { useMember, useUpdateMember } from '@/hooks/useMembers';
import { useHaptics } from '@/hooks/useHaptics';
import { useExercisePickerStore } from '@/store/exercisePicker.store';
import { ExerciseDto } from '@/lib/api';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';

interface PlanExercise {
  id: string;
  exerciseId?: string;
  name: string;
  primaryMuscle?: string;
  gifUrl?: string | null;
  sets: string;
  reps: string;
  weight: string;
}

export default function ProgramScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();
  const { lightImpact, successNotification } = useHaptics();

  const { data: member, isLoading } = useMember(id as string);
  const updateMutation = useUpdateMember();
  const setOnPick = useExercisePickerStore((s) => s.setOnPick);

  const [activeTab, setActiveTab] = useState<'workout' | 'diet'>('workout');

  const [exercises, setExercises] = useState<PlanExercise[]>([]);
  const [meals, setMeals] = useState<any[]>([]);
  const [newMealTime, setNewMealTime] = useState('');
  const [newMealDesc, setNewMealDesc] = useState('');

  // Set/rep/weight sheet for a just-picked exercise.
  const [pending, setPending] = useState<ExerciseDto | null>(null);
  const [pSets, setPSets] = useState('3');
  const [pReps, setPReps] = useState('10');
  const [pWeight, setPWeight] = useState('');

  React.useEffect(() => {
    if (!member) return;
    const ai = member.aiInsights || {};
    if (Array.isArray(ai.workoutPlan)) setExercises(ai.workoutPlan);
    if (Array.isArray(ai.dietPlan)) setMeals(ai.dietPlan);
  }, [member]);

  const openLibrary = () => {
    lightImpact();
    setOnPick((ex: ExerciseDto) => {
      setPending(ex);
      setPSets('3');
      setPReps('10');
      setPWeight('');
    });
    router.push('/(app)/(training)?pick=1');
  };

  const confirmAdd = () => {
    if (!pending) return;
    const ex: PlanExercise = {
      id: `${Date.now()}`,
      exerciseId: pending.id,
      name: pending.name,
      primaryMuscle: pending.primaryMuscle,
      gifUrl: pending.gifUrl,
      sets: pSets || '3',
      reps: pReps || '10',
      weight: pWeight.trim() || 'Bodyweight',
    };
    setExercises((prev) => [...prev, ex]);
    setPending(null);
    successNotification();
  };

  const removeExercise = (exId: string) => {
    lightImpact();
    setExercises((prev) => prev.filter((e) => e.id !== exId));
  };

  const addMeal = () => {
    if (!newMealTime || !newMealDesc) {
      Alert.alert('Error', 'Please fill in meal time and details');
      return;
    }
    lightImpact();
    setMeals((prev) => [...prev, { id: `${Date.now()}`, time: newMealTime, description: newMealDesc }]);
    setNewMealTime('');
    setNewMealDesc('');
  };

  const removeMeal = (mealId: string) => {
    lightImpact();
    setMeals((prev) => prev.filter((m) => m.id !== mealId));
  };

  const handleSave = () => {
    const workoutSummary = exercises.map((ex) => `${ex.name} (${ex.sets}x${ex.reps})`).join(', ');
    const dietSummary = meals.map((m) => `${m.time}: ${m.description}`).join(' | ');
    updateMutation.mutate(
      {
        id: id as string,
        data: {
          aiInsights: { ...(member?.aiInsights || {}), workoutPlan: exercises, dietPlan: meals },
          timelineUpdate: {
            type: 'program-update',
            title: 'Program Updated',
            description: activeTab === 'workout' ? `Workout: ${workoutSummary}` : `Diet: ${dietSummary}`,
          },
        },
      },
      {
        onSuccess: () => {
          successNotification();
          Alert.alert('Saved', 'Program updated successfully.');
          router.back();
        },
        onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save program.'),
      }
    );
  };

  if (isLoading || !member) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Training Program</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{member.firstName} {member.lastName}</Text>
        </View>
      </View>

      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {(['workout', 'diet'] as const).map((t) => (
          <Pressable key={t} onPress={() => setActiveTab(t)} style={[styles.tab, activeTab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === t ? colors.primary : colors.textSecondary }}>
              {t === 'workout' ? 'Workout' : 'Diet'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        {activeTab === 'workout' ? (
          <View>
            <SectionHeader title={`Exercises (${exercises.length})`} />
            {exercises.length === 0 ? (
              <EmptyState icon={<Dumbbell size={40} color={colors.textMuted} />} title="No exercises yet" description="Add exercises from the library to build this program." style={{ marginVertical: spacing.lg }} />
            ) : (
              exercises.map((ex) => (
                <Card key={ex.id} style={styles.exCard}>
                  <View style={[styles.thumb, { backgroundColor: colors.surfaceElevated, borderRadius: radius.md }]}>
                    {ex.gifUrl ? (
                      <Image source={{ uri: ex.gifUrl }} style={{ width: '100%', height: '100%', borderRadius: radius.md }} contentFit="cover" transition={150} />
                    ) : (
                      <Dumbbell size={18} color={colors.textMuted} />
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>{ex.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {ex.sets} × {ex.reps} · {ex.weight}{ex.primaryMuscle ? ` · ${ex.primaryMuscle}` : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => removeExercise(ex.id)} style={{ padding: 8 }}>
                    <Trash2 size={16} color={colors.error} />
                  </Pressable>
                </Card>
              ))
            )}

            <Pressable onPress={openLibrary} style={[styles.libraryBtn, { borderColor: colors.primary, backgroundColor: colors.primary + '10', borderRadius: radius.md }]}>
              <Search size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700', marginLeft: 8 }}>Add from Exercise Library</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <SectionHeader title={`Meal Plan (${meals.length})`} />
            {meals.map((meal) => (
              <Card key={meal.id} style={styles.exCard}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{meal.time}</Text>
                  <Text style={{ fontSize: 13, color: colors.text, marginTop: 4 }}>{meal.description}</Text>
                </View>
                <Pressable onPress={() => removeMeal(meal.id)} style={{ padding: 8 }}>
                  <Trash2 size={16} color={colors.error} />
                </Pressable>
              </Card>
            ))}

            <SectionHeader title="Add Meal" style={{ marginTop: spacing.xl }} />
            <Card style={{ gap: spacing.sm, padding: spacing.md }}>
              <TextInput value={newMealTime} onChangeText={setNewMealTime} placeholder="Meal time (e.g. 08:30 AM)" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border }]} />
              <TextInput multiline value={newMealDesc} onChangeText={setNewMealDesc} placeholder="Details (e.g. oats, protein shake)" placeholderTextColor={colors.textMuted} style={[styles.input, { minHeight: 60, textAlignVertical: 'top', color: colors.text, borderColor: colors.border }]} />
              <Pressable onPress={addMeal} style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: radius.md }]}>
                <Plus size={16} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>Add Meal</Text>
              </Pressable>
            </Card>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <PrimaryButton label="Save Program" onPress={handleSave} loading={updateMutation.isPending} />
      </View>

      {/* Sets/reps/weight sheet for the picked exercise */}
      <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => setPending(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.thumb, { backgroundColor: colors.surfaceElevated, borderRadius: radius.md }]}>
                {pending?.gifUrl ? (
                  <Image source={{ uri: pending.gifUrl }} style={{ width: '100%', height: '100%', borderRadius: radius.md }} contentFit="cover" />
                ) : (
                  <Dumbbell size={18} color={colors.textMuted} />
                )}
              </View>
              <Text style={{ flex: 1, marginLeft: spacing.md, fontSize: 15, fontWeight: '800', color: colors.text }} numberOfLines={2}>{pending?.name}</Text>
              <Pressable onPress={() => setPending(null)} style={{ padding: 4 }}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
              <Field label="Sets" value={pSets} onChangeText={setPSets} colors={colors} radius={radius} />
              <Field label="Reps" value={pReps} onChangeText={setPReps} colors={colors} radius={radius} />
            </View>
            <View style={{ marginTop: spacing.md }}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Weight / Target (optional)</Text>
              <TextInput value={pWeight} onChangeText={setPWeight} placeholder="e.g. 60 kg" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border }]} />
            </View>

            <View style={{ flexDirection: 'row', marginTop: spacing.lg }}>
              <SecondaryButton label="Cancel" onPress={() => setPending(null)} style={{ flex: 1, marginRight: spacing.sm }} />
              <PrimaryButton label="Add" onPress={confirmAdd} style={{ flex: 2 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, colors, radius }: { label: string; value: string; onChangeText: (v: string) => void; colors: any; radius: any }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} keyboardType="numeric" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, textAlign: 'center', fontSize: 18, fontWeight: '700' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { padding: 4 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  exCard: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 8 },
  thumb: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, fontSize: 14 },
  libraryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderWidth: 1, borderStyle: 'dashed', marginTop: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, marginTop: 4 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  sheet: { padding: 20 },
});
