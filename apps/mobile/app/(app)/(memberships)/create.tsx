import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Text, TextInput, Alert, TouchableOpacity } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { User, Award, Calendar, DollarSign, Tag, FileText, CheckCircle } from 'lucide-react-native';

import { useTheme } from '../../../src/theme/theme';
import { useCreateMembership, useMembershipPlans } from '../../../src/hooks/useMemberships';
import { useMembers } from '../../../src/hooks/useMembers';

import { Card } from '../../../src/components/Card';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { SecondaryButton } from '../../../src/components/SecondaryButton';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { ListItem } from '../../../src/components/ListItem';
import { SkeletonLoader } from '../../../src/components/SkeletonLoader';

type Step = 'SelectMember' | 'SelectPlan' | 'Configure' | 'Review';

export default function CreateMembershipScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const router = useRouter();

  const [step, setStep] = useState<Step>('SelectMember');

  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState('0');

  // Hooks
  const { data: membersPage, isLoading: isLoadingMembers } = useMembers('');
  const { data: plans, isLoading: isLoadingPlans } = useMembershipPlans();
  const createMutation = useCreateMembership();

  const members = useMemo(() => membersPage?.pages?.[0]?.data || membersPage?.data || [], [membersPage]);

  const handleNext = () => {
    if (step === 'SelectMember') {
      if (!selectedMember) return Alert.alert('Validation', 'Please select a member.');
      setStep('SelectPlan');
    } else if (step === 'SelectPlan') {
      if (!selectedPlan) return Alert.alert('Validation', 'Please select a plan.');
      setStep('Configure');
    } else if (step === 'Configure') {
      setStep('Review');
    }
  };

  const handleBack = () => {
    if (step === 'SelectPlan') setStep('SelectMember');
    else if (step === 'Configure') setStep('SelectPlan');
    else if (step === 'Review') setStep('Configure');
    else router.back();
  };

  const handleSubmit = async () => {
    try {
      await createMutation.mutateAsync({
        memberId: selectedMember.id,
        membershipPlanId: selectedPlan.id,
        startDate,
        discountAmount: Number(discount) || 0,
        notes,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create membership');
    }
  };

  const renderSelectMember = () => (
    <View style={styles.stepContainer}>
      <SectionHeader title="Select Member" />
      {isLoadingMembers ? (
        <SkeletonLoader width="100%" height={70} borderRadius={radius.md} />
      ) : (
        <Card padded={false}>
          {members.slice(0, 10).map((m: any, idx: number) => (
            <ListItem
              key={m.id}
              title={`${m.firstName} ${m.lastName}`}
              subtitle={m.phoneNumber}
              leftComponent={<User size={18} color={selectedMember?.id === m.id ? colors.primary : colors.textSecondary} />}
              onPress={() => setSelectedMember(m)}
              style={idx === members.length - 1 ? { borderBottomWidth: 0 } : undefined}
            />
          ))}
        </Card>
      )}
    </View>
  );

  const renderSelectPlan = () => (
    <View style={styles.stepContainer}>
      <SectionHeader title="Select Plan" />
      {isLoadingPlans ? (
        <SkeletonLoader width="100%" height={70} borderRadius={radius.md} />
      ) : (
        <Card padded={false}>
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
    </View>
  );

  const renderConfigure = () => (
    <View style={styles.stepContainer}>
      <SectionHeader title="Configuration" />
      
      <Text style={[styles.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Start Date (YYYY-MM-DD)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, borderRadius: radius.md, padding: spacing.md }]}
        value={startDate}
        onChangeText={setStartDate}
        placeholder="Start Date"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs }]}>Discount (₹)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, borderRadius: radius.md, padding: spacing.md }]}
        value={discount}
        onChangeText={setDiscount}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs }]}>Notes</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, borderRadius: radius.md, padding: spacing.md, height: 100 }]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Any additional notes..."
        placeholderTextColor={colors.textMuted}
        multiline
        textAlignVertical="top"
      />
    </View>
  );

  const renderReview = () => (
    <View style={styles.stepContainer}>
      <SectionHeader title="Summary" />
      <Card>
        <Text style={{ fontSize: typography.sizes.body.fontSize, color: colors.textSecondary }}>Member</Text>
        <Text style={{ fontSize: typography.sizes.title.fontSize, color: colors.text, fontWeight: '600', marginBottom: spacing.md }}>
          {selectedMember?.firstName} {selectedMember?.lastName}
        </Text>

        <Text style={{ fontSize: typography.sizes.body.fontSize, color: colors.textSecondary }}>Plan</Text>
        <Text style={{ fontSize: typography.sizes.title.fontSize, color: colors.text, fontWeight: '600', marginBottom: spacing.md }}>
          {selectedPlan?.name} (₹{selectedPlan?.price})
        </Text>

        <Text style={{ fontSize: typography.sizes.body.fontSize, color: colors.textSecondary }}>Start Date</Text>
        <Text style={{ fontSize: typography.sizes.bodyMedium.fontSize, color: colors.text, marginBottom: spacing.md }}>
          {startDate}
        </Text>

        <Text style={{ fontSize: typography.sizes.body.fontSize, color: colors.textSecondary }}>Final Price</Text>
        <Text style={{ fontSize: typography.sizes.headline.fontSize, color: colors.primary, fontWeight: '700', marginBottom: spacing.md }}>
          ₹{(selectedPlan?.price || 0) - (Number(discount) || 0)}
        </Text>
      </Card>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Create Membership' }} />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        {step === 'SelectMember' && renderSelectMember()}
        {step === 'SelectPlan' && renderSelectPlan()}
        {step === 'Configure' && renderConfigure()}
        {step === 'Review' && renderReview()}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, padding: spacing.lg }]}>
        <SecondaryButton title={step === 'SelectMember' ? 'Cancel' : 'Back'} onPress={handleBack} style={{ flex: 1, marginRight: spacing.sm }} />
        {step === 'Review' ? (
          <PrimaryButton title="Confirm" onPress={handleSubmit} isLoading={createMutation.isPending} style={{ flex: 2 }} />
        ) : (
          <PrimaryButton title="Next" onPress={handleNext} style={{ flex: 2 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepContainer: {
    gap: 16,
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
