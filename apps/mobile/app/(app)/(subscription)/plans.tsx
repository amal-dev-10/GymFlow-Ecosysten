import React from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Check, CheckCircle2 } from 'lucide-react-native';

import { useTheme } from '@/theme/theme';
import { useSubscription, useSubscriptionPlans, useSubscribeToPlan } from '@/hooks/useSubscription';
import { SubscriptionPlanDto } from '@/lib/api';
import { useHaptics } from '@/hooks/useHaptics';

import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';

const CURRENCY_SYMBOL: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ' };
const CYCLE_LABEL: Record<string, string> = {
  FREE: '', MONTHLY: '/mo', QUARTERLY: '/quarter', HALF_YEARLY: '/6 mo', YEARLY: '/yr', ENTERPRISE: 'custom',
};

function money(amount: number, currency: string) {
  const sym = CURRENCY_SYMBOL[currency] || `${currency} `;
  return `${sym}${Number(amount || 0).toLocaleString('en-IN')}`;
}

export default function ChangePlanScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const { success, error: errHaptic } = useHaptics();

  const plansQ = useSubscriptionPlans();
  const { data: current } = useSubscription();
  const subscribe = useSubscribeToPlan();

  const currentPlanId = current?.plan?.id;

  const choose = (plan: SubscriptionPlanDto) => {
    if (plan.id === currentPlanId) return;

    if (plan.price > 0) {
      // No in-app payment SDK — paid upgrades complete on the web dashboard.
      Alert.alert(
        `Upgrade to ${plan.name}`,
        `${plan.name} costs ${money(plan.price, plan.currency)}${CYCLE_LABEL[plan.billingCycle] || ''}. Payments aren't available in the app yet — please complete the upgrade from the GymFlow web dashboard.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert('Switch Plan', `Switch to the ${plan.name} plan?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Switch',
        onPress: () =>
          subscribe.mutate(plan.id, {
            onSuccess: () => { success(); Alert.alert('Plan Changed', `You're now on the ${plan.name} plan.`); },
            onError: (e: any) => { errHaptic(); Alert.alert('Error', e?.message || 'Could not change plan.'); },
          }),
      },
    ]);
  };

  if (plansQ.isLoading) return <LoadingState message="Loading plans..." />;
  if (plansQ.isError) return <ErrorState message={(plansQ.error as Error)?.message || 'Could not load plans.'} onRetry={plansQ.refetch} />;

  const plans = (plansQ.data || []).slice().sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={plansQ.isFetching && !plansQ.isLoading} onRefresh={plansQ.refetch} tintColor={colors.primary} />}
    >
      {plans.length === 0 ? (
        <EmptyState title="No plans available" description="There are no plans to choose from right now." style={{ marginTop: spacing.xxl }} />
      ) : (
        plans.map((plan, index) => {
          const isCurrent = plan.id === currentPlanId;
          const cycle = CYCLE_LABEL[plan.billingCycle] || '';
          const features = (plan.featureAccess || []).filter((f) => (f.state || '').toUpperCase() === 'ENABLED').slice(0, 5);

          return (
            <Animated.View key={plan.id} entering={FadeInUp.delay(Math.min(index, 6) * 50).duration(300)}>
              <Pressable
                onPress={() => choose(plan)}
                disabled={isCurrent || subscribe.isPending}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isCurrent ? colors.primary : colors.border,
                    borderWidth: isCurrent ? 2 : 1,
                    borderRadius: radius.lg,
                    opacity: pressed && !isCurrent ? 0.95 : 1,
                  },
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Text style={{ fontSize: typography.sizes.title.fontSize, fontWeight: '800', color: colors.text }}>{plan.name}</Text>
                      {!!plan.badge && (
                        <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>{plan.badge.toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>
                        {plan.price > 0 ? money(plan.price, plan.currency) : 'Free'}
                      </Text>
                      {!!cycle && cycle !== 'custom' && <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 3 }}>{cycle}</Text>}
                    </View>
                  </View>
                  {isCurrent ? (
                    <View style={[styles.currentPill, { backgroundColor: colors.primary + '15' }]}>
                      <CheckCircle2 size={13} color={colors.primary} />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, marginLeft: 4 }}>CURRENT</Text>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 12, fontWeight: '700', color: plan.price > 0 ? colors.textSecondary : colors.primary }}>
                      {plan.price > 0 ? 'Upgrade' : 'Switch'}
                    </Text>
                  )}
                </View>

                {!!plan.description && (
                  <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textSecondary, marginTop: 6 }}>{plan.description}</Text>
                )}

                {features.length > 0 && (
                  <View style={{ marginTop: spacing.md, gap: 6 }}>
                    {features.map((f) => (
                      <View key={f.featureKey} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Check size={14} color={colors.success} />
                        <Text style={{ fontSize: 12, color: colors.text, marginLeft: spacing.sm }}>{f.feature?.label || f.featureKey}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>
            </Animated.View>
          );
        })
      )}

      <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg }}>
        Paid upgrades are completed on the GymFlow web dashboard.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  currentPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
});
