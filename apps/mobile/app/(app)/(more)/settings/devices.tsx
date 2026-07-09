import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Smartphone, Radio, Plus, Trash2 } from 'lucide-react-native';

import { useTheme } from '../../../../src/theme/theme';
import { useHaptics } from '../../../../src/hooks/useHaptics';
import { Card } from '../../../../src/components/Card';
import { SectionHeader } from '../../../../src/components/SectionHeader';
import { PrimaryButton } from '../../../../src/components/PrimaryButton';

export default function ConnectedDevicesSettings() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { lightImpact, successNotification } = useHaptics();

  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState([
    { id: '1', name: 'Front Desk RFID Scanner', type: 'Barcode Reader', status: 'Connected' },
    { id: '2', name: 'Biometric Gate Reader', type: 'Check-In Access', status: 'Offline' },
  ]);

  const handleScan = () => {
    lightImpact();
    setScanning(true);
    setTimeout(() => {
      successNotification();
      setScanning(false);
      const newDev = {
        id: Date.now().toString(),
        name: 'Bluetooth Receipt Printer (PR-58)',
        type: 'POS Printer',
        status: 'Connected'
      };
      setDevices([...devices, newDev]);
      Alert.alert('Device Discovered', 'receipt printer successfully configured!');
    }, 2000);
  };

  const handleDisconnect = (id: string) => {
    lightImpact();
    setDevices(devices.filter(d => d.id !== id));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Hardware Devices</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <SectionHeader title="Active Integrations" />
        {devices.map((dev) => (
          <Card key={dev.id} style={[styles.devCard, { borderColor: colors.border, borderWidth: 1 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{dev.name}</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{dev.type}</Text>
              <View style={[styles.statusTag, { backgroundColor: dev.status === 'Connected' ? colors.successLight : colors.errorLight, borderRadius: radius.xs }]}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: dev.status === 'Connected' ? colors.successText : colors.errorText }}>
                  {dev.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => handleDisconnect(dev.id)} style={{ padding: 8 }}>
              <Trash2 size={16} color={colors.error} />
            </Pressable>
          </Card>
        ))}

        {/* Scan button */}
        <View style={{ marginTop: spacing.lg }}>
          <PrimaryButton
            label={scanning ? "Searching for Swatches..." : "Pair Bluetooth Device"}
            onPress={handleScan}
            disabled={scanning}
            icon={scanning ? <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} /> : <Plus size={16} color="#FFF" style={{ marginRight: 8 }} />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  devCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
  },
  statusTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 6,
  }
});
