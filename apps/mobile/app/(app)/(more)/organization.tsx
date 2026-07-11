import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, TextInput, Alert, RefreshControl, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Pencil, X, Building2, CheckCircle2 } from 'lucide-react-native';

import { useTheme } from '../../../src/theme/theme';
import { useActiveOrganization, useUpdateOrganization } from '../../../src/hooks/useOrganization';
import { useWorkspace } from '../../../src/providers/WorkspaceProvider';
import { useHaptics } from '../../../src/hooks/useHaptics';
import { UpdateOrganizationPayload, OrganizationSummaryDto } from '../../../src/lib/api';

import { Card } from '../../../src/components/Card';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { SecondaryButton } from '../../../src/components/SecondaryButton';
import { LoadingState } from '../../../src/components/LoadingState';

const BUSINESS_TYPES = [
  { id: 'gym', label: 'Gym' }, { id: 'fitness_center', label: 'Fitness Center' },
  { id: 'crossfit', label: 'CrossFit Box' }, { id: 'yoga', label: 'Yoga Studio' },
  { id: 'martial_arts', label: 'Martial Arts' }, { id: 'personal_training', label: 'PT Studio' },
  { id: 'sports_club', label: 'Sports Club' }, { id: 'other', label: 'Other' },
];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'AUD', 'CAD', 'JPY'];
const TIMEZONES = [
  { code: 'Asia/Kolkata', label: 'IST' }, { code: 'Asia/Dubai', label: 'GST' }, { code: 'Europe/London', label: 'GMT' },
  { code: 'Europe/Paris', label: 'CET' }, { code: 'America/New_York', label: 'EST' }, { code: 'America/Los_Angeles', label: 'PST' },
  { code: 'Asia/Tokyo', label: 'JST' }, { code: 'Australia/Sydney', label: 'AEST' },
];
const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const LANGUAGES = [
  { code: 'en', label: 'English' }, { code: 'es', label: 'Español' }, { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' }, { code: 'ar', label: 'العربية' },
];

const MODULES: { key: keyof OrganizationSummaryDto; label: string }[] = [
  { key: 'allowMemberSelfRegistration', label: 'Member Self-Registration' },
  { key: 'enableMultiBranchOperations', label: 'Multi-Branch Operations' },
  { key: 'enableAttendanceTracking', label: 'Attendance Tracking' },
  { key: 'enableWorkoutManagement', label: 'Workout Management' },
  { key: 'enableDietManagement', label: 'Diet Management' },
  { key: 'enablePersonalTraining', label: 'Personal Training' },
];

type FormState = {
  name: string; businessType: string; phone: string; email: string; website: string; description: string;
  addressLine1: string; addressLine2: string; city: string; state: string; country: string; postalCode: string;
  currency: string; timezone: string; dateFormat: string; language: string;
  allowMemberSelfRegistration: boolean; enableMultiBranchOperations: boolean; enableAttendanceTracking: boolean;
  enableWorkoutManagement: boolean; enableDietManagement: boolean; enablePersonalTraining: boolean;
};

function toForm(org: OrganizationSummaryDto): FormState {
  return {
    name: org.name || '', businessType: org.businessType || 'gym', phone: org.phone || '', email: org.email || '',
    website: org.website || '', description: org.description || '',
    addressLine1: org.addressLine1 || '', addressLine2: org.addressLine2 || '', city: org.city || '',
    state: org.state || '', country: org.country || '', postalCode: org.postalCode || '',
    currency: org.currency || 'INR', timezone: org.timezone || 'Asia/Kolkata', dateFormat: org.dateFormat || 'DD/MM/YYYY', language: org.language || 'en',
    allowMemberSelfRegistration: org.allowMemberSelfRegistration ?? true,
    enableMultiBranchOperations: org.enableMultiBranchOperations ?? true,
    enableAttendanceTracking: org.enableAttendanceTracking ?? true,
    enableWorkoutManagement: org.enableWorkoutManagement ?? true,
    enableDietManagement: org.enableDietManagement ?? true,
    enablePersonalTraining: org.enablePersonalTraining ?? false,
  };
}

export default function OrganizationSettingsScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { success, error: errorHaptic } = useHaptics();
  const { can } = useWorkspace();
  const canEdit = can('manage-staff');

  const { org, isLoading, isFetching, refetch } = useActiveOrganization();
  const updateMutation = useUpdateOrganization();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    if (org && !form) setForm(toForm(org));
  }, [org, form]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const startEdit = () => { if (org) { setForm(toForm(org)); setEditing(true); } };
  const cancelEdit = () => { if (org) setForm(toForm(org)); setEditing(false); };

  const handleSave = () => {
    if (!org || !form) return;
    if (!form.name.trim()) { Alert.alert('Name required', 'Organization name cannot be empty.'); return; }
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) { Alert.alert('Invalid email', 'Please enter a valid email.'); return; }

    const payload: UpdateOrganizationPayload = {
      name: form.name.trim(), businessType: form.businessType, phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined, website: form.website.trim() || undefined, description: form.description.trim() || undefined,
      addressLine1: form.addressLine1.trim() || undefined, addressLine2: form.addressLine2.trim() || undefined,
      city: form.city.trim() || undefined, state: form.state.trim() || undefined, country: form.country.trim() || undefined,
      postalCode: form.postalCode.trim() || undefined, currency: form.currency, timezone: form.timezone,
      dateFormat: form.dateFormat, language: form.language,
      allowMemberSelfRegistration: form.allowMemberSelfRegistration, enableMultiBranchOperations: form.enableMultiBranchOperations,
      enableAttendanceTracking: form.enableAttendanceTracking, enableWorkoutManagement: form.enableWorkoutManagement,
      enableDietManagement: form.enableDietManagement, enablePersonalTraining: form.enablePersonalTraining,
    };

    updateMutation.mutate(
      { id: org.id, payload },
      {
        onSuccess: () => { success(); setEditing(false); },
        onError: (e: any) => { errorHaptic(); Alert.alert('Error', e?.message || 'Failed to save changes.'); },
      }
    );
  };

  if (isLoading || !org || !form) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <LoadingState message="Loading organization..." />
      </SafeAreaView>
    );
  }

  const initials = org.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, flex: 1 }}>Organization</Text>
          {canEdit && (!editing ? (
            <Pressable onPress={startEdit} style={styles.iconBtn} accessibilityLabel="Edit organization">
              <Pencil size={19} color={colors.primary} />
            </Pressable>
          ) : (
            <Pressable onPress={cancelEdit} style={styles.iconBtn} accessibilityLabel="Cancel edit">
              <X size={22} color={colors.textSecondary} />
            </Pressable>
          ))}
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: editing ? 120 : 60 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={!editing ? <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} /> : undefined}
        >
          {/* Identity */}
          <View style={{ alignItems: 'center', marginVertical: spacing.md }}>
            <View style={[styles.logo, { backgroundColor: colors.primary + '15', borderRadius: radius.lg }]}>
              <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 24 }}>{initials}</Text>
            </View>
            <Text style={{ fontSize: typography.sizes.headline.fontSize, fontWeight: '800', color: colors.text, marginTop: spacing.sm }}>
              {org.name}
            </Text>
            {!!org.slug && <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>gymflow.app/{org.slug}</Text>}
          </View>

          {editing ? (
            <EditForm form={form} set={set} colors={colors} spacing={spacing} radius={radius} />
          ) : (
            <ViewMode org={org} colors={colors} spacing={spacing} />
          )}
        </ScrollView>

        {editing && (
          <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, padding: spacing.lg }]}>
            <SecondaryButton label="Cancel" onPress={cancelEdit} style={{ flex: 1, marginRight: spacing.sm }} />
            <PrimaryButton label="Save Changes" onPress={handleSave} loading={updateMutation.isPending} style={{ flex: 2 }} />
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// --- View mode ---------------------------------------------------------------
function ViewMode({ org, colors, spacing }: { org: OrganizationSummaryDto; colors: any; spacing: any }) {
  const bt = BUSINESS_TYPES.find((b) => b.id === org.businessType)?.label || org.businessType || '—';
  const address = [org.addressLine1, org.addressLine2, org.city, org.state, org.country, org.postalCode].filter(Boolean).join(', ');
  const tz = TIMEZONES.find((t) => t.code === org.timezone)?.label || org.timezone || '—';
  return (
    <>
      <SectionHeader title="Profile" />
      <Card padded={false}>
        <InfoRow label="Business Type" value={bt} colors={colors} spacing={spacing} />
        <InfoRow label="Phone" value={org.phone || '—'} colors={colors} spacing={spacing} />
        <InfoRow label="Email" value={org.email || '—'} colors={colors} spacing={spacing} />
        <InfoRow label="Website" value={org.website || '—'} colors={colors} spacing={spacing} />
        <InfoRow label="Description" value={org.description || '—'} colors={colors} spacing={spacing} last />
      </Card>

      <SectionHeader title="Address" style={{ marginTop: spacing.lg }} />
      <Card padded={false}>
        <InfoRow label="Address" value={address || '—'} colors={colors} spacing={spacing} last />
      </Card>

      <SectionHeader title="Localization" style={{ marginTop: spacing.lg }} />
      <Card padded={false}>
        <InfoRow label="Currency" value={org.currency || '—'} colors={colors} spacing={spacing} />
        <InfoRow label="Timezone" value={tz} colors={colors} spacing={spacing} />
        <InfoRow label="Date Format" value={org.dateFormat || '—'} colors={colors} spacing={spacing} last />
      </Card>

      <SectionHeader title="Modules" style={{ marginTop: spacing.lg }} />
      <Card style={{ gap: spacing.sm, padding: spacing.md }}>
        {MODULES.map((m) => {
          const on = !!org[m.key];
          return (
            <View key={String(m.key)} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <CheckCircle2 size={16} color={on ? colors.success : colors.textMuted} />
              <Text style={{ fontSize: 13, color: on ? colors.text : colors.textMuted, marginLeft: spacing.sm, flex: 1 }}>{m.label}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: on ? colors.success : colors.textMuted }}>{on ? 'On' : 'Off'}</Text>
            </View>
          );
        })}
      </Card>
    </>
  );
}

