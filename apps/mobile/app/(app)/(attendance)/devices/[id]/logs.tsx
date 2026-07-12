import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Terminal, CheckCircle, AlertTriangle, Info } from 'lucide-react-native';

import { useTheme } from '@/theme/theme';
import { devicesApi } from '@/lib/api';

export default function DeviceLogsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, typography, radius } = useTheme();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['device', id, 'events'],
    queryFn: () => devicesApi.getEvents(id as string),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const renderItem = ({ item }: { item: any }) => {
    const isSuccess = item.status === 'PROCESSED';
    const isError = item.status === 'FAILED';
    const Icon = isSuccess ? CheckCircle : isError ? AlertTriangle : Info;
    const iconColor = isSuccess ? colors.success : isError ? colors.error : colors.warning;

    return (
      <View style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
          <Icon size={16} color={iconColor} />
          <Text style={{ fontSize: typography.sizes.caption.fontSize, fontWeight: 'bold', color: colors.text }}>
            {item.type}
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textSecondary }}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>
        <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textSecondary, fontFamily: 'Menlo', backgroundColor: colors.background, padding: spacing.sm, borderRadius: radius.sm, overflow: 'hidden' }} numberOfLines={3}>
          {JSON.stringify(item.rawPayload)}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Device Logs' }} />
      
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: spacing.md }}>Loading logs...</Text>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.center}>
          <Terminal size={48} color={colors.border} />
          <Text style={{ color: colors.textSecondary, marginTop: spacing.md }}>No logs recorded yet.</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
});
