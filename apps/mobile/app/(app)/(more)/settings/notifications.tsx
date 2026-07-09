import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, BellRing, VolumeX, ShieldAlert } from 'lucide-react-native';

import { useTheme } from '../../../../src/theme/theme';
import { useHaptics } from '../../../../src/hooks/useHaptics';
import { Card } from '../../../../src/components/Card';
import { SectionHeader } from '../../../../src/components/SectionHeader';

export default function NotificationSettings() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { lightImpact } = useHaptics();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [attendanceAlerts, setAttendanceAlerts] = useState(true);
  const [paymentAlerts, setPaymentAlerts] = useState(true);
  const [sessionReminders, setSessionReminders] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Notification Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <SectionHeader title="Channel Controls" />
        <Card style={{ padding: spacing.md, gap: spacing.md, marginBottom: spacing.lg }}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Allow Push Notifications</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>Required to receive real-time operational alerts.</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={(val) => { lightImpact(); setPushEnabled(val); }}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </Card>

        <SectionHeader title="Alert Preferences" />
        <Card padded={false} style={{ marginBottom: spacing.lg }}>
          <View style={[styles.switchRow, { borderBottomWidth: 1, borderBottomColor: colors.border, padding: spacing.md }]}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Attendance Check-Ins</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>Notify when members scan QR at front desk.</Text>
            </View>
            <Switch
              value={attendanceAlerts}
              onValueChange={(val) => { lightImpact(); setAttendanceAlerts(val); }}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={[styles.switchRow, { borderBottomWidth: 1, borderBottomColor: colors.border, padding: spacing.md }]}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Payment Collections</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>Alert on success or overdue balances.</Text>
            </View>
            <Switch
              value={paymentAlerts}
              onValueChange={(val) => { lightImpact(); setPaymentAlerts(val); }}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={[styles.switchRow, { padding: spacing.md }]}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>PT Session Reminders</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>Notify 15 mins before coaching schedule starts.</Text>
            </View>
            <Switch
              value={sessionReminders}
              onValueChange={(val) => { lightImpact(); setSessionReminders(val); }}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
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
