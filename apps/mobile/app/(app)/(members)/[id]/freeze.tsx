import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TextInput, Alert, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Snowflake, Play, Check } from 'lucide-react-native';

import { useTheme } from '../../../../src/theme/theme';
import { useMember } from '../../../../src/hooks/useMembers';
import { useFreezeMembership, useReactivateMembership, useFreezes } from '../../../../src/hooks/useMemberships';
import { memberName, formatDate } from '../../../../src/lib/member';

import { Card } from '../../../../src/components/Card';
import { PrimaryButton } from '../../../../src/components/PrimaryButton';
import { SecondaryButton } from '../../../../src/components/SecondaryButton';
import { SectionHeader } from '../../../../src/components/SectionHeader';
import { SkeletonLoader } from '../../../../src/components/SkeletonLoader';
import { EmptyState } from '../../../../src/components/EmptyState';

const DURATION_PRESETS = [7, 15, 30, 60, 90];
const REASON_CATEGORIES = ['Medical', 'Travel', 'Personal', 'Other'];

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function FreezeMembershipScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing, radius } = useTheme();
  const router = useRouter();

  const { data: member, isLoading: isLoadingMember } = useMember(id as string);
  const active = member?.activeMembership;
  const isFrozen = (active?.status || '').toLowerCase() === 'frozen';

  const freezeMutation = useFreezeMembership();
  const reactivateMutation = useReactivateMembership();

  // Freeze form state
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState(30);
  const [reasonCategory, setReasonCategory] = useState('Medical');
  const [notes, setNotes] = useState('');

  const endDate = useMemo(() => addDays(startDate, duration), [startDate, duration]);

  // For reactivation, find this subscription's approved freeze record.
  const { data: freezes, isLoading: isLoadingFreezes } = useFreezes();
  const approvedFreeze = useMemo(
    () =>
      (freezes || []).find(
        (f: any) => f.memberMembershipId === active?.id && f.status === 'Approved'
      ),
    [freezes, active?.id]
  );

  const handleFreeze = async () => {
    if (!active) return;
    if (!startDate || isNaN(new Date(startDate).getTime())) {
      return Alert.alert('Invalid date', 'Please enter a valid start date (YYYY-MM-DD).');
    }
    try {
      const res: any = await freezeMutation.mutateAsync({
        memberMembershipId: active.id,
        startDate,
        endDate,
        durationDays: duration,
        reasonCategory,
        reasonNotes: notes,
      });
      const approved = (res?.status || '').toLowerCase() === 'approved';
      Alert.alert(
        approved ? 'Membership Frozen' : 'Freeze Requested',
        approved
          ? `Frozen for ${duration} days. Expiry extended to ${formatDate(addDays(active.endDate, duration))}.`
          : 'Your freeze request was submitted for approval.',
        [{ text: 'Done', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to freeze membership.');
    }
  };

  const handleReactivate = async () => {
    if (!approvedFreeze) return;
    try {
      await reactivateMutation.mutateAsync(approvedFreeze.id);
      Alert.alert('Reactivated', `${memberName(member!)}'s membership is active again.`, [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to reactivate membership.');
    }
  };

  if (isLoadingMember || !member) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.lg }]}>
        <Stack.Screen options={{ title: 'Freeze' }} />
        <SkeletonLoader width="100%" height={100} borderRadius={radius.md} style={{ marginBottom: spacing.md }} />
        <SkeletonLoader width="100%" height={200} borderRadius={radius.md} />
      </View>
    );
  }

  // No membership to act on.
  if (!active) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <Stack.Screen options={{ title: 'Freeze' }} />
        <EmptyState
          icon={<Snowflake size={44} color={colors.textMuted} />}
          title="No active membership"
          description="This member needs an active membership before it can be frozen."
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: isFrozen ? 'Reactivate Membership' : 'Freeze Membership' }} />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        {/* Member + plan context */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: typography.sizes.title.fontSize, color: colors.text, fontWeight: '700' }}>
            {memberName(member)}
          </Text>
          <Text style={{ fontSize: typography.sizes.body.fontSize, color: colors.textSecondary, marginTop: 4 }}>
            {active.membershipPlan?.name || 'Plan'} · expires {formatDate(active.endDate)}
          </Text>
        </Card>

        {isFrozen ? (
          /* ---------------- Reactivate mode ---------------- */
          isLoadingFreezes ? (
            <SkeletonLoader width="100%" height={120} borderRadius={radius.md} />
          ) : approvedFreeze ? (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                <View style={[styles.iconBox, { backgroundColor: colors.info + '15', borderRadius: radius.md }]}>
                  <Snowflake size={22} color={colors.info} />
                </View>
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <Text style={{ fontSize: typography.sizes.bodyMedium.fontSize, fontWeight: '700', color: colors.text }}>
                    Currently frozen
                  </Text>
                  <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textSecondary, marginTop: 2 }}>
                    Freeze ends {formatDate(approvedFreeze.endDate)}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textMuted, lineHeight: 18 }}>
                Reactivating now ends the freeze early. Any unused frozen days are removed from the extended expiry date.
              </Text>
            </Card>
          ) : (
            <EmptyState
              icon={<Snowflake size={44} color={colors.textMuted} />}
              title="No active freeze found"
              description="This membership is marked frozen but has no approved freeze record to reactivate."
            />
          )
        ) : (
          /* ---------------- Freeze mode ---------------- */
          <>
            <SectionHeader title="Duration" />
            <View style={styles.chipRow}>
              {DURATION_PRESETS.map((d) => {
                const selected = duration === d;
                return (
                  <Pressable
                    key={d}
                    onPress={() => setDuration(d)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? colors.primary : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                        borderRadius: radius.full,
                      },
                    ]}
                  >
                    <Text style={{ color: selected ? '#FFF' : colors.text, fontWeight: '600', fontSize: 13 }}>{d}d</Text>
                  </Pressable>
                );
              })}
            </View>

            <SectionHeader title="Start Date" style={{ marginTop: spacing.md }} />
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, borderRadius: radius.md, padding: spacing.md }]}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
            <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textMuted, marginTop: 6 }}>
              Frozen {formatDate(startDate)} → {formatDate(endDate)}. Expiry extends by {duration} days.
            </Text>

            <SectionHeader title="Reason" style={{ marginTop: spacing.md }} />
            <View style={styles.chipRow}>
              {REASON_CATEGORIES.map((r) => {
                const selected = reasonCategory === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setReasonCategory(r)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? colors.primary : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                        borderRadius: radius.full,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      },
                    ]}
                  >
                    {selected && <Check size={14} color="#FFF" />}
                    <Text style={{ color: selected ? '#FFF' : colors.text, fontWeight: '600', fontSize: 13 }}>{r}</Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, borderRadius: radius.md, padding: spacing.md, height: 90, marginTop: spacing.md }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes (optional)..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
            />
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, padding: spacing.lg }]}>
        <SecondaryButton label="Cancel" onPress={() => router.back()} style={{ flex: 1, marginRight: spacing.sm }} />
        {isFrozen ? (
          <PrimaryButton
            label="Reactivate Now"
            onPress={handleReactivate}
            loading={reactivateMutation.isPending}
            disabled={!approvedFreeze}
            icon={<Play size={18} color="#FFF" style={{ marginRight: 8 }} />}
            style={{ flex: 2 }}
          />
        ) : (
          <PrimaryButton
            label={`Freeze ${duration} Days`}
            onPress={handleFreeze}
            loading={freezeMutation.isPending}
            icon={<Snowflake size={18} color="#FFF" style={{ marginRight: 8 }} />}
            style={{ flex: 2 }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  iconBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    fontSize: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
  },
});
