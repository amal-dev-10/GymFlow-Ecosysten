import React, { forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { X, Check } from 'lucide-react-native';
import { BottomSheet, BottomSheetRef } from '../BottomSheet';
import { PrimaryButton } from '../PrimaryButton';
import { SecondaryButton } from '../SecondaryButton';
import { useTheme } from '../../theme/theme';
import { useHaptics } from '../../hooks/useHaptics';

export interface MemberFilters {
  status: string;
  gender: string;
  sortBy: string;
}

const EMPTY_FILTERS: MemberFilters = { status: '', gender: '', sortBy: '' };

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Expired', value: 'expired' },
  { label: 'Frozen', value: 'frozen' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Payment Due', value: 'payment_due' },
];

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Expiry', value: 'expiry' },
  { label: 'Name (A-Z)', value: 'name_asc' },
  { label: 'Name (Z-A)', value: 'name_desc' },
];

export interface MemberFilterSheetRef {
  show: () => void;
  hide: () => void;
}

interface Props {
  filters: MemberFilters;
  onApply: (filters: MemberFilters) => void;
}

export const MemberFilterSheet = forwardRef<MemberFilterSheetRef, Props>(
  ({ filters, onApply }, ref) => {
    const { colors, typography, spacing, radius } = useTheme();
    const { lightImpact } = useHaptics();
    const sheetRef = React.useRef<BottomSheetRef>(null);
    const [local, setLocal] = useState<MemberFilters>(filters);

    useImperativeHandle(ref, () => ({
      show: () => {
        setLocal(filters);
        sheetRef.current?.show();
      },
      hide: () => sheetRef.current?.hide(),
    }));

    const toggle = useCallback(
      (key: keyof MemberFilters, value: string) => {
        lightImpact();
        setLocal((prev) => ({
          ...prev,
          [key]: prev[key] === value ? '' : value,
        }));
      },
      [lightImpact],
    );

    const handleApply = () => {
      onApply(local);
      sheetRef.current?.hide();
    };

    const handleClear = () => {
      setLocal(EMPTY_FILTERS);
      onApply(EMPTY_FILTERS);
      sheetRef.current?.hide();
    };

    const activeCount = Object.values(local).filter(Boolean).length;

    const renderChips = (
      label: string,
      options: { label: string; value: string }[],
      key: keyof MemberFilters,
    ) => (
      <View style={[styles.section, { marginBottom: spacing.lg }]}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.textSecondary,
              fontSize: typography.sizes.overline.fontSize,
              fontWeight: '600',
              letterSpacing: 0.8,
              marginBottom: spacing.sm,
            },
          ]}
        >
          {label.toUpperCase()}
        </Text>
        <View style={styles.chips}>
          {options.map((opt) => {
            const isActive = local[key] === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => toggle(key, opt.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${opt.label} filter`}
                style={[
                  styles.chip,
                  {
                    borderRadius: radius.full,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs + 2,
                    backgroundColor: isActive ? colors.primaryLight : colors.surfaceElevated,
                    borderWidth: 1,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
              >
                {isActive && (
                  <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)}>
                    <Check size={12} color={colors.primary} style={{ marginRight: 4 }} />
                  </Animated.View>
                )}
                <Text
                  style={{
                    color: isActive ? colors.primary : colors.text,
                    fontSize: typography.sizes.caption.fontSize,
                    fontWeight: isActive ? '600' : '400',
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );

    return (
      <BottomSheet ref={sheetRef} snapPoints={[460, 580]}>
        <View style={{ flex: 1 }}>
          <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingBottom: spacing.md }]}>
            <Text
              style={{
                color: colors.text,
                fontSize: typography.sizes.title.fontSize,
                fontWeight: typography.sizes.title.fontWeight,
              }}
            >
              Filters
            </Text>
            {activeCount > 0 && (
              <Pressable onPress={handleClear} accessibilityLabel="Clear all filters">
                <Text style={{ color: colors.error, fontSize: typography.sizes.caption.fontSize, fontWeight: '600' }}>
                  Clear All
                </Text>
              </Pressable>
            )}
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}
            showsVerticalScrollIndicator={false}
          >
            {renderChips('Status', STATUS_OPTIONS, 'status')}
            {renderChips('Gender', GENDER_OPTIONS, 'gender')}
            {renderChips('Sort By', SORT_OPTIONS, 'sortBy')}
          </ScrollView>

          <View style={[styles.footer, { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            <PrimaryButton
              label={activeCount > 0 ? `Apply (${activeCount})` : 'Apply'}
              onPress={handleApply}
            />
          </View>
        </View>
      </BottomSheet>
    );
  },
);

MemberFilterSheet.displayName = 'MemberFilterSheet';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  body: {
    flex: 1,
  },
  section: {},
  sectionTitle: {
    textTransform: 'uppercase',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    width: '100%',
  },
});
