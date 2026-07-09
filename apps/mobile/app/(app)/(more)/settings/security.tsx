import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Shield, Fingerprint, Lock } from 'lucide-react-native';

import { useTheme } from '../../../../src/theme/theme';
import { useHaptics } from '../../../../src/hooks/useHaptics';
import { Card } from '../../../../src/components/Card';
import { SectionHeader } from '../../../../src/components/SectionHeader';
import { PrimaryButton } from '../../../../src/components/PrimaryButton';

export default function SecuritySettings() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { lightImpact, successNotification } = useHaptics();

  const [biometricsEnabled, setBiometricsEnabled] = useState(true);

  const handleUpdatePassword = () => {
    successNotification();
    Alert.alert('Password Changed', 'Password update link sent to your registered email.');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Security & Access</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <SectionHeader title="Biometric Security" />
        <Card style={{ padding: spacing.md, gap: spacing.md, marginBottom: spacing.lg }}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Fingerprint size={16} color={colors.primary} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Face ID / Touch ID</Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>Use biometrics for quick unlock on launch.</Text>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={(val) => { lightImpact(); setBiometricsEnabled(val); }}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </Card>

        <SectionHeader title="Password Management" />
        <Card style={{ padding: spacing.md, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Lock size={16} color={colors.textSecondary} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Last changed: 3 months ago</Text>
          </View>
          <PrimaryButton label="Request Password Reset" onPress={handleUpdatePassword} />
        </Card>
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  }
});
