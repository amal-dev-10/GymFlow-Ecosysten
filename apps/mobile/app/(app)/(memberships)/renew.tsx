import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Text, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Award } from 'lucide-react-native';

import { useTheme } from '../../../src/theme/theme';
import { useCreateMembership, useMembershipPlans, useMembershipDetails } from '../../../src/hooks/useMemberships';

import { Card } from '../../../src/components/Card';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { SecondaryButton } from '../../../src/components/SecondaryButton';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { ListItem } from '../../../src/components/ListItem';
import { SkeletonLoader } from '../../../src/components/SkeletonLoader';

export default function RenewMembershipScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing, radius } = useTheme();
  const router = useRouter();

  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');

  // Hooks
  const { data: membership, isLoading: isLoadingMembership } = useMembershipDetails(id || '');
  const { data: plans, isLoading: isLoadingPlans } = useMembershipPlans();
  const createMutation = useCreateMembership();

  // If there's an existing end date, default to that. Otherwise today.
  const defaultStartDate = useMemo(() => {
    if (!membership?.endDate) return new Date().toISOString().split('T')[0];
    const end = new Date(membership.endDate);
    const today = new Date();
    // If expired, start today. If active, start after expiry.
    return end < today ? today.toISOString().split('T')[0] : end.toISOString().split('T')[0];
  }, [membership]);

  const handleSubmit = async () => {
    if (!selectedPlan) return Alert.alert('Validation', 'Please select a plan.');

    try {
      await createMutation.mutateAsync({
        memberId: membership.memberId,
        membershipPlanId: selectedPlan.id,
        startDate: defaultStartDate,
        discountAmount: Number(discount) || 0,
        notes,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to renew membership');
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
      <Stack.Screen options={{ title: 'Renew Membership' }} />

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

        <SectionHeader title="Select Renewal Plan" />
        {isLoadingPlans ? (
          <SkeletonLoader width="100%" height={70} borderRadius={radius.md} />
        ) : (
          <Card padded={false} style={{ marginBottom: spacing.lg }}>
            {(plans || []).map((p: any, idx: number) => (
              <ListItem
                key={p.id}
                title={p.name}
                subtitle={`₹${p.price} · ${p.durationInDays} days`}
                leftComponent={<Award size={18} color={selectedPlan?.id === p.id ? colors.primary : colors.textSecondary} />}
                onPress={() => setSelectedPlan(p)}
                style={idx === (plans || []).length - 1 ? { borderBottomWidth: 0 } : undefined}
              />
            ))}
          </Card>
        )}

        <SectionHeader title="Configuration" />
        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Renewal Start Date</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text, borderRadius: radius.md, padding: spacing.md }]}
          value={defaultStartDate}
          editable={false}
        />
        <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md }}>
          Automatically continues from current expiry or today if already expired.
        </Text>

        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Discount (₹)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, borderRadius: radius.md, padding: spacing.md }]}
          value={discount}
          onChangeText={setDiscount}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.textMuted}
        />
        
        {selectedPlan && (
          <Text style={{ fontSize: typography.sizes.bodyMedium.fontSize, color: colors.text, marginTop: spacing.sm, marginBottom: spacing.md }}>
            Final Price: <Text style={{ fontWeight: '700', color: colors.primary }}>₹{(selectedPlan.price || 0) - (Number(discount) || 0)}</Text>
          </Text>
        )}

        <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs }]}>Notes</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, borderRadius: radius.md, padding: spacing.md, height: 80 }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any renewal notes..."
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
        />

      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, padding: spacing.lg }]}>
        <SecondaryButton title="Cancel" onPress={() => router.back()} style={{ flex: 1, marginRight: spacing.sm }} />
        <PrimaryButton title="Confirm Renewal" onPress={handleSubmit} isLoading={createMutation.isPending} style={{ flex: 2 }} />
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
