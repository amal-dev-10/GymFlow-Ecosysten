import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Mail, Phone, Shield } from 'lucide-react-native';

import { useTheme } from '../../../../src/theme/theme';
import { useAuthStore } from '../../../../src/store/auth.store';
import { useWorkspaceStore } from '../../../../src/store/workspace.store';
import { useWorkspace } from '../../../../src/providers/WorkspaceProvider';
import { useHaptics } from '../../../../src/hooks/useHaptics';

import { PrimaryButton } from '../../../../src/components/PrimaryButton';
import { Card } from '../../../../src/components/Card';
import { SectionHeader } from '../../../../src/components/SectionHeader';
import { UserAvatar } from '../../../../src/components/UserAvatar';

export default function ProfileSettings() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { lightImpact, successNotification } = useHaptics();

  const { user, updateUser } = useAuthStore();
  const { activeGymName } = useWorkspaceStore();
  const { role } = useWorkspace();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const handleSave = () => {
    if (!name || !email) {
      Alert.alert('Error', 'Name and Email are required.');
      return;
    }
    successNotification();
    updateUser({ name, email, phone });
    Alert.alert('Success', 'Profile updated locally.');
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Edit Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        {/* Avatar block */}
        <View style={{ alignItems: 'center', marginVertical: spacing.lg }}>
          <UserAvatar name={name || 'User'} size={80} />
          <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700', marginTop: spacing.sm }}>Change Photo</Text>
        </View>

        {/* Form */}
        <SectionHeader title="Personal Information" />
        <Card style={{ gap: spacing.sm, padding: spacing.md, marginBottom: spacing.lg }}>
          <View>
            <Text style={styles.label}>Full Name</Text>
            <View style={[styles.inputBox, { borderColor: colors.border }]}>
              <User size={16} color={colors.textMuted} />
              <TextInput
                value={name}
                onChangeText={setName}
                style={{ flex: 1, height: 40, marginLeft: 8, fontSize: 13, color: colors.text }}
              />
            </View>
          </View>
          <View style={{ marginTop: spacing.xs }}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputBox, { borderColor: colors.border }]}>
              <Mail size={16} color={colors.textMuted} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ flex: 1, height: 40, marginLeft: 8, fontSize: 13, color: colors.text }}
              />
            </View>
          </View>
          <View style={{ marginTop: spacing.xs }}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={[styles.inputBox, { borderColor: colors.border }]}>
              <Phone size={16} color={colors.textMuted} />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={{ flex: 1, height: 40, marginLeft: 8, fontSize: 13, color: colors.text }}
              />
            </View>
          </View>
        </Card>

        {/* Role & Workspace */}
        <SectionHeader title="Employment Details" />
        <Card style={{ padding: spacing.md, gap: spacing.sm }}>
          <View style={styles.detailRow}>
            <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}>Assigned Role</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{role || 'Staff'}</Text>
          </View>
          <View style={[styles.detailRow, { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: spacing.sm }]}>
            <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}>Active Workspace</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{activeGymName || 'Primary Branch'}</Text>
          </View>
        </Card>

        <View style={{ marginTop: spacing.xl }}>
          <PrimaryButton label="Save Changes" onPress={handleSave} />
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
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  }
});
