import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TextInput, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Tag, Calendar, DollarSign, FileText, CheckCircle, Percent } from 'lucide-react-native';

import { useTheme } from '../../../src/theme/theme';
import { useCreateMembershipPlan } from '../../../src/hooks/useMemberships';
import { Card } from '../../../src/components/Card';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { SecondaryButton } from '../../../src/components/SecondaryButton';
import { SectionHeader } from '../../../src/components/SectionHeader';

const CATEGORY_OPTIONS = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'Personal Training', 'Custom'];
const DURATION_TYPES = ['Days', 'Weeks', 'Months', 'Years'];

export default function CreatePlanScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const createPlanMutation = useCreateMembershipPlan();

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Monthly');
  const [durationType, setDurationType] = useState('Months');
  const [durationValue, setDurationValue] = useState('1');
  const [basePrice, setBasePrice] = useState('');
  const [joiningFee, setJoiningFee] = useState('0');
  const [taxPercentage, setTaxPercentage] = useState('18');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Plan name is required';
    if (!code.trim()) newErrors.code = 'Plan code is required';
    
    const val = Number(durationValue);
    if (isNaN(val) || val <= 0) {
      newErrors.durationValue = 'Duration must be a positive number';
    }

    const price = Number(basePrice);
    if (!basePrice.trim() || isNaN(price) || price < 0) {
      newErrors.basePrice = 'Base price must be 0 or greater';
    }

    const fee = Number(joiningFee);
    if (joiningFee.trim() && (isNaN(fee) || fee < 0)) {
      newErrors.joiningFee = 'Joining fee must be 0 or greater';
    }

    const tax = Number(taxPercentage);
    if (taxPercentage.trim() && (isNaN(tax) || tax < 0 || tax > 100)) {
      newErrors.taxPercentage = 'Tax percentage must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await createPlanMutation.mutateAsync({
        name,
        code: code.toUpperCase(),
        description: description.trim() || undefined,
        category,
        durationType,
        durationValue: Number(durationValue),
        basePrice: Number(basePrice),
        joiningFee: Number(joiningFee) || 0,
        taxPercentage: Number(taxPercentage) || 0,
        status: 'Active',
      });
      Alert.alert('Success', 'Membership plan created successfully.');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create membership plan');
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      <SectionHeader title="Basic Details" />
      <Card style={{ marginBottom: spacing.lg }}>
        {/* Name input */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.sizes.caption.fontSize }]}>
            PLAN NAME *
          </Text>
          <View style={[styles.inputContainer, { borderColor: errors.name ? colors.error : colors.border, borderRadius: radius.md, backgroundColor: colors.background }]}>
            <Tag size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. 3 Months Gold Plan"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
            />
          </View>
          {errors.name ? <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text> : null}
        </View>

        {/* Code input */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.sizes.caption.fontSize }]}>
            PLAN CODE *
          </Text>
          <View style={[styles.inputContainer, { borderColor: errors.code ? colors.error : colors.border, borderRadius: radius.md, backgroundColor: colors.background }]}>
            <Tag size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. GP3M"
              placeholderTextColor={colors.textMuted}
              value={code}
              autoCapitalize="characters"
              onChangeText={(text) => {
                setCode(text);
                if (errors.code) setErrors((prev) => ({ ...prev, code: '' }));
              }}
            />
          </View>
          {errors.code ? <Text style={[styles.errorText, { color: colors.error }]}>{errors.code}</Text> : null}
        </View>

        {/* Description input */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.sizes.caption.fontSize }]}>
            DESCRIPTION (OPTIONAL)
          </Text>
          <View style={[styles.inputContainer, { borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'flex-start', paddingTop: spacing.sm }]}>
            <FileText size={18} color={colors.textMuted} style={[styles.inputIcon, { marginTop: 2 }]} />
            <TextInput
              style={[styles.input, { color: colors.text, height: 60, textAlignVertical: 'top' }]}
              placeholder="Description of benefits, limits..."
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>
        </View>
      </Card>

      <SectionHeader title="Classification & Duration" />
      <Card style={{ marginBottom: spacing.lg }}>
        {/* Category selector */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.sizes.caption.fontSize }]}>
            CATEGORY
          </Text>
          <View style={styles.pillGrid}>
            {CATEGORY_OPTIONS.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.pill,
                  {
                    borderRadius: radius.full,
                    backgroundColor: category === cat ? colors.primaryLight : colors.background,
                    borderColor: category === cat ? colors.primary : colors.border,
                    borderWidth: 1.5,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                  },
                ]}
              >
                <Text style={{ color: category === cat ? colors.primary : colors.text, fontSize: 12, fontWeight: category === cat ? '700' : '500' }}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Duration inputs */}
        <View style={styles.row}>
          <View style={[styles.col, { marginRight: spacing.md }]}>
            <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.sizes.caption.fontSize }]}>
              DURATION TYPE
            </Text>
            <View style={styles.pillGridCompact}>
              {DURATION_TYPES.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setDurationType(type)}
                  style={[
                    styles.pillCompact,
                    {
                      borderRadius: radius.md,
                      backgroundColor: durationType === type ? colors.primary : colors.background,
                      borderColor: durationType === type ? colors.primary : colors.border,
                      borderWidth: 1,
                      paddingVertical: spacing.xs,
                      flex: 1,
                      alignItems: 'center',
                    },
                  ]}
                >
                  <Text style={{ color: durationType === type ? '#fff' : colors.text, fontSize: 11, fontWeight: '600' }}>
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ width: 80 }}>
            <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.sizes.caption.fontSize }]}>
              VALUE *
            </Text>
            <View style={[styles.inputContainer, { borderColor: errors.durationValue ? colors.error : colors.border, borderRadius: radius.md, backgroundColor: colors.background }]}>
              <TextInput
                style={[styles.input, { color: colors.text, textAlign: 'center' }]}
                keyboardType="number-pad"
                value={durationValue}
                onChangeText={(text) => {
                  setDurationValue(text);
                  if (errors.durationValue) setErrors((prev) => ({ ...prev, durationValue: '' }));
                }}
              />
            </View>
          </View>
        </View>
        {errors.durationValue ? <Text style={[styles.errorText, { color: colors.error }]}>{errors.durationValue}</Text> : null}
      </Card>

      <SectionHeader title="Pricing & Fees (INR)" />
      <Card style={{ marginBottom: spacing.xl }}>
        {/* Base Price */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.sizes.caption.fontSize }]}>
            BASE PRICE (EXCLUDING TAX) *
          </Text>
          <View style={[styles.inputContainer, { borderColor: errors.basePrice ? colors.error : colors.border, borderRadius: radius.md, backgroundColor: colors.background }]}>
            <DollarSign size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. 4999"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={basePrice}
              onChangeText={(text) => {
                setBasePrice(text);
                if (errors.basePrice) setErrors((prev) => ({ ...prev, basePrice: '' }));
              }}
            />
          </View>
          {errors.basePrice ? <Text style={[styles.errorText, { color: colors.error }]}>{errors.basePrice}</Text> : null}
        </View>

        <View style={styles.row}>
          {/* Joining fee */}
          <View style={[styles.col, { marginRight: spacing.md }]}>
            <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.sizes.caption.fontSize }]}>
              JOINING FEE
            </Text>
            <View style={[styles.inputContainer, { borderColor: errors.joiningFee ? colors.error : colors.border, borderRadius: radius.md, backgroundColor: colors.background }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={joiningFee}
                onChangeText={(text) => {
                  setJoiningFee(text);
                  if (errors.joiningFee) setErrors((prev) => ({ ...prev, joiningFee: '' }));
                }}
              />
            </View>
            {errors.joiningFee ? <Text style={[styles.errorText, { color: colors.error }]}>{errors.joiningFee}</Text> : null}
          </View>

          {/* Tax percentage */}
          <View style={{ width: 120 }}>
            <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.sizes.caption.fontSize }]}>
              TAX %
            </Text>
            <View style={[styles.inputContainer, { borderColor: errors.taxPercentage ? colors.error : colors.border, borderRadius: radius.md, backgroundColor: colors.background }]}>
              <Percent size={14} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="18"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={taxPercentage}
                onChangeText={(text) => {
                  setTaxPercentage(text);
                  if (errors.taxPercentage) setErrors((prev) => ({ ...prev, taxPercentage: '' }));
                }}
              />
            </View>
            {errors.taxPercentage ? <Text style={[styles.errorText, { color: colors.error }]}>{errors.taxPercentage}</Text> : null}
          </View>
        </View>
      </Card>

      {/* Buttons */}
      <View style={styles.buttons}>
        <SecondaryButton
          label="Cancel"
          onPress={() => router.back()}
          style={{ flex: 1 }}
        />
        <PrimaryButton
          label="Create Plan"
          onPress={handleSubmit}
          style={{ flex: 2 }}
          loading={createPlanMutation.isPending}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    padding: 0,
  },
  errorText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  col: {
    flex: 1,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillGridCompact: {
    flexDirection: 'row',
    gap: 4,
  },
  pillCompact: {
    justifyContent: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
