import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';

import { useTheme } from '@/theme/theme';
import { useMember, useUpdateMember } from '@/hooks/useMembers';
import { FormTextField, FormDateField, FormDropdownField, FormPhoneField } from '@/components/members/MemberFormFields';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { ErrorState } from '@/components/ErrorState';
import { SkeletonLoader } from '@/components/SkeletonLoader';

interface FormValues {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  dob: string;
  gender: string;
}

export default function EditMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const router = useRouter();

  const { data: member, isLoading, isError, refetch } = useMember(id as string);
  const { mutate: updateMember, isPending } = useUpdateMember();
  const [hasChanges, setHasChanges] = useState(false);

  const { control, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<FormValues>({
    defaultValues: {
      firstName: '', lastName: '', phoneNumber: '', email: '', dob: '', gender: ''
    }
  });

  useEffect(() => {
    if (member) {
      reset({
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        phoneNumber: member.phoneNumber || '',
        email: member.email || '',
        dob: member.dob || '',
        gender: member.gender || '',
      });
    }
  }, [member, reset]);

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      setHasChanges(isDirty);
    });
    return () => subscription.unsubscribe();
  }, [watch, isDirty]);

  const onSubmit = (data: FormValues) => {
    updateMember({
      id: id as string,
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        email: data.email || undefined,
        dob: data.dob || undefined,
        gender: data.gender || undefined,
      }
    }, {
      onSuccess: () => {
        router.back();
      }
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.xl }]}>
        <SkeletonLoader width="100%" height={48} style={{ marginBottom: spacing.md }} />
        <SkeletonLoader width="100%" height={48} style={{ marginBottom: spacing.md }} />
        <SkeletonLoader width="100%" height={48} />
      </View>
    );
  }

  if (isError || !member) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState message="Failed to load member data." onRetry={refetch} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
          <FormTextField name="firstName" label="First Name" control={control} errors={errors} required />
          <FormTextField name="lastName" label="Last Name" control={control} errors={errors} required />
          <FormPhoneField name="phoneNumber" label="Phone Number" control={control} errors={errors} required />
          <FormTextField name="email" label="Email Address" control={control} errors={errors} keyboardType="email-address" autoCapitalize="none" />
          <FormDateField name="dob" label="Date of Birth" control={control} errors={errors} placeholder="Select Date of Birth" />
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
        </ScrollView>

        <View style={[styles.footer, { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <SecondaryButton
              label="Cancel"
              onPress={() => router.back()}
              style={{ flex: 1 }}
              disabled={isPending}
            />
            <PrimaryButton
              label="Save Changes"
              onPress={handleSubmit(onSubmit)}
              style={{ flex: 2 }}
              loading={isPending}
              disabled={!hasChanges}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  footer: {},
});
