import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TextInput, Alert, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Award, Check } from 'lucide-react-native';

import { useTheme } from '../../../../src/theme/theme';
import { useMember } from '../../../../src/hooks/useMembers';
import { useCreateMembership, useMembershipPlans } from '../../../../src/hooks/useMemberships';
import { computeEndDate, computePricing, planDurationLabel } from '../../../../src/lib/membership';
import { memberName, formatDate } from '../../../../src/lib/member';

import { Card } from '../../../../src/components/Card';
import { PrimaryButton } from '../../../../src/components/PrimaryButton';
import { SecondaryButton } from '../../../../src/components/SecondaryButton';
import { SectionHeader } from '../../../../src/components/SectionHeader';
import { SkeletonLoader } from '../../../../src/components/SkeletonLoader';

export default function SellMembershipScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing, radius } = useTheme();
  const router = useRouter();

  const { data: member, isLoading: isLoadingMember } = useMember(id as string);
  const { data: plans, isLoading: isLoadingPlans } = useMembershipPlans();
  const createMutation = useCreateMembership();

  const active = member?.activeMembership;
  const isRenewal = !!active;

  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [amount, setAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);

  // A still-running plan: the renewal must continue from the current expiry
  // rather than start today (which would overlap and waste paid-for days), so
  // we lock the start date in that case.
  const currentExpiryFuture = isRenewal && !!active?.endDate && new Date(active.endDate) > new Date();

  // Default the start date: renewals continue from the current expiry (or today
  // if already lapsed); fresh sales start today.
  useEffect(() => {
    if (startDate) return;
    if (isRenewal && active?.endDate) {
      const end = new Date(active.endDate);
      const today = new Date();
      setStartDate((end < today ? today : end).toISOString().split('T')[0]);
    } else if (member) {
      setStartDate(new Date().toISOString().split('T')[0]);
    }
  }, [member, isRenewal, active?.endDate, startDate]);

  // On a renewal, default to the member's current plan (the common case) so the
  // owner just confirms rather than re-picking.
  useEffect(() => {
    if (selectedPlan || !isRenewal || !plans?.length) return;
    const currentPlanId = (active as any)?.membershipPlanId;
    const match = currentPlanId ? plans.find((p: any) => p.id === currentPlanId) : undefined;
    if (match) {
      setSelectedPlan(match);
      setAmountTouched(false);
    }
  }, [plans, isRenewal, active, selectedPlan]);

  const pricing = useMemo(() => (selectedPlan ? computePricing(selectedPlan) : null), [selectedPlan]);
  const endDate = useMemo(
    () => (selectedPlan && startDate ? computeEndDate(startDate, selectedPlan) : ''),
    [selectedPlan, startDate]
  );

  // Prefill the amount with the full total each time a plan is picked, until the
  // user edits it (partial collection then leaves a balance as outstanding dues).
  useEffect(() => {
    if (pricing && !amountTouched) setAmount(String(pricing.total));
  }, [pricing, amountTouched]);

  const amountNum = Number(amount) || 0;
  const outstanding = pricing ? Math.max(0, pricing.total - amountNum) : 0;

  const handleSubmit = async () => {
    if (!member) return;
    if (!selectedPlan) return Alert.alert('Select a plan', 'Please choose a membership plan.');
    if (!startDate || isNaN(new Date(startDate).getTime())) {
      return Alert.alert('Invalid date', 'Please enter a valid start date (YYYY-MM-DD).');
    }
    if (amountNum < 0 || (pricing && amountNum > pricing.total)) {
      return Alert.alert('Invalid amount', `Amount collected must be between ₹0 and ₹${pricing?.total.toLocaleString('en-IN')}.`);
    }

    try {
      await createMutation.mutateAsync({
        memberId: member.id,
        membershipPlanId: selectedPlan.id,
        startDate,
        endDate,
        amountPaid: amountNum,
        status: 'Active',
      });

      const collectLater =
        outstanding > 0
          ? `\n₹${outstanding.toLocaleString('en-IN')} recorded as outstanding dues.`
          : '';
      Alert.alert(
        isRenewal ? 'Membership Renewed' : 'Membership Sold',
        `${selectedPlan.name} activated for ${memberName(member)} until ${formatDate(endDate)}.${collectLater}`,
        [{ text: 'Done', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save membership. Please try again.');
    }
  };

  if (isLoadingMember || !member) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.lg }]}>
        <Stack.Screen options={{ title: 'Membership' }} />
        <SkeletonLoader width="100%" height={100} borderRadius={radius.md} style={{ marginBottom: spacing.md }} />
        <SkeletonLoader width="100%" height={200} borderRadius={radius.md} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: isRenewal ? 'Renew Membership' : 'Sell Membership' }} />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        {/* Member + current plan context */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: typography.sizes.title.fontSize, color: colors.text, fontWeight: '700' }}>
            {memberName(member)}
          </Text>
          {isRenewal ? (
            <Text style={{ fontSize: typography.sizes.body.fontSize, color: colors.textSecondary, marginTop: 4 }}>
              Current: {active?.membershipPlan?.name || 'Plan'} · expires {formatDate(active?.endDate)}
            </Text>
          ) : (
            <Text style={{ fontSize: typography.sizes.body.fontSize, color: colors.textSecondary, marginTop: 4 }}>
              No active membership
            </Text>
          )}
        </Card>

        <SectionHeader title={isRenewal ? 'Choose Renewal Plan' : 'Choose Plan'} />
        {isLoadingPlans ? (
          <SkeletonLoader width="100%" height={70} borderRadius={radius.md} />
        ) : !plans || plans.length === 0 ? (
          <Card>
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.body.fontSize }}>
              No membership plans exist yet. Create a plan on the web dashboard first.
            </Text>
          </Card>
        ) : (
          <Card padded={false} style={{ marginBottom: spacing.lg }}>
            {plans.map((p: any, idx: number) => {
              const selected = selectedPlan?.id === p.id;
              const price = computePricing(p);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => { setSelectedPlan(p); setAmountTouched(false); }}
                  style={({ pressed }) => [
                    styles.planRow,
                    {
                      borderBottomWidth: idx === plans.length - 1 ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                      backgroundColor: selected ? colors.primary + '10' : pressed ? colors.background : 'transparent',
                      padding: spacing.md,
                    },
                  ]}
                >
                  <View style={[styles.planIcon, { backgroundColor: selected ? colors.primary : colors.surfaceElevated, borderRadius: radius.md }]}>
                    {selected ? <Check size={18} color="#FFF" /> : <Award size={18} color={colors.textSecondary} />}
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={{ fontSize: typography.sizes.bodyMedium.fontSize, fontWeight: '700', color: colors.text }}>{p.name}</Text>
                    <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textSecondary, marginTop: 2 }}>
                      {planDurationLabel(p)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: typography.sizes.bodyMedium.fontSize, fontWeight: '800', color: colors.text }}>
                    ₹{price.total.toLocaleString('en-IN')}
                  </Text>
                </Pressable>
              );
            })}
          </Card>
        )}

        {selectedPlan && (
          <>
            <SectionHeader title="Dates" />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Start Date (YYYY-MM-DD)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: currentExpiryFuture ? colors.surfaceElevated : colors.surface,
                  borderColor: colors.border,
                  color: currentExpiryFuture ? colors.textSecondary : colors.text,
                  borderRadius: radius.md,
                  padding: spacing.md,
                },
              ]}
              value={startDate}
              onChangeText={setStartDate}
              editable={!currentExpiryFuture}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
            {currentExpiryFuture && (
              <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textMuted, marginTop: 6 }}>
                Continues from the current expiry ({formatDate(active?.endDate)}) so no paid-for days are lost.
              </Text>
            )}
            <View style={[styles.newExpiry, { backgroundColor: colors.primary + '10', borderRadius: radius.md, marginTop: spacing.md }]}>
              <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textSecondary }}>
                {isRenewal ? 'New expiry after renewal' : 'Membership valid until'}
              </Text>
              <Text style={{ fontSize: typography.sizes.subtitle.fontSize, fontWeight: '800', color: colors.text, marginTop: 2 }}>
                {formatDate(endDate)} · {planDurationLabel(selectedPlan)}
              </Text>
            </View>

            <SectionHeader title="Payment" style={{ marginTop: spacing.lg }} />
            <Card style={{ marginBottom: spacing.md }}>
              <PriceRow label="Base price" value={pricing!.base} colors={colors} />
              {pricing!.joiningFee > 0 && <PriceRow label="Joining fee" value={pricing!.joiningFee} colors={colors} />}
              {pricing!.tax > 0 && <PriceRow label={`Tax (${pricing!.taxRate}%)`} value={pricing!.tax} colors={colors} />}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.priceRow}>
                <Text style={{ flex: 1, fontSize: typography.sizes.bodyMedium.fontSize, fontWeight: '800', color: colors.text }}>Total</Text>
                <Text style={{ fontSize: typography.sizes.title.fontSize, fontWeight: '800', color: colors.primary }}>
                  ₹{pricing!.total.toLocaleString('en-IN')}
                </Text>
              </View>
            </Card>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Amount Collecting Now</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, borderRadius: radius.md, padding: spacing.md, fontSize: 20, fontWeight: '700' }]}
              value={amount}
              onChangeText={(t) => { setAmount(t); setAmountTouched(true); }}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
            {outstanding > 0 && (
              <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.warning, marginTop: 6, fontWeight: '600' }}>
                ₹{outstanding.toLocaleString('en-IN')} will be left as outstanding dues (collect later from Billing).
              </Text>
            )}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, padding: spacing.lg }]}>
        <SecondaryButton label="Cancel" onPress={() => router.back()} style={{ flex: 1, marginRight: spacing.sm }} />
        <PrimaryButton
          label={isRenewal ? 'Confirm Renewal' : 'Confirm Sale'}
          onPress={handleSubmit}
          loading={createMutation.isPending}
          disabled={!selectedPlan}
          style={{ flex: 2 }}
        />
      </View>
    </View>
  );
}

function PriceRow({ label, value, colors }: { label: string; value: number; colors: any }) {
  return (
    <View style={styles.priceRow}>
      <Text style={{ flex: 1, fontSize: 14, color: colors.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>₹{value.toLocaleString('en-IN')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    fontSize: 16,
  },
  newExpiry: {
    padding: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    marginVertical: 8,
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
