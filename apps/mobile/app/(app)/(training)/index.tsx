import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { FlashList } from '@shopify/flash-list';

// FlashList v2 types omit estimatedItemSize; cast like the rest of the app.
const TypedFlashList = FlashList as any;
import { Image } from 'expo-image';
import { Dumbbell, ChevronRight, Check } from 'lucide-react-native';

import { useTheme } from '@/theme/theme';
import { useExercises } from '@/hooks/useExercises';
import { useExercisePickerStore } from '@/store/exercisePicker.store';
import { ExerciseDto } from '@/lib/api';

import { SearchBar } from '@/components/SearchBar';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';

const CATEGORIES = ['all', 'Strength', 'Cardio', 'HIIT', 'Mobility', 'Flexibility', 'Bodybuilding'];

function difficultyColor(d: string, colors: any) {
  const s = (d || '').toLowerCase();
  if (s === 'beginner') return colors.success;
  if (s === 'advanced') return colors.error;
  return colors.warning;
}

export default function ExerciseLibraryScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { pick } = useLocalSearchParams<{ pick?: string }>();
  const picking = pick === '1';
  const onPick = useExercisePickerStore((s) => s.onPick);
  const setOnPick = useExercisePickerStore((s) => s.setOnPick);

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('all');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSearch = (t: string) => {
    setSearch(t);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebounced(t), 400);
  };

  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useExercises(debounced, category);
  const exercises = useMemo(() => data?.pages.flatMap((p) => p.items) || [], [data]);

  const handleSelect = (ex: ExerciseDto) => {
    if (picking) {
      onPick?.(ex);
      setOnPick(null);
      router.back();
    } else {
      router.push(`/(app)/(training)/${ex.id}`);
    }
  };

  const renderItem = ({ item }: { item: ExerciseDto }) => (
    <Pressable
      onPress={() => handleSelect(item)}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, opacity: pressed ? 0.95 : 1 }]}
    >
      <View style={[styles.thumb, { backgroundColor: colors.surfaceElevated, borderRadius: radius.md }]}>
        {item.gifUrl ? (
          <Image source={{ uri: item.gifUrl }} style={{ width: '100%', height: '100%', borderRadius: radius.md }} contentFit="cover" transition={150} />
        ) : (
          <Dumbbell size={22} color={colors.textMuted} />
        )}
      </View>
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={{ fontSize: typography.sizes.bodyMedium.fontSize, fontWeight: '700', color: colors.text }} numberOfLines={1}>{item.name}</Text>
        <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
          {item.primaryMuscle}{item.equipment ? ` · ${item.equipment}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <View style={[styles.pill, { backgroundColor: difficultyColor(item.difficulty, colors) + '18' }]}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: difficultyColor(item.difficulty, colors) }}>{(item.difficulty || '').toUpperCase()}</Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>{item.category}</Text>
        </View>
      </View>
      {picking ? <Check size={18} color={colors.primary} /> : <ChevronRight size={18} color={colors.textMuted} />}
    </Pressable>
  );

  return (
    <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: picking ? 'Pick Exercise' : 'Exercise Library' }} />

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm }}>
        <SearchBar value={search} onChangeText={onSearch} placeholder="Search exercises..." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {CATEGORIES.map((c) => {
            const sel = category === c;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[styles.chip, { backgroundColor: sel ? colors.primary : colors.surface, borderColor: sel ? colors.primary : colors.border, borderRadius: radius.full }]}
              >
                <Text style={{ color: sel ? '#FFF' : colors.text, fontWeight: '600', fontSize: 12 }}>{c === 'all' ? 'All' : c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <LoadingState message="Loading exercises..." />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Could not load exercises.'} onRetry={refetch} />
      ) : (
        <TypedFlashList
          data={exercises}
          renderItem={renderItem}
          estimatedItemSize={84}
          keyExtractor={(item: ExerciseDto) => item.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <EmptyState icon={<Dumbbell size={44} color={colors.textMuted} />} title="No exercises found" description="Try a different search or category." style={{ marginTop: spacing.xxl }} />
          }
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ margin: spacing.md }} color={colors.primary} /> : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: 12, marginBottom: 10 },
  thumb: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
});
