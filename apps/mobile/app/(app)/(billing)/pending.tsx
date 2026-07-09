import React from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useRouter as useExpoRouter } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';

import { useTheme } from '@/theme/theme';
import { useWorkspaceStore } from '@/store/workspace.store';
import { usePendingDues } from '@/hooks/useBilling';

import { InvoiceCard } from '@/components/billing/InvoiceCard';
import { EmptyState } from '@/components/EmptyState';

export default function PendingDuesScreen() {
  const { colors, spacing } = useTheme();
  const router = useExpoRouter();
  const { activeGymId } = useWorkspaceStore();

  const { data: dues, isLoading, refetch, isFetching } = usePendingDues(activeGymId || '');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlashList
        data={dues || []}
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
              title="No pending dues"
              description="All members are caught up!"
              icon={<AlertCircle size={36} color={colors.textMuted} />}
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
