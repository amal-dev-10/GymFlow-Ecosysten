import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Eye, Bell, Shield, Smartphone, HelpCircle, HardDrive, Search, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTheme } from '../../../../src/theme/theme';
import { useHaptics } from '../../../../src/hooks/useHaptics';
import { Card } from '../../../../src/components/Card';
import { SectionHeader } from '../../../../src/components/SectionHeader';

export default function SettingsDashboard() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { lightImpact } = useHaptics();

  const [search, setSearch] = useState('');

  const settingsItems = [
    {
      title: 'Account Settings',
      items: [
        { label: 'Edit Profile & Branch Details', icon: User, color: '#3B82F6', route: '/(app)/(more)/settings/profile' },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { label: 'Display & Appearance', icon: Eye, color: '#8B5CF6', route: '/(app)/(more)/settings/appearance' },
        { label: 'Notification Channels', icon: Bell, color: '#EF4444', route: '/(app)/(more)/settings/notifications' },
      ]
    },
    {
      title: 'Security & Device',
      items: [
        { label: 'Passcodes & Biometrics', icon: Shield, color: '#10B981', route: '/(app)/(more)/settings/security' },
        { label: 'Connected Hardware', icon: Smartphone, color: '#6366F1', route: '/(app)/(more)/settings/devices' },
      ]
    },
    {
      title: 'System & Support',
      items: [
        { label: 'Offline Sync & Cache', icon: HardDrive, color: '#F59E0B', route: '/(app)/(more)/settings/offline' },
        { label: 'Help Center & Feedback', icon: HelpCircle, color: '#6B7280', action: () => router.push('/(app)/(more)') },
      ]
    }
  ];

  const filteredSections = settingsItems.map(sec => {
    const items = sec.items.filter(item => item.label.toLowerCase().includes(search.toLowerCase()));
    return { ...sec, items };
  }).filter(sec => sec.items.length > 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Custom Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.replace('/(app)/(more)')} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>App Settings</Text>
      </View>

      {/* Settings Search */}
      <View style={{ paddingHorizontal: spacing.lg, marginVertical: spacing.md }}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search settings..."
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, height: 40, marginLeft: 8, fontSize: 13, color: colors.text }}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}>
        {filteredSections.map((section, idx) => (
          <Animated.View key={section.title} entering={FadeInDown.delay(idx * 50).duration(350)}>
            <SectionHeader title={section.title} style={{ marginTop: spacing.md }} />
            <Card padded={false} style={{ marginBottom: spacing.md }}>
              {section.items.map((item, itemIdx, arr) => (
                <Pressable
                  key={item.label}
                  onPress={() => {
                    lightImpact();
                    if (item.route) {
                      router.push(item.route as any);
                    } else if (item.action) {
                      item.action();
                    }
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      borderBottomColor: colors.border,
                      borderBottomWidth: itemIdx === arr.length - 1 ? 0 : 1,
                      opacity: pressed ? 0.92 : 1
                    }
                  ]}
                >
                  <View style={[styles.iconBox, { backgroundColor: item.color + '12' }]}>
                    <item.icon size={18} color={item.color} />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, flex: 1, marginLeft: spacing.md }}>
                    {item.label}
                  </Text>
                  <ChevronRight size={16} color={colors.textMuted} />
                </Pressable>
              ))}
            </Card>
          </Animated.View>
        ))}
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
