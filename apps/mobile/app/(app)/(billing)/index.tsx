import React from 'react';
import { View, StyleSheet, Text, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter as useExpoRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Banknote, CreditCard, Receipt, Clock, Users } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useTheme } from '@/theme/theme';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useBillingDashboard, useTransactions } from '@/hooks/useBilling';

import { BillingWidget } from '@/components/billing/BillingWidget';
import { TransactionItem } from '@/components/billing/TransactionItem';
import { QuickActionButton } from '@/components/dashboard/QuickActionButton';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';

export default function BillingDashboardScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useExpoRouter();
  const { activeGymId } = useWorkspaceStore();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useBillingDashboard(activeGymId || '');
  const { data: transactions, isLoading: txnsLoading, refetch: refetchTxns, isFetching } = useTransactions(activeGymId || '');

  const handleRefresh = () => {
    refetchStats();
    refetchTxns();
  };

  const renderHeader = () => (
    <View style={{ paddingBottom: spacing.lg, paddingHorizontal: spacing.lg }}>
      <Animated.View entering={FadeInDown.duration(400).springify()} style={[styles.header, { paddingBottom: spacing.md, paddingTop: spacing.md }]}>
        <Text style={{ fontSize: typography.sizes.display.fontSize, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
          Payments
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <BillingWidget
            title="Today's Revenue"
            value={stats ? `₹${stats.todaysCollections.toLocaleString('en-IN')}` : '₹0'}
            icon={Banknote}
            color={colors.success}
          />
          <BillingWidget
            title="Pending Dues"
            value={stats ? `₹${stats.pendingDues.toLocaleString('en-IN')}` : '₹0'}
            icon={Clock}
            color={colors.warning}
            onPress={() => router.push('/(app)/(billing)/pending')}
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
        <SectionHeader title="Quick Actions" style={{ marginTop: spacing.xl }} />
        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
          <QuickActionButton
            label="Collect"
            icon={<CreditCard size={24} color="#3B82F6" />}
            color="#3B82F6"
            onPress={() => router.push('/(app)/(billing)/pending')}
          />
          <QuickActionButton
            label="Invoices"
            icon={<Receipt size={24} color="#8B5CF6" />}
            color="#8B5CF6"
            onPress={() => router.push('/(app)/(billing)/invoices')}
          />
          <QuickActionButton
            label="History"
            icon={<Clock size={24} color="#F59E0B" />}
            color="#F59E0B"
            onPress={() => router.push('/(app)/(billing)/history')}
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(400).springify()}>
        <SectionHeader title="Recent Transactions" style={{ marginTop: spacing.xl, marginBottom: spacing.sm }} />
      </Animated.View>
    </View>
  );

  const renderItem = ({ item, index }: { item: any, index: number }) => (
    <Animated.View entering={FadeInUp.delay(Math.min(index * 50, 400)).duration(300)} style={{ paddingHorizontal: spacing.lg }}>
      <TransactionItem
        transaction={item}
        onPress={() => item.receiptId ? router.push(`/(app)/(billing)/receipts/${item.receiptId}`) : null}
      />
    </Animated.View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <FlashList
        data={transactions || []}
        ListHeaderComponent={renderHeader}
        renderItem={renderItem}
        estimatedItemSize={70}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={isFetching && !txnsLoading} onRefresh={handleRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          !txnsLoading ? (
            <EmptyState
              title="No transactions yet"
              description="Start collecting payments to see them here."
              icon={<Banknote size={36} color={colors.textMuted} />}
              style={{ marginTop: spacing.xl }}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {},
});
