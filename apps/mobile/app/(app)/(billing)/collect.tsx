import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter as useExpoRouter, useLocalSearchParams } from 'expo-router';
import { FileText, Wallet } from 'lucide-react-native';
import { useTheme } from '@/theme/theme';
import { useCollectPayment, useInvoice } from '@/hooks/useBilling';

import { PaymentMethodSelector } from '@/components/billing/PaymentMethodSelector';
import { PrimaryButton } from '@/components';
import { EmptyState } from '@/components/EmptyState';
import { useHaptics } from '@/hooks/useHaptics';

export default function CollectPaymentScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useExpoRouter();
  const { success, error } = useHaptics();
  const { invoiceId } = useLocalSearchParams<{ invoiceId?: string }>();

  const { data: invoice, isLoading } = useInvoice(invoiceId || '');
  const collectMutation = useCollectPayment();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('UPI');

  // Prefill the full outstanding balance once the invoice loads.
  useEffect(() => {
    if (invoice && invoice.outstanding > 0 && amount === '') {
      setAmount(String(invoice.outstanding));
    }
  }, [invoice]);

  // No invoice context — collecting a payment must target a specific member's
  // dues, so send the user to the pending-dues list to pick one.
  if (!invoiceId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <EmptyState
          icon={<Wallet size={48} color={colors.textMuted} />}
          title="Choose who's paying"
          description="Pick a member with outstanding dues to record a payment against their invoice."
          actionLabel="View Pending Dues"
          onActionPress={() => router.replace('/(app)/(billing)/pending')}
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Invoice not found.</Text>
      </View>
    );
  }

  const alreadyPaid = invoice.outstanding <= 0;

  const handleCollect = () => {
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }
    if (amt > invoice.outstanding) {
      Alert.alert('Amount Too High', `You can collect at most ₹${invoice.outstanding.toLocaleString('en-IN')} against this invoice.`);
      return;
    }

    collectMutation.mutate(
      {
        invoiceId: invoice.id,
        amount: amt,
        method,
        memberName: invoice.memberName,
        type: 'Membership Payment',
      },
      {
        onSuccess: (txn) => {
          success();
          Alert.alert(
            'Payment Collected',
            `₹${txn.amount.toLocaleString('en-IN')} recorded for ${txn.memberName} via ${txn.method}.`,
            [
              { text: 'View Receipt', onPress: () => router.replace(`/(app)/(billing)/receipts/${txn.receiptId}`) },
              { text: 'Done', onPress: () => router.back(), style: 'cancel' },
            ]
          );
        },
        onError: (e: any) => {
          error();
          Alert.alert('Error', e?.message || 'Failed to collect payment. Please try again.');
        },
      }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>

        {/* Invoice summary */}
        <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg }]}>
          <View style={styles.summaryRow}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '15', borderRadius: radius.md }]}>
              <FileText size={22} color={colors.primary} />
            </View>
            <View style={{ marginLeft: spacing.md, flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{invoice.memberName}</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{invoice.invoiceNumber}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={{ flex: 1, fontSize: 13, color: colors.textSecondary }}>Outstanding balance</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: invoice.outstanding > 0 ? colors.error : colors.success }}>
              ₹{invoice.outstanding.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {alreadyPaid ? (
          <View style={{ marginTop: spacing.xl }}>
            <EmptyState
              title="Fully paid"
              description="This invoice has no outstanding dues to collect."
            />
          </View>
        ) : (
          <>
            <Text style={[styles.label, { color: colors.text, marginTop: spacing.xl }]}>Amount to Collect</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, fontSize: 24, fontWeight: '700' }]}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={[styles.label, { color: colors.text }]}>Payment Method</Text>
            <PaymentMethodSelector selected={method} onSelect={setMethod} />
          </>
        )}
      </ScrollView>

      {!alreadyPaid && (
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <PrimaryButton
            label={`Collect ₹${Number(amount || 0).toLocaleString('en-IN')}`}
            onPress={handleCollect}
            loading={collectMutation.isPending}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  summary: {
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
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
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
  },
});
