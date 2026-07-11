import React, { useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CreditCard, RefreshCw, Trash2, User, Check, ArrowLeft } from 'lucide-react-native';

import { useTheme } from '../../../src/theme/theme';
import { useNotificationsStore } from '../../../src/store/notifications.store';
import { useHaptics } from '../../../src/hooks/useHaptics';

import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { Card } from '../../../src/components/Card';
import { SectionHeader } from '../../../src/components/SectionHeader';

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { lightImpact, successNotification } = useHaptics();

  const { notifications, markRead, deleteNotification } = useNotificationsStore();
  const item = notifications.find(n => n.id === id);

  useEffect(() => {
    if (item && !item.read) {
      markRead(item.id);
    }
  }, [item?.id, item?.read, markRead]);

  if (!item) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>Notification not found</Text>
        </View>
      </SafeAreaView>
    );
  }


  const handleAction = () => {
    lightImpact();
    if (item.actionType === 'open-member' && item.memberId) {
      router.push(`/(app)/(members)/${item.memberId}`);
    } else if (item.actionType === 'collect-payment') {
      router.push(item.invoiceId ? `/(app)/(billing)/collect?invoiceId=${item.invoiceId}` : '/(app)/(billing)/pending');
    } else if (item.actionType === 'renew-membership') {
      // Renewals start from the member's subscription/billing context.
      if (item.invoiceId) router.push(`/(app)/(billing)/invoices/${item.invoiceId}`);
      else if (item.memberId) router.push(`/(app)/(members)/${item.memberId}`);
      else router.push('/(app)/(billing)/pending');
    } else {
      Alert.alert('Dismissed', 'Notification completed.');
      router.back();
    }
  };

  const handleDelete = () => {
    successNotification();
    deleteNotification(item.id);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Custom Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Alert Context</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {/* Priority Banner */}
        {item.priority === 'critical' && (
          <View style={[styles.criticalBanner, { backgroundColor: colors.errorLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg }]}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.errorText }}>Critical Action Required</Text>
            <Text style={{ fontSize: 11, color: colors.errorText, marginTop: 4 }}>This requires immediate attention or supervisor approval.</Text>
          </View>
        )}

        <SectionHeader title="Notification Information" />
        <Card style={{ marginBottom: spacing.lg, padding: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '12', borderRadius: radius.md }]}>
              <Bell size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>{item.category.toUpperCase()}</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 2 }}>{item.title}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 13, color: colors.text, marginTop: spacing.md, lineHeight: 18 }}>
            {item.description}
          </Text>

          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: spacing.md }}>
            Received: {new Date(item.time).toLocaleString('en-IN')}
          </Text>
        </Card>

        {/* Action Panel */}
        <SectionHeader title="Action Panel" />
        <Card style={{ padding: spacing.md, gap: spacing.md }}>
          {item.actionType ? (
            <PrimaryButton
              label={
                item.actionType === 'open-member' ? "Open Member Profile" :
                item.actionType === 'collect-payment' ? "Collect Payment Now" :
                item.actionType === 'renew-membership' ? "Process Renewal" : "Take Action"
              }
              onPress={handleAction}
              icon={
                item.actionType === 'open-member' ? <User size={18} color="#FFF" style={{ marginRight: 8 }} /> :
                item.actionType === 'collect-payment' ? <CreditCard size={18} color="#FFF" style={{ marginRight: 8 }} /> :
                item.actionType === 'renew-membership' ? <RefreshCw size={18} color="#FFF" style={{ marginRight: 8 }} /> : undefined
              }
            />
          ) : (
            <PrimaryButton
              label="Acknowledge Alert"
              onPress={() => router.back()}
              icon={<Check size={18} color="#FFF" style={{ marginRight: 8 }} />}
            />
          )}

          <Pressable 
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.deleteBtn,
              { borderColor: colors.error, borderRadius: radius.md, opacity: pressed ? 0.9 : 1 }
            ]}
          >
            <Trash2 size={16} color={colors.error} />
            <Text style={{ color: colors.error, fontSize: 12, fontWeight: '700', marginLeft: 6 }}>Delete Notification</Text>
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
  criticalBanner: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  iconBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
  }
});
