import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import {
  Users, UserCog, CreditCard, Award, ScanLine, Dumbbell, Package,
  BarChart2, Bell, Settings, LogOut, ChevronRight, Search, Tag, LifeBuoy, Building2, Megaphone
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { useSearchStore } from '@/store/search.store';
import { useTheme } from '@/theme/theme';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useWorkspace } from '@/providers/WorkspaceProvider';
import { useHaptics } from '@/hooks/useHaptics';

import { ListItem } from '@/components/ListItem';
import { SectionHeader } from '@/components/SectionHeader';
import { PrimaryButton } from '@/components';
import { UserAvatar } from '@/components/UserAvatar';

const comingSoon = (feature: string) => Alert.alert(feature, 'Coming soon to the mobile app.');

const prettyRole = (role?: string | null) =>
  role
    ? role.split(/[_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Staff';

export default function MoreScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const { clearWorkspace } = useWorkspaceStore();
  const { can, role } = useWorkspace();
  const { lightImpact } = useHaptics();

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          clearWorkspace();
          await logout();
          router.replace('/(auth)/login');
        }
      }
    ]);
  };

  const menuSections = [
    {
      title: 'Operations',
      visible: true,
      items: [
        { label: 'Memberships', icon: Award, color: '#F59E0B', route: '/(app)/(memberships)', visible: can('manage-members') },
        { label: 'Membership Plans', icon: Tag, color: '#10B981', route: '/(app)/(memberships)/plans', visible: can('manage-members') },
        { label: 'Plan & Subscription', icon: CreditCard, color: '#3B82F6', route: '/(app)/(subscription)', visible: can('manage-staff') },
        { label: 'Organization Settings', icon: Building2, color: '#8B5CF6', route: '/(app)/(more)/organization', visible: can('manage-staff') },
        // { label: 'Payments & Billing', icon: CreditCard, color: '#3B82F6', route: '/(app)/(billing)', visible: can('record-payment') },
        // { label: 'Attendance History', icon: ScanLine, color: '#10B981', route: '/(app)/(attendance)', visible: can('mark-attendance') },
        { label: 'Classes & Sessions', icon: Dumbbell, color: '#EC4899', route: null, visible: true },
        { label: 'Inventory & POS', icon: Package, color: '#6366F1', route: null, visible: can('manage-inventory') },
      ]
    },
    // {
    //   title: 'People',
    //   visible: can('manage-staff') || can('manage-members'),
    //   items: [
    //     { label: 'Staff Management', icon: UserCog, color: '#8B5CF6', route: '/(app)/(staffs)', visible: can('manage-staff') },
    //     { label: 'Trainers', icon: Users, color: '#14B8A6', route: null, visible: can('manage-staff') },
    //   ]
    // },
    // {
    //   title: 'Analytics',
    //   visible: can('view-reports'),
    //   items: [
    //     { label: 'Reports & Analytics', icon: BarChart2, color: '#0EA5E9', route: '/(app)/(reports)', visible: can('view-reports') },
    //   ]
    // },
    {
      title: 'Settings',
      visible: true,
      items: [
        { label: 'Search & Command Center', icon: Search, color: '#3F51B5', action: () => useSearchStore.getState().openSearch(), visible: true },
        { label: 'Notifications', icon: Bell, color: '#64748B', route: null, visible: true },
        { label: 'Announcements', icon: Megaphone, color: '#F59E0B', route: '/(app)/(more)/announcements', visible: true },
        { label: 'Help & Support', icon: LifeBuoy, color: '#0EA5E9', route: '/(app)/(support)', visible: true },
        { label: 'App Settings', icon: Settings, color: '#64748B', route: '/(app)/(more)/settings', visible: true },
      ]
    }
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View entering={FadeInDown.duration(400)} style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
        <Text style={{ fontSize: typography.sizes.display.fontSize, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
          Menu
        </Text>
      </Animated.View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}>
        {/* Profile header */}
        <Animated.View entering={FadeInUp.duration(400)}>
          <Pressable
            onPress={() => { lightImpact(); router.push('/(app)/(more)/profile'); }}
            style={({ pressed }) => [
              styles.profileCard,
              { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border, opacity: pressed ? 0.95 : 1 },
            ]}
          >
            <UserAvatar name={user?.name || 'User'} uri={user?.avatarUrl} size={52} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ fontSize: typography.sizes.subtitle.fontSize, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                {user?.name || 'User'}
              </Text>
              <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                {prettyRole(role || user?.role)}{user?.phone ? ` · ${user.phone}` : ''}
              </Text>
              <Text style={{ fontSize: typography.sizes.overline.fontSize, color: colors.primary, fontWeight: '700', marginTop: 4 }}>
                View profile
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </Pressable>
        </Animated.View>

        {menuSections.map((section, sectionIndex) => {
          if (!section.visible) return null;

          const visibleItems = section.items.filter(item => item.visible);
          if (visibleItems.length === 0) return null;

          return (
            <Animated.View key={section.title} entering={FadeInUp.delay(sectionIndex * 50).duration(400)}>
              <SectionHeader title={section.title} style={{ marginTop: spacing.xl, marginBottom: spacing.md }} />
              <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }]}>
                {visibleItems.map((item, itemIndex) => (
                  <ListItem
                    key={item.label}
                    title={item.label}
                    leftComponent={<item.icon size={20} color={item.color} />}
                    onPress={() => {
                      lightImpact();
                      if (item.action) {
                        item.action();
                      } else if (item.route) {
                        router.push(item.route as any);
                      } else {
                        comingSoon(item.label);
                      }
                    }}
                    style={itemIndex === visibleItems.length - 1 ? { borderBottomWidth: 0 } : undefined}
                  />
                ))}
              </View>
            </Animated.View>
          );
        })}

        {/* <Animated.View entering={FadeInUp.delay(300).duration(400)} style={{ marginTop: spacing.xxl }}>
          <PrimaryButton
            label="Sign Out"
            onPress={handleLogout}
            icon={<LogOut size={20} color={colors.error} style={{ marginRight: 8 }} />}
            style={{ borderColor: colors.error }}
            textStyle={{ color: colors.error }}
          />
        </Animated.View> */}

        <Text style={{
          textAlign: 'center',
          color: colors.textMuted,
          fontSize: typography.sizes.overline.fontSize,
          marginTop: spacing.xxl,
          fontWeight: '600',
          letterSpacing: 0.5,
        }}>
          v{process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    marginTop: 4,
  },
});
