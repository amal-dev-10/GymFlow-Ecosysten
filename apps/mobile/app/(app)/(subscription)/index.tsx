import React from 'react';
import { View, StyleSheet, Text, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { CreditCard, Sparkles, CalendarClock, RefreshCw, CheckCircle2, FileText } from 'lucide-react-native';

import { useTheme } from '@/theme/theme';
import { useSubscription } from '@/hooks/useSubscription';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { ApiError, OrgSubscription, OrgSubscriptionResourceLimit } from '@/lib/api';
import type { StatusType } from '@/components/StatusBadge';

import { Card } from '@/components/Card';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';

const CURRENCY_SYMBOL: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ' };
const CYCLE_LABEL: Record<string, string> = {
  FREE: 'Free', MONTHLY: '/mo', QUARTERLY: '/quarter', HALF_YEARLY: '/6 mo', YEARLY: '/yr', ENTERPRISE: 'custom',
};

function money(amount: number, currency: string) {
  const sym = CURRENCY_SYMBOL[currency] || `${currency} `;
  return `${sym}${Number(amount || 0).toLocaleString('en-IN')}`;
}

function statusMeta(status: string): { label: string; type: StatusType } {
  const s = (status || '').toLowerCase();
  if (s === 'active') return { label: 'Active', type: 'success' };
  if (s === 'trialing') return { label: 'Trial', type: 'info' };
  if (s === 'grace_period') return { label: 'Grace Period', type: 'warning' };
  if (s === 'past_due' || s === 'pending_payment') return { label: 'Payment Due', type: 'warning' };
  if (s === 'expired' || s === 'suspended' || s === 'canceled' || s === 'cancelled') return { label: status.replace('_', ' '), type: 'error' };
  return { label: status || 'Unknown', type: 'default' };
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SubscriptionScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isFetching } = useSubscription();

  const is404 = error instanceof ApiError && error.status === 404;

  if (isLoading) return <LoadingState message="Loading your plan..." />;

  if (is404) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <EmptyState
          icon={<Sparkles size={44} color={colors.textMuted} />}
          title="No active plan"
          description="Your organization doesn't have an active GymFlow plan. Contact support to get set up."
        />
      </View>
    );
  }

  if (isError || !data) {
    return <ErrorState message={(error as Error)?.message || 'Could not load your subscription.'} onRetry={refetch} />;
  }

  const sub = data as OrgSubscription;
  const st = statusMeta(sub.status);
  const price = sub.isEnterpriseCustom && sub.customPrice != null ? sub.customPrice : sub.plan.price;
  const cycle = CYCLE_LABEL[sub.plan.billingCycle] || '';
  const trialActive = !!sub.trialEndDate && new Date(sub.trialEndDate) > new Date();

  const usageFor = (l: OrgSubscriptionResourceLimit) =>
    sub.usages?.find((u) => u.featureName === l.resourceKey)?.currentValue ?? 0;

  const limits = (sub.plan.resourceLimits || []).filter((l) => l.resource);
  const enabledFeatures = (sub.plan.featureAccess || []).filter((f) => (f.state || '').toUpperCase() === 'ENABLED');

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
    >
      {/* Plan hero */}
      <Card style={{ padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.icon, { backgroundColor: colors.primary + '15', borderRadius: radius.md }]}>
            <CreditCard size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ fontSize: typography.sizes.title.fontSize, fontWeight: '800', color: colors.text }}>{sub.plan.name}</Text>
              {!!sub.plan.badge && (
                <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>{sub.plan.badge.toUpperCase()}</Text>
                </View>
              )}
            </View>
            <View style={{ marginTop: 4 }}>
              <StatusBadge label={st.label} type={st.type} />
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.lg }}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text }}>{money(price, sub.plan.currency)}</Text>
          {!!cycle && cycle !== 'custom' && <Text style={{ fontSize: 14, color: colors.textSecondary, marginLeft: 4 }}>{cycle}</Text>}
          {cycle === 'custom' && <Text style={{ fontSize: 14, color: colors.textSecondary, marginLeft: 6 }}>· custom deal</Text>}
        </View>
        {!!sub.plan.description && (
          <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textSecondary, marginTop: 6 }}>{sub.plan.description}</Text>
        )}

        {trialActive && (
          <View style={[styles.trialBanner, { backgroundColor: colors.info + '12', borderRadius: radius.md, marginTop: spacing.md }]}>
            <Sparkles size={15} color={colors.info} />
            <Text style={{ fontSize: 12, color: colors.info, fontWeight: '600', marginLeft: 6 }}>
              Trial ends {fmtDate(sub.trialEndDate)}
            </Text>
          </View>
        )}
      </Card>

      {/* Billing details */}
      <SectionHeader title="Billing" style={{ marginTop: spacing.lg }} />
      <Card padded={false}>
        <Row icon={<CalendarClock size={18} color={colors.info} />} label="Current period" value={`${fmtDate(sub.startDate)} → ${fmtDate(sub.endDate)}`} colors={colors} spacing={spacing} />
        <Row icon={<RefreshCw size={18} color={sub.autoRenew ? colors.success : colors.textMuted} />} label="Auto-renew" value={sub.autoRenew ? 'On' : 'Off'} colors={colors} spacing={spacing} />
        <Row icon={<CreditCard size={18} color={colors.primary} />} label="Payment method" value={sub.paymentMethod || 'Not set'} colors={colors} spacing={spacing} last />
      </Card>

      {/* Plan limits + usage */}
      {limits.length > 0 && (
        <>
          <SectionHeader title="Plan Limits" style={{ marginTop: spacing.lg }} />
          <Card style={{ gap: spacing.md, padding: spacing.md }}>
            {limits.map((l) => {
              const unlimited = (l.limitType || '').toUpperCase() !== 'LIMITED' || l.limitValue == null;
              const used = usageFor(l);
              const limit = l.limitValue ?? 0;
              const pct = unlimited || limit <= 0 ? 0 : Math.min(1, used / limit);
              const near = !unlimited && l.warningThresholdValue != null && used >= l.warningThresholdValue;
              const barColor = pct >= 1 ? colors.error : near ? colors.warning : colors.primary;
              return (
                <View key={l.resourceKey}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>{l.resource?.label || l.resourceKey}</Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600' }}>
                      {used}{unlimited ? ' · Unlimited' : ` / ${limit}`}
                    </Text>
                  </View>
                  {!unlimited && (
                    <View style={[styles.track, { backgroundColor: colors.surfaceElevated }]}>
                      <View style={{ width: `${Math.max(pct * 100, 2)}%`, height: '100%', backgroundColor: barColor, borderRadius: 4 }} />
                    </View>
                  )}
                </View>
              );
            })}
          </Card>
        </>
      )}

      {/* Included features */}
      {enabledFeatures.length > 0 && (
        <>
          <SectionHeader title="Included Features" style={{ marginTop: spacing.lg }} />
          <Card style={{ gap: spacing.sm, padding: spacing.md }}>
            {enabledFeatures.map((f) => (
              <View key={f.featureKey} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <CheckCircle2 size={16} color={colors.success} />
                <Text style={{ fontSize: 13, color: colors.text, marginLeft: spacing.sm }}>{f.feature?.label || f.featureKey}</Text>
              </View>
            ))}
          </Card>
        </>
      )}

      <PrimaryButton
        label="Change Plan"
        onPress={() => router.push('/(app)/(subscription)/plans')}
        icon={<Sparkles size={18} color="#FFF" style={{ marginRight: 8 }} />}
        style={{ marginTop: spacing.xl }}
      />
      <SecondaryButton
        label="View Invoices"
        onPress={() => router.push('/(app)/(subscription)/invoices')}
        icon={<FileText size={18} color={colors.primary} style={{ marginRight: 8 }} />}
        style={{ marginTop: spacing.sm }}
      />
    </ScrollView>
  );
}

function Row({ icon, label, value, colors, spacing, last }: { icon: React.ReactNode; label: string; value: string; colors: any; spacing: any; last?: boolean }) {
  return (
    <View style={[styles.row, { paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderBottomColor: colors.border, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.surfaceElevated }]}>{icon}</View>
      <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: spacing.md, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600', textAlign: 'right', flexShrink: 1 }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  icon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  trialBanner: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', width: '100%' },
});