// --- Edit mode ---------------------------------------------------------------
function EditForm({ form, set, colors, spacing, radius }: {
  form: FormState; set: <K extends keyof FormState>(k: K, v: FormState[K]) => void; colors: any; spacing: any; radius: any;
}) {
  return (
    <>
      <SectionHeader title="Profile" />
      <Field label="Name" value={form.name} onChangeText={(v) => set('name', v)} colors={colors} spacing={spacing} radius={radius} />
      <Label colors={colors} spacing={spacing}>Business Type</Label>
      <Chips options={BUSINESS_TYPES.map((b) => ({ value: b.id, label: b.label }))} selected={form.businessType} onSelect={(v) => set('businessType', v)} colors={colors} radius={radius} />
      <Field label="Phone" value={form.phone} onChangeText={(v) => set('phone', v)} keyboardType="phone-pad" colors={colors} spacing={spacing} radius={radius} />
      <Field label="Email" value={form.email} onChangeText={(v) => set('email', v)} keyboardType="email-address" autoCapitalize="none" colors={colors} spacing={spacing} radius={radius} />
      <Field label="Website" value={form.website} onChangeText={(v) => set('website', v)} autoCapitalize="none" colors={colors} spacing={spacing} radius={radius} />
      <Field label="Description" value={form.description} onChangeText={(v) => set('description', v)} multiline colors={colors} spacing={spacing} radius={radius} />

      <SectionHeader title="Address" style={{ marginTop: spacing.lg }} />
      <Field label="Address Line 1" value={form.addressLine1} onChangeText={(v) => set('addressLine1', v)} colors={colors} spacing={spacing} radius={radius} />
      <Field label="Address Line 2" value={form.addressLine2} onChangeText={(v) => set('addressLine2', v)} colors={colors} spacing={spacing} radius={radius} />
      <Field label="City" value={form.city} onChangeText={(v) => set('city', v)} colors={colors} spacing={spacing} radius={radius} />
      <Field label="State" value={form.state} onChangeText={(v) => set('state', v)} colors={colors} spacing={spacing} radius={radius} />
      <Field label="Country" value={form.country} onChangeText={(v) => set('country', v)} colors={colors} spacing={spacing} radius={radius} />
      <Field label="Postal Code" value={form.postalCode} onChangeText={(v) => set('postalCode', v)} colors={colors} spacing={spacing} radius={radius} />

      <SectionHeader title="Localization" style={{ marginTop: spacing.lg }} />
      <Label colors={colors} spacing={spacing}>Currency</Label>
      <Chips options={CURRENCIES.map((c) => ({ value: c, label: c }))} selected={form.currency} onSelect={(v) => set('currency', v)} colors={colors} radius={radius} />
      <Label colors={colors} spacing={spacing}>Timezone</Label>
      <Chips options={TIMEZONES.map((t) => ({ value: t.code, label: t.label }))} selected={form.timezone} onSelect={(v) => set('timezone', v)} colors={colors} radius={radius} />
      <Label colors={colors} spacing={spacing}>Date Format</Label>
      <Chips options={DATE_FORMATS.map((d) => ({ value: d, label: d }))} selected={form.dateFormat} onSelect={(v) => set('dateFormat', v)} colors={colors} radius={radius} />
      <Label colors={colors} spacing={spacing}>Language</Label>
      <Chips options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))} selected={form.language} onSelect={(v) => set('language', v)} colors={colors} radius={radius} />

      <SectionHeader title="Modules" style={{ marginTop: spacing.lg }} />
      <Card style={{ padding: spacing.md }}>
        {MODULES.map((m, i) => (
          <View key={String(m.key)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
            <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>{m.label}</Text>
            <Switch
              value={!!form[m.key as keyof FormState]}
              onValueChange={(v) => set(m.key as keyof FormState, v as any)}
              trackColor={{ true: colors.primary }}
            />
          </View>
        ))}
      </Card>
    </>
  );
}

