import React from 'react';
import { View, StyleSheet, Text, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react-native';

import { useTheme } from '@/theme/theme';
import { useSubscriptionInvoices } from '@/hooks/useSubscription';
import { SubscriptionInvoiceDto } from '@/lib/api';
import type { StatusType } from '@/components/StatusBadge';

import { StatusBadge } from '@/components/StatusBadge';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';

const CURRENCY_SYMBOL: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ' };

function money(amount: number, currency?: string | null) {
  const sym = CURRENCY_SYMBOL[currency || 'INR'] || `${currency} `;
  return `${sym}${Number(amount || 0).toLocaleString('en-IN')}`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// "Overdue" is derived (Unpaid + past due), never stored.
function effectiveStatus(inv: SubscriptionInvoiceDto): string {
  const s = (inv.status || '').toLowerCase();
  if (s === 'unpaid' && inv.dueDate && new Date(inv.dueDate) < new Date()) return 'Overdue';
  return inv.status || 'Unknown';
}

function statusMeta(status: string): { type: StatusType; Icon: typeof CheckCircle2 } {
  const s = status.toLowerCase();
  if (s === 'paid') return { type: 'success', Icon: CheckCircle2 };
  if (s === 'overdue') return { type: 'error', Icon: AlertCircle };
  if (s === 'void' || s === 'refunded') return { type: 'default', Icon: FileText };
  return { type: 'warning', Icon: Clock }; // Unpaid / Pending / Partially Paid / Draft
}

export default function SubscriptionInvoicesScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const { data, isLoading, isError, error, refetch, isFetching } = useSubscriptionInvoices();

  if (isLoading) return <LoadingState message="Loading invoices..." />;
  if (isError) return <ErrorState message={(error as Error)?.message || 'Could not load invoices.'} onRetry={refetch} />;

  const renderItem = ({ item, index }: { item: SubscriptionInvoiceDto; index: number }) => {
    const status = effectiveStatus(item);
    const { type, Icon } = statusMeta(status);
    const currency = item.subscription?.plan?.currency;
    const planName = item.subscription?.plan?.name || item.description || 'Subscription';
    const paid = status.toLowerCase() === 'paid';

    return (
      <Animated.View entering={FadeInUp.delay(Math.min(index, 8) * 40).duration(300)}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          <View style={styles.top}>
            <View style={[styles.icon, { backgroundColor: colors.primary + '12', borderRadius: radius.md }]}>
              <Icon size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ fontSize: typography.sizes.bodyMedium.fontSize, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                {planName}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                INV-{String(item.id).slice(0, 8).toUpperCase()}
              </Text>
            </View>
            <Text style={{ fontSize: typography.sizes.title.fontSize, fontWeight: '800', color: colors.text }}>
              {money(item.amount, currency)}
            </Text>
          </View>

          <View style={[styles.bottom, { borderTopColor: colors.border }]}>
            <StatusBadge label={status} type={type} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>
              {paid ? `Paid ${fmtDate(item.paidAt || item.createdAt)}` : `Due ${fmtDate(item.dueDate)}`}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlashList
        data={data || []}
        renderItem={renderItem}
        estimatedItemSize={104}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon={<FileText size={44} color={colors.textMuted} />}
            title="No invoices yet"
            description="Invoices for your GymFlow subscription will appear here."
            style={{ marginTop: spacing.xxl }}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderWidth: 1, padding: 14, marginBottom: 12 },
  top: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
});
