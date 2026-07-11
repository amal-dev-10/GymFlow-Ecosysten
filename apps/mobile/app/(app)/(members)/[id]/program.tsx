import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Dumbbell, Apple, Plus, Trash2, Edit2, Check } from 'lucide-react-native';

import { useTheme } from '@/theme/theme';
import { useMember, useUpdateMember } from '@/hooks/useMembers';
import { useHaptics } from '@/hooks/useHaptics';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { Card } from '@/components/Card';

export default function ProgramScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();
  const { lightImpact, successNotification } = useHaptics();

  const { data: member, isLoading } = useMember(id as string);
  const updateMutation = useUpdateMember();

  const [activeTab, setActiveTab] = useState<'workout' | 'diet'>('workout');

  // Workouts
  const [exercises, setExercises] = useState<any[]>([]);
  const [newExName, setNewExName] = useState('');
  const [newExSets, setNewExSets] = useState('');
  const [newExReps, setNewExReps] = useState('');
  const [newExWeight, setNewExWeight] = useState('');

  // Diet
  const [meals, setMeals] = useState<any[]>([]);
  const [newMealTime, setNewMealTime] = useState('');
  const [newMealDesc, setNewMealDesc] = useState('');

  React.useEffect(() => {
    if (member?.aiInsights) {
      if (Array.isArray(member.aiInsights.workoutPlan)) {
        setExercises(member.aiInsights.workoutPlan);
      } else {
        setExercises([
          { id: '1', name: 'Deadlift', sets: '3', reps: '8', weight: '100 kg' },
          { id: '2', name: 'Lat Pulldown', sets: '4', reps: '10', weight: '60 kg' },
        ]);
      }

      if (Array.isArray(member.aiInsights.dietPlan)) {
        setMeals(member.aiInsights.dietPlan);
      } else {
        setMeals([
          { id: '1', time: '08:00 AM', description: 'Oatmeal, 4 egg whites, banana' },
          { id: '2', time: '01:00 PM', description: 'Grilled chicken, brown rice, broccoli' },
          { id: '3', time: '08:00 PM', description: 'Salmon, sweet potato, green salad' },
        ]);
      }
    } else if (member) {
      // Fallback if aiInsights is empty
      setExercises([
        { id: '1', name: 'Deadlift', sets: '3', reps: '8', weight: '100 kg' },
        { id: '2', name: 'Lat Pulldown', sets: '4', reps: '10', weight: '60 kg' },
      ]);
      setMeals([
        { id: '1', time: '08:00 AM', description: 'Oatmeal, 4 egg whites, banana' },
        { id: '2', time: '01:00 PM', description: 'Grilled chicken, brown rice, broccoli' },
        { id: '3', time: '08:00 PM', description: 'Salmon, sweet potato, green salad' },
      ]);
    }
  }, [member]);

  const handleAddExercise = () => {
    if (!newExName || !newExSets || !newExReps) {
      Alert.alert('Error', 'Please fill in name, sets, and reps');
      return;
    }
    lightImpact();
    setExercises([...exercises, {
      id: Date.now().toString(),
      name: newExName,
      sets: newExSets,
      reps: newExReps,
      weight: newExWeight || 'Bodyweight'
    }]);
    setNewExName('');
    setNewExSets('');
    setNewExReps('');
    setNewExWeight('');
  };

  const handleRemoveExercise = (exId: string) => {
    lightImpact();
    setExercises(exercises.filter(ex => ex.id !== exId));
  };

  const handleAddMeal = () => {
    if (!newMealTime || !newMealDesc) {
      Alert.alert('Error', 'Please fill in meal time and details');
      return;
    }
    lightImpact();
    setMeals([...meals, {
      id: Date.now().toString(),
      time: newMealTime,
      description: newMealDesc
    }]);
    setNewMealTime('');
    setNewMealDesc('');
  };

  const handleRemoveMeal = (mealId: string) => {
    lightImpact();
    setMeals(meals.filter(m => m.id !== mealId));
  };

  const handleSaveProgram = () => {
    successNotification();
    const workoutSummary = exercises.map(ex => `${ex.name} (${ex.sets}x${ex.reps})`).join(', ');
    const dietSummary = meals.map(m => `${m.time}: ${m.description}`).join(' | ');

    const updatedAiInsights = {
      ...(member?.aiInsights || {}),
      workoutPlan: exercises,
      dietPlan: meals,
    };

    const payload = {
      id: id as string,
      data: {
        notes: `Program Updated: Workouts: [${workoutSummary}] | Diets: [${dietSummary}]`,
        aiInsights: updatedAiInsights,
        timelineUpdate: {
          type: 'program-update',
          title: 'Program Updated',
          description: activeTab === 'workout' ? `Workout: ${workoutSummary}` : `Diet: ${dietSummary}`
        }
      }
    };

    updateMutation.mutate(payload, {
      onSuccess: () => {
        Alert.alert('Success', 'Program changes saved successfully!');
        router.back();
      }
    });
  };

  if (isLoading || !member) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Manage Program</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{member.firstName} {member.lastName}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => setActiveTab('workout')}
          style={[styles.tab, activeTab === 'workout' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'workout' ? colors.primary : colors.textSecondary }}>Workout Plan</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('diet')}
          style={[styles.tab, activeTab === 'diet' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'diet' ? colors.primary : colors.textSecondary }}>Diet Plan</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        {activeTab === 'workout' ? (
          /* WORKOUT ASSIGNMENT VIEW */
          <View>
            <SectionHeader title="Active Exercises" />
            {exercises.map((ex) => (
              <Card key={ex.id} style={styles.itemCard}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{ex.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    {ex.sets} Sets x {ex.reps} Reps • {ex.weight}
                  </Text>
                </View>
                <Pressable onPress={() => handleRemoveExercise(ex.id)} style={{ padding: 8 }}>
                  <Trash2 size={16} color={colors.error} />
                </Pressable>
              </Card>
            ))}

            {/* Add Exercise Form */}
            <SectionHeader title="Add Custom Exercise" style={{ marginTop: spacing.xl }} />
            <Card style={{ gap: spacing.sm, padding: spacing.md }}>
              <TextInput
                value={newExName}
                onChangeText={setNewExName}
                placeholder="Exercise Name (e.g. Leg Press)"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <TextInput
                  value={newExSets}
                  onChangeText={setNewExSets}
                  placeholder="Sets"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border }]}
                />
                <TextInput
                  value={newExReps}
                  onChangeText={setNewExReps}
                  placeholder="Reps"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border }]}
                />
              </View>
              <TextInput
                value={newExWeight}
                onChangeText={setNewExWeight}
                placeholder="Weight Target (optional, e.g. 80 kg)"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
              <Pressable
                onPress={handleAddExercise}
                style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: radius.md }]}
              >
                <Plus size={16} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>Add Exercise</Text>
              </Pressable>
            </Card>
          </View>
        ) : (
          /* DIET ASSIGNMENT VIEW */
          <View>
            <SectionHeader title="Meal Plan" />
            {meals.map((meal) => (
              <Card key={meal.id} style={styles.itemCard}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{meal.time}</Text>
                  <Text style={{ fontSize: 13, color: colors.text, marginTop: 4 }}>{meal.description}</Text>
                </View>
                <Pressable onPress={() => handleRemoveMeal(meal.id)} style={{ padding: 8 }}>
                  <Trash2 size={16} color={colors.error} />
                </Pressable>
              </Card>
            ))}

            {/* Add Meal Form */}
            <SectionHeader title="Add Meal" style={{ marginTop: spacing.xl }} />
            <Card style={{ gap: spacing.sm, padding: spacing.md }}>
              <TextInput
                value={newMealTime}
                onChangeText={setNewMealTime}
                placeholder="Meal Time (e.g. 08:30 AM)"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
              <TextInput
                multiline
                value={newMealDesc}
                onChangeText={setNewMealDesc}
                placeholder="Meal Details (e.g. protein shake, oats)"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { minHeight: 60, textAlignVertical: 'top', color: colors.text, borderColor: colors.border }]}
              />
              <Pressable
                onPress={handleAddMeal}
                style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: radius.md }]}
              >
                <Plus size={16} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>Add Meal</Text>
              </Pressable>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.bottomBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <PrimaryButton
          label="Save Program Changes"
          onPress={handleSaveProgram}
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 13,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 4,
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
