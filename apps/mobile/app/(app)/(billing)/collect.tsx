import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter as useExpoRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useCollectPayment } from '@/hooks/useBilling';
import { useWorkspaceStore } from '@/store/workspace.store';

import { PaymentMethodSelector } from '@/components/billing/PaymentMethodSelector';
import { PrimaryButton } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';

export default function CollectPaymentScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const router = useExpoRouter();
  const { activeGymId } = useWorkspaceStore();
  const { success, error } = useHaptics();

  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('Membership Payment');
  const [method, setMethod] = useState('UPI');
  const [notes, setNotes] = useState('');

  const collectMutation = useCollectPayment();

  const handleCollect = () => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }

    collectMutation.mutate(
      {
        gymId: activeGymId,
        memberId: memberId || 'm-unknown',
        amount: Number(amount),
        method,
        type,
        notes
      },
      {
        onSuccess: (txn) => {
          success();
          Alert.alert(
            'Payment Successful',
            `Collected $${txn.amount.toLocaleString()} via ${txn.method}.`,
            [
              { text: 'View Receipt', onPress: () => router.replace(`/(app)/(billing)/receipts/${txn.receiptId}`) },
              { text: 'Done', onPress: () => router.back(), style: 'cancel' }
            ]
          );
        },
        onError: () => {
          error();
          Alert.alert('Error', 'Failed to collect payment. Please try again.');
        }
      }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>

        <Text style={[styles.label, { color: colors.text }]}>Member ID or Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder="Enter member ID..."
          placeholderTextColor={colors.textMuted}
          value={memberId}
          onChangeText={setMemberId}
        />

        <Text style={[styles.label, { color: colors.text }]}>Amount</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, fontSize: 24, fontWeight: '700' }]}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />

        <Text style={[styles.label, { color: colors.text }]}>Charge Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
          {['Membership Payment', 'Membership Renewal', 'Personal Training', 'Product Sale', 'Miscellaneous'].map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setType(t)}
              style={[
                styles.chip,
                {
                  backgroundColor: type === t ? colors.primary : colors.surface,
                  borderColor: type === t ? colors.primary : colors.border,
                  borderRadius: radius.full
                }
              ]}
            >
              <Text style={{ color: type === t ? '#FFF' : colors.text, fontWeight: '600' }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.label, { color: colors.text }]}>Payment Method</Text>
        <PaymentMethodSelector selected={method} onSelect={setMethod} />

        <Text style={[styles.label, { color: colors.text, marginTop: spacing.lg }]}>Notes (Optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, height: 80, textAlignVertical: 'top' }]}
          placeholder="Add any notes..."
          placeholderTextColor={colors.textMuted}
          multiline
          value={notes}
          onChangeText={setNotes}
        />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <PrimaryButton
          label={`Collect $${amount || '0'}`}
          onPress={handleCollect}
          loading={collectMutation.isPending}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    fontSize: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
  }
});
