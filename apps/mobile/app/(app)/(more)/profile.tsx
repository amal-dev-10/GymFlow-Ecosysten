import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, TextInput, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Pencil, Mail, Phone, Shield, Building2, Dumbbell, CheckCircle2, LogOut, X } from 'lucide-react-native';

import { useTheme } from '../../../src/theme/theme';
import { useAuthStore } from '../../../src/store/auth.store';
import { useWorkspaceStore } from '../../../src/store/workspace.store';
import { useMe, useUpdateProfile } from '../../../src/hooks/useProfile';
import { useHaptics } from '../../../src/hooks/useHaptics';

import { Card } from '../../../src/components/Card';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { UserAvatar } from '../../../src/components/UserAvatar';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { SecondaryButton } from '../../../src/components/SecondaryButton';

function prettyRole(role?: string): string {
  if (!role) return 'Staff';
  return role
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function ProfileScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { success, error: errorHaptic } = useHaptics();

  const storeUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { activeOrganizationName, activeGymName, clearWorkspace } = useWorkspaceStore();

  const { data: me, isFetching, refetch } = useMe();
  const updateProfile = useUpdateProfile();

  // getMe is the fresher source; fall back to the persisted store while loading.
  const user = me || storeUser;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const startEdit = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setEditing(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    updateProfile.mutate(
      { fullName: name.trim(), email: email.trim() },
      {
        onSuccess: () => {
          success();
          setEditing(false);
        },
        onError: (e: any) => {
          errorHaptic();
          Alert.alert('Error', e?.message || 'Failed to update profile.');
        },
      }
    );
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          clearWorkspace();
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const phoneVerified = (me as any)?.phoneVerified ?? (storeUser as any)?.phoneVerified;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, flex: 1 }}>Profile</Text>
        {!editing ? (
          <Pressable onPress={startEdit} style={styles.iconBtn} accessibilityLabel="Edit profile">
            <Pencil size={19} color={colors.primary} />
          </Pressable>
        ) : (
          <Pressable onPress={() => setEditing(false)} style={styles.iconBtn} accessibilityLabel="Cancel edit">
            <X size={22} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Identity */}
        <View style={{ alignItems: 'center', marginVertical: spacing.lg }}>
          <UserAvatar name={user?.name || 'User'} uri={user?.avatarUrl} size={88} />
          <Text style={{ fontSize: typography.sizes.headline.fontSize, fontWeight: '800', color: colors.text, marginTop: spacing.md }}>
            {user?.name || 'User'}
          </Text>
          <View style={{ marginTop: spacing.xs }}>
            <StatusBadge label={prettyRole(user?.role)} type="info" />
          </View>
        </View>

        {editing ? (
          <>
            <SectionHeader title="Edit Details" />
            <Card style={{ padding: spacing.md, gap: spacing.md }}>
              <View>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
                <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    placeholderTextColor={colors.textMuted}
                    style={{ flex: 1, height: 44, fontSize: 15, color: colors.text }}
                  />
                </View>
              </View>
              <View>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Email Address</Text>
                <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{ flex: 1, height: 44, fontSize: 15, color: colors.text }}
                  />
                </View>
              </View>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                Your login phone number can't be changed here.
              </Text>
            </Card>

            <View style={{ flexDirection: 'row', marginTop: spacing.xl }}>
              <SecondaryButton label="Cancel" onPress={() => setEditing(false)} style={{ flex: 1, marginRight: spacing.sm }} />
              <PrimaryButton label="Save Changes" onPress={handleSave} loading={updateProfile.isPending} style={{ flex: 2 }} />
            </View>
          </>
        ) : (
          <>
            <SectionHeader title="Account" />
            <Card padded={false}>
              <InfoRow icon={<Mail size={18} color={colors.info} />} label="Email" value={user?.email || 'Not set'} colors={colors} spacing={spacing} />
              <InfoRow
                icon={<Phone size={18} color={colors.success} />}
                label="Phone"
                value={user?.phone || '—'}
                colors={colors}
                spacing={spacing}
                trailing={
                  phoneVerified ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <CheckCircle2 size={13} color={colors.success} />
                      <Text style={{ fontSize: 11, color: colors.success, fontWeight: '700' }}>Verified</Text>
                    </View>
                  ) : undefined
                }
              />
              <InfoRow icon={<Shield size={18} color={colors.primary} />} label="Role" value={prettyRole(user?.role)} colors={colors} spacing={spacing} />
            </Card>

            <SectionHeader title="Workspace" style={{ marginTop: spacing.lg }} />
            <Card padded={false}>
              <InfoRow icon={<Building2 size={18} color={colors.warning} />} label="Organization" value={activeOrganizationName || '—'} colors={colors} spacing={spacing} />
              <InfoRow icon={<Dumbbell size={18} color={colors.info} />} label="Active Gym" value={activeGymName || '—'} colors={colors} spacing={spacing} last />
            </Card>

            <View style={{ marginTop: spacing.xl }}>
              <PrimaryButton
                label="Sign Out"
                onPress={handleLogout}
                icon={<LogOut size={20} color={colors.error} style={{ marginRight: 8 }} />}
                style={{ borderColor: colors.error, backgroundColor: 'transparent', borderWidth: 1 }}
                labelStyle={{ color: colors.error }}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
  spacing,
  trailing,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  colors: any;
  spacing: any;
  trailing?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        { paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderBottomColor: colors.border, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth },
      ]}
    >
      <View style={[styles.infoIcon, { backgroundColor: colors.surfaceElevated }]}>{icon}</View>
      <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: spacing.md, width: 100 }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'right' }} numberOfLines={1}>
        {value}
      </Text>
      {trailing ? <View style={{ marginLeft: 8 }}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  iconBtn: { padding: 6 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
