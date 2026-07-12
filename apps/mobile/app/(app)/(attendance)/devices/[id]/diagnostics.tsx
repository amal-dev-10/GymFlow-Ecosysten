import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Cpu, Activity, HardDrive, Thermometer, Network } from 'lucide-react-native';

import { useTheme } from '@/theme/theme';
import { devicesApi } from '@/lib/api';

export default function DeviceDiagnosticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, typography, radius } = useTheme();

  const { data: device, isLoading } = useQuery({
    queryKey: ['device', id],
    queryFn: () => devicesApi.get(id as string),
    enabled: !!id,
  });

  const StatCard = ({ icon: Icon, label, value }: { icon: any, label: string, value: string }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ marginBottom: spacing.sm }}>
        <Icon size={24} color={colors.primary} />
      </View>
      <Text style={{ fontSize: typography.sizes.caption.fontSize, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
        {label}
      </Text>
      <Text style={{ fontSize: typography.sizes.h3.fontSize, fontWeight: '900', color: colors.text }}>
        {value || 'N/A'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Hardware Health' }} />
      
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          <View style={{ width: '47%' }}>
            <StatCard icon={Cpu} label="CPU Usage" value={device?.health?.cpu} />
          </View>
          <View style={{ width: '47%' }}>
            <StatCard icon={Activity} label="Memory" value={device?.health?.memory} />
          </View>
          <View style={{ width: '47%' }}>
            <StatCard icon={HardDrive} label="Storage" value={device?.health?.storage} />
          </View>
          <View style={{ width: '47%' }}>
            <StatCard icon={Thermometer} label="Temperature" value={device?.health?.temperature} />
          </View>
          <View style={{ width: '100%' }}>
            <StatCard icon={Network} label="Network Quality" value={device?.health?.network} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
});
