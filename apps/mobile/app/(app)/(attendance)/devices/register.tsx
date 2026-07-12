import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Copy, AlertTriangle, Monitor } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

import { useTheme } from '@/theme/theme';
import { devicesApi } from '@/lib/api';
import { useWorkspaceStore } from '@/store/workspace.store';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { useHaptics } from '@/hooks/useHaptics';

const DEVICE_TYPES = [
  { value: 'QR_SCANNER', label: 'QR Scanner' },
  { value: 'FINGERPRINT', label: 'Fingerprint' },
  { value: 'RFID', label: 'RFID Reader' },
  { value: 'FACE_CAMERA', label: 'Face Recog' },
  { value: 'TURNSTILE', label: 'Turnstile' },
  { value: 'BARCODE', label: 'Barcode' },
];

const VENDORS = [
  { value: 'ZKTECO', label: 'ZKTeco' },
  { value: 'ESSL', label: 'eSSL' },
  { value: 'SUPREMA', label: 'Suprema' },
  { value: 'HIKVISION', label: 'Hikvision' },
  { value: 'CUSTOM', label: 'Custom' },
];

export default function RegisterDeviceScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeGymId } = useWorkspaceStore();
  const { success: hapticSuccess, lightImpact: hapticLight } = useHaptics();

  const [form, setForm] = useState({
    name: '',
    type: 'QR_SCANNER',
    vendor: 'ZKTECO',
    ipAddress: '',
    model: '',
    serialNumber: '',
    description: '',
  });

  const [generatedDevice, setGeneratedDevice] = useState<any | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: any) => devicesApi.create(payload),
    onSuccess: (data) => {
      hapticSuccess();
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      if (data?.device) {
        setGeneratedDevice(data.device);
      } else {
        Alert.alert('Success', 'Device registered successfully.');
        router.back();
      }
    },
    onError: (err: any) => {
      Alert.alert('Registration Failed', err.message || 'Could not register device.');
    }
  });

  const handleRegister = () => {
    if (!form.name || !activeGymId) {
      Alert.alert('Error', 'Device name is required.');
      return;
    }
    createMutation.mutate({
      ...form,
      gymId: activeGymId,
    });
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    hapticLight();
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  if (generatedDevice) {
    return (
      <ScrollView contentContainerStyle={{ padding: spacing.xl, flexGrow: 1, justifyContent: 'center' }} style={{ backgroundColor: colors.background }}>
        <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.success + '20', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg }}>
            <CheckCircle size={32} color={colors.success} />
          </View>
          <Text style={{ fontSize: typography.sizes.h2.fontSize, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
            Registration Successful
          </Text>
          <Text style={{ fontSize: typography.sizes.body.fontSize, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md, lineHeight: 22 }}>
            Your device is registered. You <Text style={{ color: colors.error, fontWeight: 'bold' }}>MUST</Text> configure the device with the credentials below now. The device key will not be shown again.
          </Text>
        </View>

        <View style={{ gap: spacing.md, marginBottom: spacing.xxl }}>
          <View style={[styles.credentialCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.credentialLabel, { color: colors.textSecondary }]}>Device ID</Text>
            <View style={styles.credentialRow}>
              <Text style={[styles.credentialValue, { color: colors.text }]} selectable>{generatedDevice.id}</Text>
              <SecondaryButton icon={<Copy size={16} color={colors.primary} />} onPress={() => copyToClipboard(generatedDevice.id, 'Device ID')} style={styles.copyBtn} label='Copy' />
            </View>
          </View>

          <View style={[styles.credentialCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.credentialLabel, { color: colors.textSecondary }]}>Webhook URL</Text>
            <View style={styles.credentialRow}>
              <Text style={[styles.credentialValue, { color: colors.text }]} selectable>{generatedDevice.webhookUrl}</Text>
              <SecondaryButton icon={<Copy size={16} color={colors.primary} />} onPress={() => copyToClipboard(generatedDevice.webhookUrl, 'Webhook URL')} style={styles.copyBtn} label='' />
            </View>
          </View>

          <View style={[styles.credentialCard, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]}>
            <Text style={[styles.credentialLabel, { color: colors.success }]}>Device Key (Secret)</Text>
            <View style={styles.credentialRow}>
              <Text style={[styles.credentialValue, { color: colors.text, fontWeight: '800' }]} selectable>{generatedDevice.deviceKey}</Text>
              <SecondaryButton icon={<Copy size={16} color={colors.success} />} onPress={() => copyToClipboard(generatedDevice.deviceKey, 'Device Key')} style={styles.copyBtn} label='' />
            </View>
          </View>
        </View>

        <PrimaryButton
          label="Done"
          onPress={() => router.back()}
        />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>

        <View style={{ gap: spacing.xs }}>
          <Text style={{ fontSize: typography.sizes.label.fontSize, fontWeight: 'bold', color: colors.text }}>Device Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g. Front Gate Turnstile"
            placeholderTextColor={colors.textSecondary}
            value={form.name}
            onChangeText={(t) => setForm({ ...form, name: t })}
          />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={{ fontSize: typography.sizes.label.fontSize, fontWeight: 'bold', color: colors.text }}>Device Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: 4 }}>
            {DEVICE_TYPES.map(dt => (
              <Pressable
                key={dt.value}
                onPress={() => { hapticLight(); setForm({ ...form, type: dt.value }); }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: radius.full,
                  backgroundColor: form.type === dt.value ? colors.primary : colors.card,
                  borderWidth: 1,
                  borderColor: form.type === dt.value ? colors.primary : colors.border,
                }}
              >
                <Text style={{ color: form.type === dt.value ? '#fff' : colors.text, fontWeight: '600' }}>
                  {dt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={{ fontSize: typography.sizes.label.fontSize, fontWeight: 'bold', color: colors.text }}>Vendor</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: 4 }}>
            {VENDORS.map(v => (
              <Pressable
                key={v.value}
                onPress={() => { hapticLight(); setForm({ ...form, vendor: v.value }); }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: radius.full,
                  backgroundColor: form.vendor === v.value ? colors.primary : colors.card,
                  borderWidth: 1,
                  borderColor: form.vendor === v.value ? colors.primary : colors.border,
                }}
              >
                <Text style={{ color: form.vendor === v.value ? '#fff' : colors.text, fontWeight: '600' }}>
                  {v.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={{ fontSize: typography.sizes.label.fontSize, fontWeight: 'bold', color: colors.text }}>IP Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="192.168.1.100"
              placeholderTextColor={colors.textSecondary}
              value={form.ipAddress}
              onChangeText={(t) => setForm({ ...form, ipAddress: t })}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={{ fontSize: typography.sizes.label.fontSize, fontWeight: 'bold', color: colors.text }}>Model</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. F22"
              placeholderTextColor={colors.textSecondary}
              value={form.model}
              onChangeText={(t) => setForm({ ...form, model: t })}
            />
          </View>
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={{ fontSize: typography.sizes.label.fontSize, fontWeight: 'bold', color: colors.text }}>Serial No.</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Serial number"
            placeholderTextColor={colors.textSecondary}
            value={form.serialNumber}
            onChangeText={(t) => setForm({ ...form, serialNumber: t })}
          />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={{ fontSize: typography.sizes.label.fontSize, fontWeight: 'bold', color: colors.text }}>Description</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, height: 80, textAlignVertical: 'top' }]}
            placeholder="Location or notes..."
            placeholderTextColor={colors.textSecondary}
            value={form.description}
            onChangeText={(t) => setForm({ ...form, description: t })}
            multiline
          />
        </View>

      </ScrollView>

      <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
        <PrimaryButton
          label="Register Device"
          onPress={handleRegister}
          loading={createMutation.isPending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  credentialCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  credentialLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  credentialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  credentialValue: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
    marginRight: 12,
  },
  copyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 0,
    borderRadius: 8,
  }
});
