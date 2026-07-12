import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Monitor, Plus, Activity, Users, Settings, Terminal, Cpu } from 'lucide-react-native';

import { useTheme } from '@/theme/theme';
import { devicesApi } from '@/lib/api';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { ListItem } from '@/components/ListItem';
import { BottomSheet, BottomSheetRef } from '@/components/BottomSheet';
import { EmptyState } from '@/components/EmptyState';
import { useHaptics } from '@/hooks/useHaptics';

export default function DevicesScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success: hapticSuccess, lightImpact: hapticLight } = useHaptics();

  const detailsSheetRef = useRef<BottomSheetRef>(null);
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);

  const { data: devices = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['devices'],
    queryFn: () => devicesApi.list(),
  });

  const testConnectionMutation = useMutation({
    mutationFn: (id: string) => devicesApi.testConnection(id),
    onSuccess: (data) => {
      hapticSuccess();
      Alert.alert('Connection Successful', `Status: ${data.status}\nPing: ${data.ping}ms`);
    },
    onError: (err: any) => {
      Alert.alert('Connection Failed', err.message || 'Device is unreachable.');
    },
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => devicesApi.syncNow(id),
    onSuccess: () => {
      hapticSuccess();
      Alert.alert('Sync Started', 'Member credentials are being synced to the device.');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (err: any) => {
      Alert.alert('Sync Failed', err.message || 'Failed to trigger sync.');
    },
  });

  const handleDevicePress = (device: any) => {
    setSelectedDevice(device);
    hapticLight();
    detailsSheetRef.current?.show();
  };

  const renderContent = () => {
    if (isLoading && !isFetching) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>Loading devices...</Text>
        </View>
      );
    }

    if (devices.length === 0) {
      return (
        <EmptyState
          icon={<Monitor size={48} color={colors.primary} />}
          title="No Devices Found"
          description="Register your first biometric or access control device to get started."
          actionLabel="Register Device"
          onActionPress={() => router.push('/(app)/(attendance)/devices/register')}
        />
      );
    }

    return (
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {devices.map((device: any) => (
          <ListItem
            key={device.id}
            title={device.name}
            subtitle={`${device.vendor} ${device.model ? `· ${device.model}` : ''}`}
            showChevron={true}
            onPress={() => handleDevicePress(device)}
            leftComponent={
              <View style={[styles.iconContainer, { backgroundColor: device.status === 'ONLINE' ? colors.success + '20' : colors.textSecondary + '20' }]}>
                <Monitor size={20} color={device.status === 'ONLINE' ? colors.success : colors.textSecondary} />
              </View>
            }
            rightComponent={
              <View style={{ alignItems: 'flex-end', marginRight: spacing.md }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: device.status === 'ONLINE' ? colors.success : colors.textSecondary }}>
                  {device.status}
                </Text>
                {device.health?.cpu && (
                  <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                    CPU: {device.health.cpu}
                  </Text>
                )}
              </View>
            }
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderContent()}

      {devices.length > 0 && (
        <View style={[styles.fabContainer, { bottom: spacing.xl, right: spacing.lg }]}>
          <PrimaryButton
            label="Add Device"
            icon={<Plus size={20} color="#fff" />}
            onPress={() => router.push('/(app)/(attendance)/devices/register')}
            style={{ borderRadius: 100, paddingHorizontal: spacing.xl, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }}
          />
        </View>
      )}

      <BottomSheet ref={detailsSheetRef} snapPoints={[60]} title={selectedDevice?.name || 'Device Details'} >
        {selectedDevice && (
          <View style={{ padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}>
              <View style={[styles.iconContainer, { backgroundColor: selectedDevice.status === 'ONLINE' ? colors.success + '20' : colors.textSecondary + '20' }]}>
                <Monitor size={24} color={selectedDevice.status === 'ONLINE' ? colors.success : colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: typography.sizes.body.fontSize, fontWeight: '700', color: colors.text }}>
                  {selectedDevice.status}
                </Text>
                <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textSecondary, marginTop: 2 }}>
                  IP: {selectedDevice.ipAddress || 'Unknown'} · FW: {selectedDevice.version || 'Unknown'}
                </Text>
              </View>
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontSize: typography.sizes.label.fontSize, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs }}>
                Quick Actions
              </Text>

              <SecondaryButton
                label="Test Connection"
                icon={<Activity size={18} color={colors.primary} />}
                onPress={() => testConnectionMutation.mutate(selectedDevice.id)}
                loading={testConnectionMutation.isPending}
                style={{ justifyContent: 'flex-start', paddingHorizontal: spacing.md }}
              />

              <SecondaryButton
                label="Sync Members"
                icon={<Users size={18} color={colors.primary} />}
                onPress={() => syncMutation.mutate(selectedDevice.id)}
                loading={syncMutation.isPending}
                style={{ justifyContent: 'flex-start', paddingHorizontal: spacing.md }}
              />

              <SecondaryButton
                label="View Logs"
                icon={<Terminal size={18} color={colors.primary} />}
                onPress={() => {
                  detailsSheetRef.current?.hide();
                  router.push(`/(app)/(attendance)/devices/${selectedDevice.id}/logs`);
                }}
                style={{ justifyContent: 'flex-start', paddingHorizontal: spacing.md }}
              />

              <SecondaryButton
                label="Diagnostics"
                icon={<Cpu size={18} color={colors.primary} />}
                onPress={() => {
                  detailsSheetRef.current?.hide();
                  router.push(`/(app)/(attendance)/devices/${selectedDevice.id}/diagnostics`);
                }}
                style={{ justifyContent: 'flex-start', paddingHorizontal: spacing.md }}
              />
            </View>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabContainer: {
    position: 'absolute',
    zIndex: 10,
  }
});
