import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Award } from 'lucide-react-native';

import { useTheme } from '../../../src/theme/theme';
import { useMembershipDetails, useMembershipPlans, useUpdateMembership } from '../../../src/hooks/useMemberships';
import { Card } from '../../../src/components/Card';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { SecondaryButton } from '../../../src/components/SecondaryButton';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { ListItem } from '../../../src/components/ListItem';
import { SkeletonLoader } from '../../../src/components/SkeletonLoader';

export default function AdjustMembershipScreen() {
  const { id, actionType } = useLocalSearchParams<{ id: string; actionType: string }>();
  const { colors, typography, spacing, radius } = useTheme();
  const router = useRouter();

  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [amount, setAmount] = useState('0');
  const [days, setDays] = useState('0');
  const [notes, setNotes] = useState('');

  const { data: membership, isLoading: isLoadingMembership } = useMembershipDetails(id || '');
  const { data: plans, isLoading: isLoadingPlans } = useMembershipPlans();
  const updateMutation = useUpdateMembership();

  const isPlanChange = actionType === 'Upgrade' || actionType === 'Downgrade';
  const isExtension = actionType === 'Extend';

  const handleSubmit = async () => {
    let payload: any = { notes };
    
    if (isPlanChange) {
      if (!selectedPlan) return Alert.alert('Validation', 'Please select a new plan.');
      payload.membershipPlanId = selectedPlan.id;
      payload.amountPaid = Number(amount) || 0;
    } else if (isExtension) {
      if (!days || Number(days) <= 0) return Alert.alert('Validation', 'Please enter valid days.');
      payload.extendDays = Number(days);
    } else if (actionType === 'Transfer') {
      // Transfer logic (e.g., to new member or gym) would go here
      return Alert.alert('Notice', 'Transfer is currently only supported via the web dashboard.');
    }

    try {
      await updateMutation.mutateAsync({ id: membership.id, payload });
      Alert.alert('Success', `Membership ${actionType.toLowerCase()} successful.`);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || `Failed to ${actionType.toLowerCase()} membership`);
    }
  };

  if (isLoadingMembership) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.lg }]}>
        <SkeletonLoader width="100%" height={100} borderRadius={radius.md} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: `${actionType} Membership` }} />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <SectionHeader title="Current Details" />
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: typography.sizes.title.fontSize, color: colors.text, fontWeight: '600' }}>
            {membership?.member?.firstName} {membership?.member?.lastName}
          </Text>
          <Text style={{ fontSize: typography.sizes.body.fontSize, color: colors.textSecondary, marginTop: 4 }}>
            Current Plan: {membership?.membershipPlan?.name}
          </Text>
        </Card>

        {isPlanChange && (
          <>
            <SectionHeader title="Select New Plan" />
            {isLoadingPlans ? (
              <SkeletonLoader width="100%" height={70} borderRadius={radius.md} />
            ) : (
              <Card padded={false} style={{ marginBottom: spacing.lg }}>
                {(plans || []).filter((p: any) => p.id !== membership?.membershipPlan?.id).map((p: any, idx: number, arr: any[]) => (
                  <ListItem
                    key={p.id}
                    title={p.name}
                    subtitle={`₹${p.price} · ${p.durationInDays} days`}
                    leftComponent={<Award size={18} color={selectedPlan?.id === p.id ? colors.primary : colors.textSecondary} />}
                    onPress={() => setSelectedPlan(p)}
                    style={idx === arr.length - 1 ? { borderBottomWidth: 0 } : undefined}
                  />
                ))}
              </Card>
            )}

            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Adjustment Amount (₹)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textMuted, marginBottom: spacing.md }}>
              Enter the difference amount to be charged or credited.
            </Text>
          </>
        )}

        {isExtension && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Additional Days</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }]}
              value={days}
              onChangeText={setDays}
              keyboardType="numeric"
              placeholder="e.g. 30"
              placeholderTextColor={colors.textMuted}
            />
          </>
        )}

        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Notes</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, borderRadius: radius.md, padding: spacing.md, height: 100 }]}
          value={notes}
          onChangeText={setNotes}
          placeholder={`Reason for ${actionType.toLowerCase()}...`}
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, padding: spacing.lg }]}>
        <SecondaryButton title="Cancel" onPress={() => router.back()} style={{ flex: 1, marginRight: spacing.sm }} />
        <PrimaryButton title="Confirm" onPress={handleSubmit} isLoading={updateMutation.isPending} style={{ flex: 2 }} />
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
