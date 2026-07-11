import React from 'react';
import { View, StyleSheet, Text, ScrollView, ActivityIndicator, Share } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CheckCircle2, Share as ShareIcon } from 'lucide-react-native';

import { useTheme } from '@/theme/theme';
import { useReceipt } from '@/hooks/useBilling';
import { PrimaryButton } from '@/components';

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, typography, radius } = useTheme();

  const { data: receipt, isLoading } = useReceipt(id);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!receipt) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Receipt not found.</Text>
      </View>
    );
  }

  const { transaction } = receipt;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `GymFlow Receipt: ${receipt.receiptNumber}\nAmount: ₹${transaction.amount.toLocaleString('en-IN')}\nMember: ${transaction.memberName}\nDate: ${new Date(transaction.date).toLocaleDateString('en-IN')}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>

        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center' }]}>
          <View style={[styles.iconBox, { backgroundColor: colors.success + '15', borderRadius: radius.full, marginBottom: spacing.md }]}>
            <CheckCircle2 size={48} color={colors.success} />
          </View>

          <Text style={{ fontSize: typography.sizes.title.fontSize, color: colors.textSecondary, marginBottom: 4 }}>
            Payment Successful
          </Text>
          <Text style={{ fontSize: 36, fontWeight: '800', color: colors.text, marginBottom: spacing.xl }}>
            ₹{transaction.amount.toLocaleString('en-IN')}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.detailsContainer}>
            <DetailRow label="Receipt Number" value={receipt.receiptNumber} colors={colors} />
            <DetailRow label="Date" value={new Date(transaction.date).toLocaleString()} colors={colors} />
            <DetailRow label="Member" value={transaction.memberName} colors={colors} />
            <DetailRow label="Payment Method" value={transaction.method} colors={colors} />
            <DetailRow label="Charge Type" value={transaction.type} colors={colors} />
            <DetailRow label="Collected By" value={transaction.collectedBy} colors={colors} />
          </View>

        </View>

      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <PrimaryButton
          label="Share Receipt"
          icon={<ShareIcon size={20} color="#FFF" style={{ marginRight: 8 }} />}
          onPress={handleShare}
        />
      </View>
    </View>
  );
}

function DetailRow({ label, value, colors }: any) {
  return (
    <View style={styles.detailRow}>
      <Text style={{ fontSize: 14, color: colors.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'right', flex: 1, marginLeft: 16 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  iconBox: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 20,
  },
  detailsContainer: {
    width: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  }
});
