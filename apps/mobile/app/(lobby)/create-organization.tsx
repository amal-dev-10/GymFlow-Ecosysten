import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ArrowLeft, ArrowRight, CheckCircle2, Building2 } from 'lucide-react-native';

import { useTheme } from '../../src/theme/theme';
import { orgApi, gymApi, CreateOrganizationPayload } from '../../src/lib/api';
import { useHaptics } from '../../src/hooks/useHaptics';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { SecondaryButton } from '../../src/components/SecondaryButton';

type Step = 'info' | 'contact' | 'address' | 'settings' | 'review' | 'gym';
const ORG_STEPS: Step[] = ['info', 'contact', 'address', 'settings', 'review'];

const BUSINESS_TYPES = [
  { id: 'gym', label: 'Gym' },
  { id: 'fitness_center', label: 'Fitness Center' },
  { id: 'crossfit', label: 'CrossFit Box' },
  { id: 'yoga', label: 'Yoga Studio' },
  { id: 'martial_arts', label: 'Martial Arts' },
  { id: 'personal_training', label: 'PT Studio' },
  { id: 'sports_club', label: 'Sports Club' },
  { id: 'other', label: 'Other' },
];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'AUD', 'CAD', 'JPY'];
const TIMEZONES = [
  { code: 'Asia/Kolkata', label: 'IST (UTC+5:30)' },
  { code: 'Asia/Dubai', label: 'GST (UTC+4)' },
  { code: 'Europe/London', label: 'GMT (UTC+0)' },
  { code: 'Europe/Paris', label: 'CET (UTC+1)' },
  { code: 'America/New_York', label: 'EST (UTC-5)' },
  { code: 'America/Los_Angeles', label: 'PST (UTC-8)' },
  { code: 'Asia/Tokyo', label: 'JST (UTC+9)' },
  { code: 'Australia/Sydney', label: 'AEST (UTC+10)' },
];
const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ar', label: 'العربية' },
];

