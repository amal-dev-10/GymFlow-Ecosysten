import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';

import { useTheme } from '../../../src/theme/theme';
import { useFreezeMembership, useMembershipDetails } from '../../../src/hooks/useMemberships';
import { Card } from '../../../src/components/Card';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { SecondaryButton } from '../../../src/components/SecondaryButton';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { SkeletonLoader } from '../../../src/components/SkeletonLoader';

export default function FreezeMembershipScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing, radius } = useTheme();
  const router = useRouter();

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const { data: membership, isLoading } = useMembershipDetails(id || '');
  const freezeMutation = useFreezeMembership();

  const handleSubmit = async () => {
    if (!startDate || !endDate) return Alert.alert('Validation', 'Please provide start and end dates.');

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return Alert.alert('Validation', 'End date must be after the start date.');
    }
    // durationDays drives how far the membership expiry is extended.
    const durationDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    try {
      await freezeMutation.mutateAsync({
        memberMembershipId: membership.id,
        startDate,
        endDate,
        durationDays,
        reasonCategory: 'Other',
        reasonNotes: reason,
      });
      Alert.alert('Success', 'Membership freeze requested successfully.');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to request freeze');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.lg }]}>
        <SkeletonLoader width="100%" height={100} borderRadius={radius.md} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Freeze Membership' }} />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <SectionHeader title="Member" />
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: typography.sizes.title.fontSize, color: colors.text, fontWeight: '600' }}>
            {membership?.member?.firstName} {membership?.member?.lastName}
          </Text>
          <Text style={{ fontSize: typography.sizes.body.fontSize, color: colors.textSecondary, marginTop: 4 }}>
            Current Plan: {membership?.membershipPlan?.name}
          </Text>
        </Card>

        <SectionHeader title="Freeze Details" />
        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Start Date (YYYY-MM-DD)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }]}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>End Date (YYYY-MM-DD)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }]}
          value={endDate}
          onChangeText={setEndDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Reason</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, borderRadius: radius.md, padding: spacing.md, height: 100 }]}
          value={reason}
          onChangeText={setReason}
          placeholder="Reason for freezing..."
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
        />

        <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textMuted, marginTop: spacing.md }}>
          Freezing a membership will automatically adjust the final expiry date by the duration of the freeze.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, padding: spacing.lg }]}>
        <SecondaryButton label="Cancel" onPress={() => router.back()} style={{ flex: 1, marginRight: spacing.sm }} />
        <PrimaryButton label="Submit Request" onPress={handleSubmit} loading={freezeMutation.isPending} style={{ flex: 2 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
});
