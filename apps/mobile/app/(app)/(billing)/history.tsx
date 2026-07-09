import React from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter as useExpoRouter } from 'expo-router';
import { Clock } from 'lucide-react-native';

import { useTheme } from '@/theme/theme';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useTransactions } from '@/hooks/useBilling';

import { TransactionItem } from '@/components/billing/TransactionItem';
import { EmptyState } from '@/components/EmptyState';

export default function PaymentHistoryScreen() {
  const { colors, spacing } = useTheme();
  const router = useExpoRouter();
  const { activeGymId } = useWorkspaceStore();

  const { data: transactions, isLoading, refetch, isFetching } = useTransactions(activeGymId || '');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlashList
        data={transactions || []}
        renderItem={({ item }: { item: any }) => (
          <TransactionItem
            transaction={item}
            onPress={() => item.receiptId ? router.push(`/(app)/(billing)/receipts/${item.receiptId}`) : null}
          />
        )}
        estimatedItemSize={70}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No transactions"
              description="Payment history will appear here."
              icon={<Clock size={36} color={colors.textMuted} />}
              style={{ marginTop: spacing.xl * 2 }}
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
