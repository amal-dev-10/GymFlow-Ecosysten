import React from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter as useExpoRouter } from 'expo-router';
import { Receipt } from 'lucide-react-native';

import { useTheme } from '@/theme/theme';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useInvoices } from '@/hooks/useBilling';

import { InvoiceCard } from '@/components/billing/InvoiceCard';
import { EmptyState } from '@/components/EmptyState';

export default function InvoicesScreen() {
  const { colors, spacing } = useTheme();
  const router = useExpoRouter();
  const { activeGymId } = useWorkspaceStore();

  const { data: invoices, isLoading, refetch, isFetching } = useInvoices(activeGymId || '');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlashList
        data={invoices || []}
        renderItem={({ item }: { item: any }) => (
          <InvoiceCard
            invoice={item}
            onPress={() => router.push(`/(app)/(billing)/invoices/${item.id}`)}
          />
        )}
        estimatedItemSize={90}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No Invoices"
              description="Generated invoices will appear here."
              icon={<Receipt size={36} color={colors.textMuted} />}
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