// --- small helpers -----------------------------------------------------------
function InfoRow({ label, value, colors, spacing, last }: { label: string; value: string; colors: any; spacing: any; last?: boolean }) {
  return (
    <View style={[styles.infoRow, { paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderBottomColor: colors.border, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth }]}>
      <Text style={{ fontSize: 13, color: colors.textSecondary, width: 110 }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

function Label({ children, colors, spacing }: { children: React.ReactNode; colors: any; spacing: any }) {
  return <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, marginTop: spacing.md }}>{children}</Text>;
}

function Field(props: any) {
  const { colors, spacing, radius } = props;
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Label colors={colors} spacing={spacing}>{props.label}</Label>
      <TextInput
        style={{
          backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md,
          paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, color: colors.text,
          height: props.multiline ? 90 : undefined, textAlignVertical: props.multiline ? 'top' : 'center',
        }}
        value={props.value}
        onChangeText={props.onChangeText}
        keyboardType={props.keyboardType}
        autoCapitalize={props.autoCapitalize}
        multiline={props.multiline}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

function Chips({ options, selected, onSelect, colors, radius }: { options: { value: string; label: string }[]; selected: string; onSelect: (v: string) => void; colors: any; radius: any }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const sel = selected === o.value;
        return (
          <Pressable key={o.value} onPress={() => onSelect(o.value)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, backgroundColor: sel ? colors.primary : colors.surface, borderColor: sel ? colors.primary : colors.border }}>
            <Text style={{ color: sel ? '#FFF' : colors.text, fontWeight: '600', fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  iconBtn: { padding: 6 },
  logo: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', borderTopWidth: 1 },
});
