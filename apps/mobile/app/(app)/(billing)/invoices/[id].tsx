import React from 'react';
import { View, StyleSheet, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react-native';

import { useTheme } from '@/theme/theme';
import { useInvoice } from '@/hooks/useBilling';
import { PrimaryButton } from '@/components';
import { useRouter as useExpoRouter } from 'expo-router';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, typography, radius } = useTheme();
  const router = useExpoRouter();

  const { data: invoice, isLoading } = useInvoice(id);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Invoice not found.</Text>
      </View>
    );
  }

  let StatusIcon = Clock;
  let statusColor = colors.warning;
  if (invoice.status === 'Paid') {
    StatusIcon = CheckCircle2;
    statusColor = colors.success;
  } else if (invoice.status === 'Overdue') {
    StatusIcon = AlertCircle;
    statusColor = colors.error;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>

        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl }]}>
          <View style={styles.header}>
            <View>
              <Text style={{ fontSize: typography.sizes.display.fontSize, fontWeight: '800', color: colors.text }}>
                Invoice
              </Text>
              <Text style={{ fontSize: typography.sizes.body.fontSize, color: colors.textSecondary, marginTop: 4 }}>
                {invoice.invoiceNumber}
              </Text>
            </View>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '15', borderRadius: radius.md }]}>
              <FileText size={28} color={colors.primary} />
            </View>
          </View>

          <View style={{ marginTop: spacing.xl }}>
            <Text style={{ fontSize: typography.sizes.display.fontSize, color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '700' }}>
              Billed To
            </Text>
            <Text style={{ fontSize: typography.sizes.title.fontSize, fontWeight: '700', color: colors.text, marginTop: 4 }}>
              {invoice.memberName}
            </Text>
          </View>

          <View style={[styles.row, { marginTop: spacing.lg }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: typography.sizes.display.fontSize, color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '700' }}>
                Date Issued
              </Text>
              <Text style={{ fontSize: typography.sizes.body.fontSize, fontWeight: '600', color: colors.text, marginTop: 4 }}>
                {new Date(invoice.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: typography.sizes.display.fontSize, color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '700' }}>
                Due Date
              </Text>
              <Text style={{ fontSize: typography.sizes.body.fontSize, fontWeight: '600', color: colors.text, marginTop: 4 }}>
                {new Date(invoice.dueDate).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: spacing.xl }]} />

          <Text style={{ fontSize: typography.sizes.display.fontSize, color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '700', marginBottom: spacing.md }}>
            Items
          </Text>
          {invoice.items.map((item, idx) => (
            <View key={idx} style={[styles.row, { marginBottom: spacing.sm }]}>
              <Text style={{ flex: 1, fontSize: typography.sizes.body.fontSize, color: colors.text }}>
                {item.description}
              </Text>
              <Text style={{ fontSize: typography.sizes.body.fontSize, fontWeight: '600', color: colors.text }}>
                ${item.amount.toLocaleString()}
              </Text>
            </View>
          ))}

          <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: spacing.xl }]} />

          <View style={styles.row}>
            <Text style={{ flex: 1, fontSize: typography.sizes.title.fontSize, fontWeight: '800', color: colors.text }}>
              Total
            </Text>
            <Text style={{ fontSize: typography.sizes.title.fontSize, fontWeight: '800', color: colors.primary }}>
              ${invoice.total.toLocaleString()}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15', alignSelf: 'flex-start', marginTop: spacing.md, borderRadius: radius.full }]}>
            <StatusIcon size={16} color={statusColor} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: statusColor, marginLeft: 6 }}>
              {invoice.status}
            </Text>
          </View>
        </View>

      </ScrollView>

      {invoice.status !== 'Paid' && (
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <PrimaryButton
            label="Collect Payment"
            onPress={() => router.push('/(app)/(billing)/collect')}
          />
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  divider: {
    height: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  }
});
