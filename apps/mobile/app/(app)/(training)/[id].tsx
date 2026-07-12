import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Dumbbell, Target, Wrench, Flame, ShieldAlert } from 'lucide-react-native';

import { useTheme } from '@/theme/theme';
import { useExercise } from '@/hooks/useExercises';
import { Card } from '@/components/Card';
import { SectionHeader } from '@/components/SectionHeader';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius, typography } = useTheme();
  const { data: ex, isLoading, isError, error, refetch } = useExercise(id as string);

  if (isLoading) return <LoadingState message="Loading exercise..." />;
  if (isError || !ex) return <ErrorState message={(error as Error)?.message || 'Exercise not found.'} onRetry={refetch} />;

  const chips = [
    { icon: <Target size={13} color={colors.primary} />, label: ex.category },
    { icon: <Dumbbell size={13} color={colors.primary} />, label: ex.difficulty },
    { icon: <Wrench size={13} color={colors.primary} />, label: ex.equipment },
    ...(ex.caloriesBurned ? [{ icon: <Flame size={13} color={colors.primary} />, label: `${ex.caloriesBurned} cal` }] : []),
  ].filter((c) => c.label);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: ex.name }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        {/* Media */}
        <View style={[styles.media, { backgroundColor: colors.surfaceElevated, borderRadius: radius.xl }]}>
          {ex.gifUrl ? (
            <Image source={{ uri: ex.gifUrl }} style={{ width: '100%', height: '100%', borderRadius: radius.xl }} contentFit="contain" transition={200} />
          ) : (
            <Dumbbell size={56} color={colors.textMuted} />
          )}
        </View>

        <Text style={{ fontSize: typography.sizes.headline.fontSize, fontWeight: '800', color: colors.text, marginTop: spacing.lg }}>{ex.name}</Text>
        <View style={styles.chipRow}>
          {chips.map((c, i) => (
            <View key={i} style={[styles.chip, { backgroundColor: colors.primary + '12' }]}>
              {c.icon}
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, marginLeft: 4 }}>{c.label}</Text>
            </View>
          ))}
        </View>

        {!!ex.description && (
          <Text style={{ fontSize: typography.sizes.body.fontSize, color: colors.textSecondary, marginTop: spacing.md, lineHeight: 20 }}>{ex.description}</Text>
        )}

        {/* Muscles */}
        <SectionHeader title="Muscles Worked" style={{ marginTop: spacing.lg }} />
        <Card>
          <Row label="Primary" value={ex.primaryMuscle} colors={colors} />
          {!!ex.secondaryMuscles?.length && <Row label="Secondary" value={ex.secondaryMuscles.join(', ')} colors={colors} last />}
        </Card>

        {/* Instructions */}
        {!!ex.instructions?.length && (
          <>
            <SectionHeader title="How To" style={{ marginTop: spacing.lg }} />
            <Card style={{ gap: spacing.md, padding: spacing.md }}>
              {ex.instructions.map((step, i) => (
                <View key={i} style={{ flexDirection: 'row' }}>
                  <View style={[styles.step, { backgroundColor: colors.primary }]}>
                    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>{i + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, marginLeft: spacing.md, fontSize: 13, color: colors.text, lineHeight: 19 }}>{step}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Safety tips */}
        {!!ex.safetyTips?.length && (
          <>
            <SectionHeader title="Safety Tips" style={{ marginTop: spacing.lg }} />
            <Card style={{ gap: spacing.sm, padding: spacing.md }}>
              {ex.safetyTips.map((tip, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <ShieldAlert size={15} color={colors.warning} style={{ marginTop: 1 }} />
                  <Text style={{ flex: 1, marginLeft: spacing.sm, fontSize: 13, color: colors.text, lineHeight: 19 }}>{tip}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {!!ex.trainerNotes && (
          <>
            <SectionHeader title="Trainer Notes" style={{ marginTop: spacing.lg }} />
            <Card style={{ padding: spacing.md }}>
              <Text style={{ fontSize: 13, color: colors.text, lineHeight: 19 }}>{ex.trainerNotes}</Text>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Row({ label, value, colors, last }: { label: string; value: string; colors: any; last?: boolean }) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth }]}>
      <Text style={{ fontSize: 13, color: colors.textSecondary, width: 90 }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  media: { width: '100%', height: 220, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  step: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
