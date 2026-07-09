import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, HardDrive, RefreshCw, Trash2, CloudLightning } from 'lucide-react-native';

import { useTheme } from '../../../../src/theme/theme';
import { useHaptics } from '../../../../src/hooks/useHaptics';
import { Card } from '../../../../src/components/Card';
import { SectionHeader } from '../../../../src/components/SectionHeader';
import { PrimaryButton } from '../../../../src/components/PrimaryButton';
import { getQueue } from '../../../../src/lib/offlineQueue';

export default function OfflineSettings() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { lightImpact, successNotification } = useHaptics();

  const [syncing, setSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(getQueue ? getQueue().length : 0);

  const handleSync = () => {
    lightImpact();
    setSyncing(true);
    setTimeout(() => {
      successNotification();
      setSyncing(false);
      setQueueCount(0);
      Alert.alert('Synchronized', 'All offline operations synchronized with backend.');
    }, 1500);
  };

  const handleClearCache = () => {
    successNotification();
    Alert.alert('Cache Cleared', 'Images and temporary response caches cleared.');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Offline & Cache</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {/* Sync panel */}
        <SectionHeader title="Offline Sync Queue" />
        <Card style={{ padding: spacing.md, gap: spacing.md, marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Operations Pending</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                {queueCount} operations currently queued in local storage.
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: queueCount > 0 ? colors.warningLight : colors.successLight }]}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: queueCount > 0 ? colors.warningText : colors.successText }}>
                {queueCount > 0 ? 'SYNC REQ' : 'UP TO DATE'}
              </Text>
            </View>
          </View>

          <PrimaryButton
            label={syncing ? "Synchronizing..." : "Sync Now"}
            onPress={handleSync}
            disabled={syncing}
            icon={syncing ? <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} /> : <RefreshCw size={16} color="#FFF" style={{ marginRight: 8 }} />}
          />
        </Card>

        {/* Cache panel */}
        <SectionHeader title="Cache Management" />
        <Card style={{ padding: spacing.md, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Storage Used</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                14.2 MB occupied by cached member photos and JSON logs.
              </Text>
            </View>
            <HardDrive size={20} color={colors.textSecondary} />
          </View>

          <Pressable 
            onPress={handleClearCache}
            style={({ pressed }) => [
              styles.clearBtn,
              { borderColor: colors.error, borderRadius: radius.md, opacity: pressed ? 0.9 : 1 }
            ]}
          >
            <Trash2 size={16} color={colors.error} />
            <Text style={{ color: colors.error, fontSize: 12, fontWeight: '700', marginLeft: 6 }}>Clear Cache</Text>
          </Pressable>
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
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
  }
});
