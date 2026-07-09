import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Scale, TrendingDown, TrendingUp, Plus, Calendar } from 'lucide-react-native';

import { useTheme } from '@/theme/theme';
import { useMember, useUpdateMember } from '@/hooks/useMembers';
import { useHaptics } from '@/hooks/useHaptics';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { Card } from '@/components/Card';

export default function MeasurementsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();
  const { lightImpact, successNotification } = useHaptics();

  const { data: member, isLoading } = useMember(id as string);
  const updateMutation = useUpdateMember();

  // Historical measurements data
  const [history, setHistory] = useState([
    { date: '2026-06-01', weight: 82.5, bodyFat: 21.0, muscleMass: 35.2, waist: 92 },
    { date: '2026-06-15', weight: 81.2, bodyFat: 20.2, muscleMass: 35.6, waist: 90 },
    { date: '2026-07-01', weight: 79.8, bodyFat: 19.4, muscleMass: 36.1, waist: 88 },
  ]);

  // Form states
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [waist, setWaist] = useState('');

  const handleSaveMeasurements = () => {
    if (!weight || !bodyFat || !muscleMass) {
      Alert.alert('Error', 'Please fill in weight, body fat %, and muscle mass');
      return;
    }
    successNotification();
    const newLog = {
      date: new Date().toISOString().split('T')[0],
      weight: parseFloat(weight),
      bodyFat: parseFloat(bodyFat),
      muscleMass: parseFloat(muscleMass),
      waist: waist ? parseInt(waist) : 0
    };

    setHistory([newLog, ...history]);

    const payload = {
      id: id as string,
      data: {
        notes: `Recorded Body Measurements: Weight: ${weight}kg, Body Fat: ${bodyFat}%, Muscle: ${muscleMass}kg`,
        timelineUpdate: {
          type: 'measurement',
          title: 'Measurements Logged',
          description: `Weight: ${weight}kg • Body Fat: ${bodyFat}% • Muscle: ${muscleMass}kg`
        }
      }
    };

    updateMutation.mutate(payload, {
      onSuccess: () => {
        Alert.alert('Success', 'Measurements logged successfully!');
        setWeight('');
        setBodyFat('');
        setMuscleMass('');
        setWaist('');
      }
    });
  };

  if (isLoading || !member) {
    return null;
  }

  // Calculate trends
  const latest = history[0];
  const previous = history[1];

  const getTrend = (currentVal: number, prevVal: number, lowerIsBetter = true) => {
    if (!prevVal) return null;
    const diff = currentVal - prevVal;
    const isGood = lowerIsBetter ? diff < 0 : diff > 0;
    return {
      diff: diff.toFixed(1),
      isGood,
      Icon: diff < 0 ? TrendingDown : TrendingUp,
      color: isGood ? colors.success : colors.error
    };
  };

  const weightTrend = getTrend(latest.weight, previous.weight, true);
  const fatTrend = getTrend(latest.bodyFat, previous.bodyFat, true);
  const muscleTrend = getTrend(latest.muscleMass, previous.muscleMass, false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Body Measurements</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{member.firstName} {member.lastName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        {/* Trend Summary Cards */}
        <SectionHeader title="Latest Changes" />
        <View style={styles.trendGrid}>
          {weightTrend && (
            <Card style={styles.trendCard}>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>Weight</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 4 }}>{latest.weight} kg</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                <weightTrend.Icon size={14} color={weightTrend.color} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: weightTrend.color }}>{weightTrend.diff} kg</Text>
              </View>
            </Card>
          )}

          {fatTrend && (
            <Card style={styles.trendCard}>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>Body Fat</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 4 }}>{latest.bodyFat} %</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                <fatTrend.Icon size={14} color={fatTrend.color} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: fatTrend.color }}>{fatTrend.diff} %</Text>
              </View>
            </Card>
          )}

          {muscleTrend && (
            <Card style={styles.trendCard}>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>Muscle Mass</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 4 }}>{latest.muscleMass} kg</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                <muscleTrend.Icon size={14} color={muscleTrend.color} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: muscleTrend.color }}>{muscleTrend.diff} kg</Text>
              </View>
            </Card>
          )}
        </View>

        {/* Log New Measurements Form */}
        <SectionHeader title="Log New Entry" style={{ marginTop: spacing.xl }} />
        <Card style={{ gap: spacing.sm, padding: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="78.5"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Body Fat (%)</Text>
              <TextInput
                value={bodyFat}
                onChangeText={setBodyFat}
                placeholder="18.2"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Muscle Mass (kg)</Text>
              <TextInput
                value={muscleMass}
                onChangeText={setMuscleMass}
                placeholder="36.5"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Waist (cm)</Text>
              <TextInput
                value={waist}
                onChangeText={setWaist}
                placeholder="86"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
            </View>
          </View>
          <Pressable
            onPress={handleSaveMeasurements}
            style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: radius.md }]}
          >
            <Plus size={16} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>Save Entry</Text>
          </Pressable>
        </Card>

        {/* Historical Logs */}
        <SectionHeader title="Historical Log" style={{ marginTop: spacing.xl }} />
        <Card padded={false}>
          {history.map((log, index) => (
            <View key={index} style={[styles.historyRow, { borderBottomColor: colors.border, padding: spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Calendar size={14} color={colors.textSecondary} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>{new Date(log.date).toLocaleDateString('en-IN')}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.historyStat}>Wt: <Text style={{ fontWeight: '700', color: colors.text }}>{log.weight}kg</Text></Text>
                <Text style={styles.historyStat}>Fat: <Text style={{ fontWeight: '700', color: colors.text }}>{log.bodyFat}%</Text></Text>
                <Text style={styles.historyStat}>Muscle: <Text style={{ fontWeight: '700', color: colors.text }}>{log.muscleMass}kg</Text></Text>
                {log.waist > 0 && <Text style={styles.historyStat}>Waist: <Text style={{ fontWeight: '700', color: colors.text }}>{log.waist}cm</Text></Text>}
              </View>
            </View>
          ))}
        </Card>
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
  trendGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  trendCard: {
    flex: 1,
    padding: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
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
    marginTop: 8,
  },
  historyRow: {
    borderBottomWidth: 1,
  },
  historyStat: {
    fontSize: 12,
  }
});
