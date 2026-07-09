import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { Check, Phone, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react-native';

import { useTheme } from '../../../src/theme/theme';
import { useWorkspace } from '../../../src/providers/WorkspaceProvider';
import { saveDraft, loadDraft, clearDraft } from '../../../src/lib/offlineQueue';
import { membersApi, gymApi, rolesApi, ApiError } from '../../../src/lib/api';
import { memberKeys } from '../../../src/hooks/useMembers';
import { queryClient } from '../../../src/lib/queryClient';

import {
  FormTextField,
  FormStepIndicator,
  FormDateField,
  FormDropdownField,
  FormPhoneField,
  FormSectionTitle,
} from '../../../src/components/members/MemberFormFields';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { SecondaryButton } from '../../../src/components/SecondaryButton';

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

const STEPS = ['Phone', 'Personal', 'Contact', 'Gym', 'Fitness', 'Review'];

// When a global profile is found, we skip Personal + Contact, going Phone → Gym
const GLOBAL_STEPS = ['Phone', 'Gym', 'Fitness', 'Review'];

// ---------------------------------------------------------------------------
// Form shape — mirrors the web create wizard fields
// ---------------------------------------------------------------------------
interface FormValues {
  // Step 0 – Phone
  phoneNumber: string;

  // Step 1 – Personal (Basic Info)
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  email: string;
  maritalStatus: string;
  occupation: string;

  // Step 2 – Contact
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  state: string;
  postalCode: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelationship: string;

  // Step 3 – Gym Assignment
  homeGymId: string;
  counselor: string;
  trainerId: string;
  dietitianId: string;
  source: string;

  // Step 4 – Fitness
  height: string;
  weight: string;
  fitnessGoal: string;
  medicalConditions: string;
  allergies: string;
  fitnessNotes: string;
}

const DEFAULT_VALUES: FormValues = {
  phoneNumber: '', firstName: '', lastName: '', gender: 'Male', dob: '',
  email: '', maritalStatus: 'Single', occupation: '',
  addressLine1: '', addressLine2: '', city: '', district: '', state: '', postalCode: '',
  emergencyName: '', emergencyPhone: '', emergencyRelationship: '',
  homeGymId: '', counselor: '', trainerId: '', dietitianId: '', source: 'Walk-In',
  height: '', weight: '', fitnessGoal: 'General Fitness',
  medicalConditions: '', allergies: '', fitnessNotes: '',
};

// ---------------------------------------------------------------------------
// Helper: age from DOB string
// ---------------------------------------------------------------------------
function calcAge(dob: string): string {
  if (!dob) return '';
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age >= 0 ? String(age) : '';
}

// ---------------------------------------------------------------------------
// Main screen component
// ---------------------------------------------------------------------------
export default function CreateMemberScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();
  const { gymId, organizationId } = useWorkspace();

  // --- Wizard step state ---
  const [currentStep, setCurrentStep] = useState(0);
  const [isGlobalFound, setIsGlobalFound] = useState(false);

  // --- Phone / OTP state ---
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // --- Reference data ---
  const [branches, setBranches] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoadingRef, setIsLoadingRef] = useState(false);

  // --- Submission ---
  const [isSaving, setIsSaving] = useState(false);
  const [savedMemberId, setSavedMemberId] = useState<string | null>(null);

  // --- Toast ---
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // --- react-hook-form ---
  const { control, handleSubmit, watch, getValues, setValue, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) reset(draft as FormValues);
  }, [reset]);

  // Auto-save draft
  useEffect(() => {
    const sub = watch((value) => saveDraft(value));
    return () => sub.unsubscribe();
  }, [watch]);

  // Load branches + staff after mount
  useEffect(() => {
    const load = async () => {
      setIsLoadingRef(true);
      try {
        const [branchList, employeeList] = await Promise.all([
          organizationId ? gymApi.list(organizationId) : Promise.resolve([]),
          rolesApi.getEmployees(),
        ]);
        setBranches(branchList || []);
        setStaff(employeeList || []);

        // Pre-select current active gym branch
        if (gymId && branchList?.length > 0) {
          const match = branchList.find((b: any) => b.id === gymId);
          if (match) setValue('homeGymId', match.id);
          else if (branchList.length > 0) setValue('homeGymId', branchList[0].id);
        }
      } catch (err) {
        console.warn('Failed to load branches/staff', err);
      } finally {
        setIsLoadingRef(false);
      }
    };
    load();
  }, [organizationId, gymId, setValue]);

  // ---------------------------------------------------------------------------
  // Computed: active steps based on global found flag
  // ---------------------------------------------------------------------------
  const activeSteps = isGlobalFound ? GLOBAL_STEPS : STEPS;

  // Map logical wizard step index to domain step labels
  const stepLabel = activeSteps[currentStep] ?? '';

  // ---------------------------------------------------------------------------
  // Phone: send OTP
  // ---------------------------------------------------------------------------
  const handleSendOtp = async () => {
    const phone = getValues('phoneNumber').trim();
    if (!phone || phone.length < 5) {
      showToast('Enter a valid phone number first', 'error');
      return;
    }
    try {
      setOtpSending(true);
      const res = await membersApi.sendPhoneOtp(phone);
      setOtpSent(true);
      setOtpVerified(false);
      setOtpCode('');
      setDevOtpHint(res.devOtp || null);
      showToast(res.devOtp ? `Code sent! Dev preview: ${res.devOtp}` : 'Verification code sent', 'success');
    } catch (err) {
      showToast('Failed to send verification code', 'error');
    } finally {
      setOtpSending(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Phone: verify OTP
  // ---------------------------------------------------------------------------
  const handleVerifyOtp = async () => {
    const phone = getValues('phoneNumber').trim();
    if (!otpCode.trim()) {
      showToast('Enter the code you received', 'error');
      return;
    }
    try {
      setOtpSending(true);
      await membersApi.verifyPhoneOtp(phone, otpCode.trim());
      setOtpVerified(true);
      setDevOtpHint(null);
      showToast('Phone number verified!', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Incorrect or expired code';
      showToast(msg, 'error');
    } finally {
      setOtpSending(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Phone step "Continue": lookup global profile, then advance
  // ---------------------------------------------------------------------------
  const handlePhoneContinue = async () => {
    const phone = getValues('phoneNumber').trim();
    if (!phone || phone.length < 5) {
      showToast('Enter a valid phone number', 'error');
      return;
    }
    try {
      setIsLookingUp(true);
      const globalProfile = await membersApi.lookupGlobal(phone);

      if (globalProfile) {
        setIsGlobalFound(true);
        // Pre-fill form with global data
        const ai = globalProfile.aiInsights || {};
        setValue('firstName', globalProfile.firstName || '');
        setValue('lastName', globalProfile.lastName || '');
        setValue('gender', globalProfile.gender || 'Male');
        setValue('dob', globalProfile.dob ? globalProfile.dob.split('T')[0] : '');
        setValue('email', ai.email || '');
        setValue('maritalStatus', ai.maritalStatus || 'Single');
        setValue('occupation', ai.occupation || '');
        setValue('addressLine1', ai.addressLine1 || '');
        setValue('addressLine2', ai.addressLine2 || '');
        setValue('city', ai.city || '');
        setValue('district', ai.district || '');
        setValue('state', ai.state || '');
        setValue('postalCode', ai.postalCode || '');
        setValue('emergencyName', ai.emergencyName || '');
        setValue('emergencyPhone', ai.emergencyPhone || '');
        setValue('emergencyRelationship', ai.emergencyRelationship || '');
        setValue('source', ai.source || 'Walk-In');
        setValue('fitnessGoal', ai.fitnessGoal || 'General Fitness');
        setValue('medicalConditions', ai.medicalConditions || '');
        setValue('allergies', ai.allergies || '');
        setValue('fitnessNotes', ai.fitnessNotes || '');

        showToast(`Profile found for ${globalProfile.firstName}! Pre-filled details.`, 'success');
        // In global mode: Phone → Gym (skip Personal & Contact)
        setCurrentStep(1); // step 1 in GLOBAL_STEPS = 'Gym'
      } else {
        setIsGlobalFound(false);
        showToast('No existing profile. Enter details manually.', 'success');
        setCurrentStep(1); // step 1 in STEPS = 'Personal'
      }
    } catch (err) {
      // Even on error, allow manual entry
      setIsGlobalFound(false);
      setCurrentStep(1);
    } finally {
      setIsLookingUp(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Step validation
  // ---------------------------------------------------------------------------
  const validateCurrentStep = (): boolean => {
    const v = getValues();
    const label = stepLabel;

    if (label === 'Personal') {
      if (!v.firstName.trim()) { showToast('First Name is required', 'error'); return false; }
      if (!v.dob) { showToast('Date of Birth is required', 'error'); return false; }
    }
    if (label === 'Gym') {
      if (!v.homeGymId) { showToast('Please select a Home Gym branch', 'error'); return false; }
    }
    return true;
  };

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setCurrentStep(s => Math.min(s + 1, activeSteps.length - 1));
  };

  const handleBack = () => {
    if (currentStep === 0) {
      router.back();
      return;
    }
    setCurrentStep(s => Math.max(0, s - 1));
  };

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  const handleFinalSubmit = async () => {
    const v = getValues();
    if (!v.homeGymId) {
      showToast('Home Gym assignment is required', 'error');
      return;
    }

    try {
      setIsSaving(true);

      const matchedTrainer = staff.find((s: any) => s.id === v.trainerId);
      const matchedDietitian = staff.find((s: any) => s.id === v.dietitianId);

      const payload = {
        homeGymId: v.homeGymId,
        firstName: v.firstName,
        lastName: v.lastName,
        phoneNumber: v.phoneNumber,
        dob: v.dob || undefined,
        gender: v.gender || undefined,
        aiInsights: {
          email: v.email || undefined,
          maritalStatus: v.maritalStatus || undefined,
          occupation: v.occupation || undefined,
          addressLine1: v.addressLine1 || undefined,
          addressLine2: v.addressLine2 || undefined,
          city: v.city || undefined,
          district: v.district || undefined,
          state: v.state || undefined,
          postalCode: v.postalCode || undefined,
          emergencyName: v.emergencyName || undefined,
          emergencyPhone: v.emergencyPhone || undefined,
          emergencyRelationship: v.emergencyRelationship || undefined,
          counselor: v.counselor || undefined,
          trainerId: v.trainerId || undefined,
          assignedTrainerName: matchedTrainer ? matchedTrainer.name : undefined,
          dietitianId: v.dietitianId || undefined,
          assignedDietitianName: matchedDietitian ? matchedDietitian.name : undefined,
          source: v.source || 'Walk-In',
          fitnessGoal: v.fitnessGoal || undefined,
          medicalConditions: v.medicalConditions || undefined,
          allergies: v.allergies || undefined,
          fitnessNotes: v.fitnessNotes || undefined,
          height: v.height || undefined,
          weight: v.weight || undefined,
          onboardingCompleted: true,
        },
      };

      const result = await membersApi.create(payload);
      const newId = result.id;
      setSavedMemberId(newId);

      // Record measurements if provided
      if (v.height || v.weight) {
        try {
          await membersApi.addMeasurement(newId, {
            height: v.height ? parseFloat(v.height) : undefined,
            weight: v.weight ? parseFloat(v.weight) : undefined,
          });
        } catch (e) {
          console.warn('Measurement save failed', e);
        }
      }

      clearDraft();
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
      showToast('Member created successfully!', 'success');

      // Navigate away after a short delay so the user sees the success toast
      setTimeout(() => router.back(), 1200);
    } catch (err: any) {
      const msg = err?.message || 'Failed to create member. Please try again.';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render each step content
  // ---------------------------------------------------------------------------
  const renderPhoneStep = () => (
    <View>
      <FormSectionTitle
        title="Mobile Verification"
        subtitle="We'll check if this member already has a profile. Enter their phone number to begin."
      />

      <FormPhoneField
        name="phoneNumber"
        label="Phone Number"
        control={control}
        errors={errors}
        required
      />

      {/* OTP section */}
      <View style={[styles.otpRow, { gap: spacing.sm }]}>
        {otpVerified ? (
          <View style={[styles.verifiedBadge, { backgroundColor: colors.success + '15', borderColor: colors.success + '40', borderRadius: radius.md }]}>
            <Check size={14} color={colors.success} />
            <Text style={{ color: colors.success, fontSize: typography.sizes.caption.fontSize, fontWeight: '700', marginLeft: 4 }}>
              Verified
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={handleSendOtp}
            disabled={otpSending}
            style={({ pressed }) => [
              styles.otpButton,
              {
                backgroundColor: pressed ? colors.border : colors.surfaceElevated,
                borderColor: colors.border,
                borderRadius: radius.md,
                opacity: otpSending ? 0.5 : 1,
              },
            ]}
          >
            {otpSending && !otpSent
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Text style={{ color: colors.text, fontSize: typography.sizes.caption.fontSize, fontWeight: '600' }}>
                  {otpSent ? 'Resend Code' : 'Send Code (Optional)'}
                </Text>
            }
          </Pressable>
        )}
      </View>

      {otpSent && !otpVerified && (
        <View style={{ marginTop: spacing.md }}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.caption.fontSize, fontWeight: '600', marginBottom: spacing.xs }}>
            Verification Code
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TextInput
              value={otpCode}
              onChangeText={t => setOtpCode(t.replace(/\D/g, ''))}
              placeholder="6-digit code"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={6}
              style={[
                styles.otpInput,
                {
                  flex: 1,
                  color: colors.text,
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  fontSize: typography.sizes.body.fontSize,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.md,
                  letterSpacing: 4,
                },
              ]}
            />
            <Pressable
              onPress={handleVerifyOtp}
              disabled={otpSending || otpCode.length < 4}
              style={({ pressed }) => [
                styles.otpButton,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.lg,
                  opacity: (otpSending || otpCode.length < 4) ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              {otpSending
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={{ color: '#FFF', fontSize: typography.sizes.caption.fontSize, fontWeight: '700' }}>
                    Verify
                  </Text>
              }
            </Pressable>
          </View>
          {devOtpHint && (
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 6 }}>
              Dev preview code: <Text style={{ fontWeight: '700', color: colors.text }}>{devOtpHint}</Text>
            </Text>
          )}
        </View>
      )}

      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: spacing.md, lineHeight: 16 }}>
        Phone verification is optional but recommended. Tap "Continue" to look up this number across all gyms.
      </Text>
    </View>
  );

  const watchDob = watch('dob');
  const age = calcAge(watchDob);

  const renderPersonalStep = () => (
    <View>
      <FormSectionTitle
        title="Basic Information"
        subtitle="Personal details of the new member."
      />
      <FormTextField name="firstName" label="First Name" control={control} errors={errors} required />
      <FormTextField name="lastName" label="Last Name" control={control} errors={errors} />
      <FormDateField name="dob" label="Date of Birth" control={control} errors={errors} required placeholder="Select Date of Birth" />
      {age !== '' && (
        <View style={[styles.ageBadge, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30', borderRadius: radius.md, marginBottom: spacing.lg }]}>
          <Text style={{ color: colors.primary, fontSize: typography.sizes.caption.fontSize, fontWeight: '600' }}>
            Age: {age} years old
          </Text>
        </View>
      )}
      <FormDropdownField
        name="gender"
        label="Gender"
        control={control}
        errors={errors}
        placeholder="Select Gender"
        options={[
          { label: 'Male', value: 'Male' },
          { label: 'Female', value: 'Female' },
          { label: 'Other', value: 'Other' },
        ]}
      />
      <FormDropdownField
        name="maritalStatus"
        label="Marital Status"
        control={control}
        errors={errors}
        placeholder="Select Marital Status"
        options={[
          { label: 'Single', value: 'Single' },
          { label: 'Married', value: 'Married' },
          { label: 'Divorced', value: 'Divorced' },
          { label: 'Widowed', value: 'Widowed' },
        ]}
      />
      <FormTextField name="email" label="Email Address" control={control} errors={errors} keyboardType="email-address" autoCapitalize="none" />
      <FormTextField name="occupation" label="Occupation" control={control} errors={errors} placeholder="e.g. Software Engineer" />
    </View>
  );

  const renderContactStep = () => (
    <View>
      <FormSectionTitle title="Address" subtitle="Where does this member live?" />
      <FormTextField name="addressLine1" label="Address Line 1" control={control} errors={errors} />
      <FormTextField name="addressLine2" label="Address Line 2" control={control} errors={errors} />
      <FormTextField name="city" label="City" control={control} errors={errors} />
      <FormTextField name="district" label="District" control={control} errors={errors} />
      <FormTextField name="state" label="State / Region" control={control} errors={errors} />
      <FormTextField name="postalCode" label="Postal / ZIP Code" control={control} errors={errors} keyboardType="numeric" />

      <FormSectionTitle title="Emergency Contact" subtitle="Notify this person in case of emergency." />
      <FormTextField name="emergencyName" label="Emergency Contact Name" control={control} errors={errors} />
      <FormPhoneField name="emergencyPhone" label="Emergency Phone" control={control} errors={errors} />
      <FormTextField name="emergencyRelationship" label="Relationship" control={control} errors={errors} placeholder="e.g. Spouse, Parent" />
    </View>
  );

  const renderGymStep = () => (
    <View>
      <FormSectionTitle title="Gym & Coach Assignment" subtitle="Assign a home branch and coaching staff." />

      {isLoadingRef ? (
        <View style={{ alignItems: 'center', padding: spacing.xl }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.textMuted, marginTop: spacing.sm, fontSize: typography.sizes.caption.fontSize }}>
            Loading branch data...
          </Text>
        </View>
      ) : (
        <>
          <FormDropdownField
            name="homeGymId"
            label="Home Gym Branch"
            control={control}
            errors={errors}
            required
            placeholder="Select Branch"
            options={branches.map((b: any) => ({ label: b.name, value: b.id }))}
          />

          <FormTextField name="counselor" label="Membership Counselor" control={control} errors={errors} placeholder="e.g. Sales Agent Name" />

          <FormDropdownField
            name="trainerId"
            label="Assigned Personal Trainer"
            control={control}
            errors={errors}
            placeholder="No Coach Assigned"
            options={[
              { label: 'No Coach Assigned', value: '' },
              ...staff.map((s: any) => ({ label: `${s.name}${s.role ? ` (${s.role})` : ''}`, value: s.id })),
            ]}
          />

          <FormDropdownField
            name="dietitianId"
            label="Assigned Dietitian"
            control={control}
            errors={errors}
            placeholder="No Dietitian Assigned"
            options={[
              { label: 'No Dietitian Assigned', value: '' },
              ...staff.map((s: any) => ({ label: `${s.name}${s.role ? ` (${s.role})` : ''}`, value: s.id })),
            ]}
          />

          <FormDropdownField
            name="source"
            label="Referral Source"
            control={control}
            errors={errors}
            placeholder="Select Source"
            options={[
              { label: 'Walk-In', value: 'Walk-In' },
              { label: 'Referral', value: 'Referral' },
              { label: 'Instagram', value: 'Instagram' },
              { label: 'Facebook', value: 'Facebook' },
              { label: 'Google', value: 'Google' },
              { label: 'Website', value: 'Website' },
            ]}
          />
        </>
      )}
    </View>
  );

  const renderFitnessStep = () => (
    <View>
      <FormSectionTitle title="Fitness & Health" subtitle="Physical stats, goals, and medical notes." />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <FormTextField name="height" label="Height (cm)" control={control} errors={errors} keyboardType="numeric" placeholder="e.g. 175" />
        </View>
        <View style={{ flex: 1 }}>
          <FormTextField name="weight" label="Weight (kg)" control={control} errors={errors} keyboardType="numeric" placeholder="e.g. 70" />
        </View>
      </View>
      <FormDropdownField
        name="fitnessGoal"
        label="Primary Fitness Goal"
        control={control}
        errors={errors}
        placeholder="Select Goal"
        options={[
          { label: 'Weight Loss', value: 'Weight Loss' },
          { label: 'Muscle Gain', value: 'Muscle Gain' },
          { label: 'General Fitness', value: 'General Fitness' },
          { label: 'Athletic Performance', value: 'Athletic Performance' },
          { label: 'Rehabilitation', value: 'Rehabilitation' },
        ]}
      />
      <FormTextField name="medicalConditions" label="Medical Conditions" control={control} errors={errors} placeholder="e.g. Hypertension, Asthma" />
      <FormTextField name="allergies" label="Allergies" control={control} errors={errors} placeholder="e.g. Latex, Penicillin" />
      <FormTextField name="fitnessNotes" label="Fitness Notes / Preferences" control={control} errors={errors} multiline placeholder="Any additional health notes..." />
    </View>
  );

  const renderReviewStep = () => {
    const v = getValues();
    const branchName = branches.find((b: any) => b.id === v.homeGymId)?.name || 'Not selected';
    const trainerName = staff.find((s: any) => s.id === v.trainerId)?.name;
    const dietName = staff.find((s: any) => s.id === v.dietitianId)?.name;

    const ReviewRow = ({ label, value }: { label: string; value?: string }) => {
      if (!value) return null;
      return (
        <View style={[styles.reviewRow, { borderBottomColor: colors.border }]}>
          <Text style={{ color: colors.textMuted, fontSize: typography.sizes.caption.fontSize, flex: 1 }}>
            {label}
          </Text>
          <Text style={{ color: colors.text, fontSize: typography.sizes.caption.fontSize, fontWeight: '600', flex: 2, textAlign: 'right' }}>
            {value}
          </Text>
        </View>
      );
    };

    const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
      <View style={[styles.reviewSection, { backgroundColor: colors.surfaceElevated, borderRadius: radius.md, borderColor: colors.border, marginBottom: spacing.md }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, padding: spacing.md, paddingBottom: 0 }}>
          {title}
        </Text>
        <View style={{ padding: spacing.md, paddingTop: spacing.sm }}>
          {children}
        </View>
      </View>
    );

    return (
      <View>
        <FormSectionTitle title="Review & Confirm" subtitle="Review the details before creating the member profile." />

        <Section title="Personal">
          <ReviewRow label="Name" value={[v.firstName, v.lastName].filter(Boolean).join(' ')} />
          <ReviewRow label="Phone" value={v.phoneNumber} />
          <ReviewRow label="Date of Birth" value={v.dob ? `${v.dob} (Age ${calcAge(v.dob)})` : undefined} />
          <ReviewRow label="Gender" value={v.gender} />
          <ReviewRow label="Email" value={v.email} />
          <ReviewRow label="Marital Status" value={v.maritalStatus} />
          <ReviewRow label="Occupation" value={v.occupation} />
        </Section>

        {(v.addressLine1 || v.city) && (
          <Section title="Contact">
            <ReviewRow label="Address" value={[v.addressLine1, v.addressLine2, v.city, v.state].filter(Boolean).join(', ')} />
            <ReviewRow label="Emergency Contact" value={v.emergencyName ? `${v.emergencyName} (${v.emergencyRelationship || 'contact'})` : undefined} />
          </Section>
        )}

        <Section title="Gym Assignment">
          <ReviewRow label="Home Gym" value={branchName} />
          <ReviewRow label="Counselor" value={v.counselor} />
          <ReviewRow label="Trainer" value={trainerName} />
          <ReviewRow label="Dietitian" value={dietName} />
          <ReviewRow label="Referral Source" value={v.source} />
        </Section>

        {(v.height || v.weight || v.fitnessGoal) && (
          <Section title="Fitness">
            {v.height && <ReviewRow label="Height" value={`${v.height} cm`} />}
            {v.weight && <ReviewRow label="Weight" value={`${v.weight} kg`} />}
            <ReviewRow label="Fitness Goal" value={v.fitnessGoal} />
            <ReviewRow label="Medical Conditions" value={v.medicalConditions} />
            <ReviewRow label="Allergies" value={v.allergies} />
          </Section>
        )}
      </View>
    );
  };

  // ---------------------------------------------------------------------------
  // Route step label → renderer
  // ---------------------------------------------------------------------------
  const renderStepContent = () => {
    switch (stepLabel) {
      case 'Phone':    return renderPhoneStep();
      case 'Personal': return renderPersonalStep();
      case 'Contact':  return renderContactStep();
      case 'Gym':      return renderGymStep();
      case 'Fitness':  return renderFitnessStep();
      case 'Review':   return renderReviewStep();
      default:         return null;
    }
  };

  // Last step depends on the active steps array
  const isLastStep = currentStep === activeSteps.length - 1;
  const isPhoneStep = stepLabel === 'Phone';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Step indicator */}
        <FormStepIndicator steps={activeSteps} current={currentStep} />

        {/* Content */}
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStepContent()}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, {
          padding: spacing.lg,
          paddingBottom: spacing.xl,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        }]}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {currentStep > 0 && (
              <SecondaryButton
                label="Back"
                onPress={handleBack}
                style={{ flex: 1 }}
                disabled={isSaving}
              />
            )}

            {isPhoneStep ? (
              <PrimaryButton
                label={isLookingUp ? 'Checking...' : 'Continue'}
                onPress={handlePhoneContinue}
                style={{ flex: currentStep > 0 ? 2 : 1 }}
                loading={isLookingUp}
                disabled={isLookingUp}
              />
            ) : isLastStep ? (
              <PrimaryButton
                label={isSaving ? 'Saving...' : 'Create Member'}
                onPress={handleFinalSubmit}
                style={{ flex: currentStep > 0 ? 2 : 1 }}
                loading={isSaving}
                disabled={isSaving}
              />
            ) : (
              <PrimaryButton
                label="Next"
                onPress={handleNext}
                style={{ flex: currentStep > 0 ? 2 : 1 }}
              />
            )}
          </View>
        </View>

        {/* Toast notification */}
        {toast && (
          <View style={[
            styles.toast,
            {
              backgroundColor: toast.type === 'success' ? colors.success : colors.error,
              borderRadius: radius.md,
              marginHorizontal: spacing.lg,
            },
          ]}>
            <Text style={{ color: '#FFF', fontSize: typography.sizes.caption.fontSize, fontWeight: '600' }}>
              {toast.message}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  footer: {},
  otpRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  otpButton: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  otpInput: {
    borderWidth: 1,
    minHeight: 48,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  ageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  reviewSection: {
    borderWidth: 1,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
});