const toSlug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function CreateOrganizationScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { success, error: errorHaptic } = useHaptics();

  const [step, setStep] = useState<Step>('info');
  const [saving, setSaving] = useState(false);

  // Org fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [businessType, setBusinessType] = useState('gym');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateProv, setStateProv] = useState('');
  const [country, setCountry] = useState('India');
  const [postalCode, setPostalCode] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [language, setLanguage] = useState('en');

  // First-gym fields
  const [createdOrgId, setCreatedOrgId] = useState('');
  const [gymName, setGymName] = useState('');
  const [gymAddress, setGymAddress] = useState('');
  const [gymPhone, setGymPhone] = useState('');

  const orgStepIndex = ORG_STEPS.indexOf(step);

  const onNameChange = (v: string) => {
    setName(v);
    setSlug(toSlug(v));
  };

  const validate = (): string | null => {
    if (step === 'info') {
      if (!name.trim()) return 'Organization name is required.';
      if (!slug.trim()) return 'Workspace URL is required.';
    } else if (step === 'contact') {
      if (!phone.trim()) return 'Contact phone is required.';
      if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) return 'Enter a valid email address.';
    } else if (step === 'address') {
      if (!addressLine1.trim()) return 'Address line 1 is required.';
      if (!city.trim()) return 'City is required.';
      if (!country.trim()) return 'Country is required.';
      if (!postalCode.trim()) return 'Postal / ZIP code is required.';
    }
    return null;
  };

  const next = () => {
    const err = validate();
    if (err) { Alert.alert('Check the form', err); return; }
    const i = ORG_STEPS.indexOf(step);
    if (i < ORG_STEPS.length - 1) setStep(ORG_STEPS[i + 1]);
  };

  const back = () => {
    const i = ORG_STEPS.indexOf(step);
    if (i > 0) setStep(ORG_STEPS[i - 1]);
    else router.back();
  };

  const createOrg = async () => {
    setSaving(true);
    try {
      const payload: CreateOrganizationPayload = {
        name: name.trim(),
        slug: slug.trim(),
        businessType,
        phone,
        email,
        website: website.trim() || undefined,
        addressLine1,
        addressLine2: addressLine2.trim() || undefined,
        city,
        state: stateProv.trim() || undefined,
        country,
        postalCode,
        currency,
        timezone,
        dateFormat,
        language,
      };
      const org = await orgApi.create(payload);
      success();
      setCreatedOrgId(org.id);
      setStep('gym');
    } catch (e: any) {
      errorHaptic();
      Alert.alert('Error', e?.message || 'Failed to create organization.');
    } finally {
      setSaving(false);
    }
  };

  const finish = async (withGym: boolean) => {
    if (withGym && !gymName.trim()) {
      Alert.alert('Gym name required', 'Enter a name for your first gym, or skip for now.');
      return;
    }
    setSaving(true);
    try {
      if (withGym) {
        await gymApi.create({
          organizationId: createdOrgId,
          name: gymName.trim(),
          address: gymAddress.trim() || undefined,
          contactPhone: gymPhone.trim() || undefined,
        });
        success();
      }
      // Hand off to the lobby, which re-lists and auto-selects a single
      // org/gym straight into the workspace.
      router.replace('/(lobby)/organizations');
    } catch (e: any) {
      errorHaptic();
      Alert.alert('Error', e?.message || 'Failed to create gym.');
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: step === 'gym' ? 'Create First Gym' : 'Create Organization' }} />

        {/* Progress bar (org steps only) */}
        {step !== 'gym' && (
          <View style={[styles.progressRow, { paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}>
            {ORG_STEPS.map((s, i) => (
              <View
                key={s}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  marginHorizontal: 2,
                  backgroundColor: i <= orgStepIndex ? colors.primary : colors.border,
                }}
              />
            ))}
          </View>
        )}

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {step === 'info' && (
            <>
              <StepTitle title="About your organization" subtitle="Your brand's name and what kind of business it is." />
              <Field label="Organization Name" value={name} onChangeText={onNameChange} placeholder="e.g. FitLife Fitness" />
              <Field label="Workspace URL" value={slug} onChangeText={setSlug} placeholder="fitlife-fitness" autoCapitalize="none" prefix="gymflow.app/" />
              <Label>Business Type</Label>
              <Chips options={BUSINESS_TYPES.map((b) => ({ value: b.id, label: b.label }))} selected={businessType} onSelect={setBusinessType} />
            </>
          )}

          {step === 'contact' && (
            <>
              <StepTitle title="Contact details" subtitle="How members and GymFlow can reach your business." />
              <Field label="Phone Number" value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" />
              <Field label="Email Address" value={email} onChangeText={setEmail} placeholder="contact@yourbrand.com" keyboardType="email-address" autoCapitalize="none" />
              <Field label="Website (optional)" value={website} onChangeText={setWebsite} placeholder="https://yourbrand.com" autoCapitalize="none" />
            </>
          )}

          {step === 'address' && (
            <>
              <StepTitle title="Business address" subtitle="Your organization's registered location." />
              <Field label="Address Line 1" value={addressLine1} onChangeText={setAddressLine1} placeholder="100 MG Road" />
              <Field label="Address Line 2 (optional)" value={addressLine2} onChangeText={setAddressLine2} placeholder="Floor 3, Suite 12" />
              <Field label="City" value={city} onChangeText={setCity} placeholder="Bengaluru" />
              <Field label="State / Province" value={stateProv} onChangeText={setStateProv} placeholder="Karnataka" />
              <Field label="Country" value={country} onChangeText={setCountry} placeholder="India" />
              <Field label="Postal / ZIP Code" value={postalCode} onChangeText={setPostalCode} placeholder="560001" />
            </>
          )}

          {step === 'settings' && (
            <>
              <StepTitle title="Localization" subtitle="Defaults for currency, time and formatting." />
              <Label>Currency</Label>
              <Chips options={CURRENCIES.map((c) => ({ value: c, label: c }))} selected={currency} onSelect={setCurrency} />
              <Label>Timezone</Label>
              <Chips options={TIMEZONES.map((t) => ({ value: t.code, label: t.label }))} selected={timezone} onSelect={setTimezone} />
              <Label>Date Format</Label>
              <Chips options={DATE_FORMATS.map((d) => ({ value: d, label: d }))} selected={dateFormat} onSelect={setDateFormat} />
              <Label>Language</Label>
              <Chips options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))} selected={language} onSelect={setLanguage} />
            </>
          )}

          {step === 'review' && (
            <>
              <StepTitle title="Review & create" subtitle="Confirm the details below." />
              <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
                <View style={styles.reviewHeader}>
                  <View style={[styles.logo, { backgroundColor: colors.primary + '15', borderRadius: radius.md }]}>
                    <Building2 size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={{ fontSize: typography.sizes.title.fontSize, fontWeight: '800', color: colors.text }}>{name}</Text>
                    <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textSecondary }}>gymflow.app/{slug}</Text>
                  </View>
                </View>
                <ReviewRow label="Business Type" value={BUSINESS_TYPES.find((b) => b.id === businessType)?.label || '—'} />
                <ReviewRow label="Phone" value={phone} />
                <ReviewRow label="Email" value={email} />
                <ReviewRow label="Address" value={`${addressLine1}, ${city}${stateProv ? `, ${stateProv}` : ''}, ${country} ${postalCode}`} />
                <ReviewRow label="Currency" value={currency} />
                <ReviewRow label="Timezone" value={TIMEZONES.find((t) => t.code === timezone)?.label || timezone} />
              </View>
            </>
          )}

          {step === 'gym' && (
            <>
              <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
                <CheckCircle2 size={48} color={colors.success} />
                <Text style={{ fontSize: typography.sizes.title.fontSize, fontWeight: '800', color: colors.text, marginTop: spacing.sm }}>
                  Organization created
                </Text>
                <Text style={{ fontSize: typography.sizes.body.fontSize, color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>
                  Add your first gym branch, or skip and do it later.
                </Text>
              </View>
              <Field label="Gym Branch Name" value={gymName} onChangeText={setGymName} placeholder="e.g. Downtown Branch" />
              <Field label="Address (optional)" value={gymAddress} onChangeText={setGymAddress} placeholder="Branch address" />
              <Field label="Contact Phone (optional)" value={gymPhone} onChangeText={setGymPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" />
            </>
          )}
        </ScrollView>

        {/* Footer actions */}
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, padding: spacing.lg }]}>
          {step === 'gym' ? (
            <>
              <SecondaryButton label="Skip" onPress={() => finish(false)} style={{ flex: 1, marginRight: spacing.sm }} />
              <PrimaryButton label="Create Gym" onPress={() => finish(true)} loading={saving} style={{ flex: 2 }} />
            </>
          ) : (
            <>
              <SecondaryButton label={orgStepIndex === 0 ? 'Cancel' : 'Back'} onPress={back} style={{ flex: 1, marginRight: spacing.sm }} />
              {step === 'review' ? (
                <PrimaryButton label="Create Organization" onPress={createOrg} loading={saving} style={{ flex: 2 }} />
              ) : (
                <PrimaryButton label="Continue" onPress={next} icon={<ArrowRight size={18} color="#FFF" style={{ marginLeft: 8 }} />} style={{ flex: 2 }} />
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// --- small presentational helpers -----------------------------------------

function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={{ fontSize: typography.sizes.headline.fontSize, fontWeight: '800', color: colors.text }}>{title}</Text>
      <Text style={{ fontSize: typography.sizes.body.fontSize, color: colors.textSecondary, marginTop: 4 }}>{subtitle}</Text>
    </View>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  const { colors, spacing } = useTheme();
  return <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, marginTop: spacing.md }}>{children}</Text>;
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  prefix?: string;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Label>{props.label}</Label>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md }}>
        {props.prefix && <Text style={{ color: colors.textMuted, fontSize: 15 }}>{props.prefix}</Text>}
        <TextInput
          style={{ flex: 1, color: colors.text, paddingVertical: 14, fontSize: 15 }}
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={props.keyboardType}
          autoCapitalize={props.autoCapitalize}
        />
      </View>
    </View>
  );
}

function Chips({ options, selected, onSelect }: { options: { value: string; label: string }[]; selected: string; onSelect: (v: string) => void }) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const isSel = selected === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onSelect(o.value)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: radius.full,
              borderWidth: 1,
              backgroundColor: isSel ? colors.primary : colors.surface,
              borderColor: isSel ? colors.primary : colors.border,
            }}
          >
            <Text style={{ color: isSel ? '#FFF' : colors.text, fontWeight: '600', fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
      <Text style={{ fontSize: 12, color: colors.textMuted, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600', flex: 2, textAlign: 'right' }} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressRow: { flexDirection: 'row' },
  footer: { flexDirection: 'row', borderTopWidth: 1 },
  reviewCard: { borderWidth: 1, padding: 16 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  logo: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
