import React, { forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { Check, UserCheck, Clock, Snowflake, XCircle, AlertTriangle, ArrowUpDown, ArrowDownUp, Calendar, SortAsc, SortDesc, CircleSlash } from 'lucide-react-native';
import { BottomSheet, BottomSheetRef } from '../BottomSheet';
import { PrimaryButton } from '../PrimaryButton';
import { SecondaryButton } from '../SecondaryButton';
import { useTheme } from '../../theme/theme';
import { useHaptics } from '../../hooks/useHaptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface MemberFilters {
  status: string;
  gender: string;
  sortBy: string;
}

const EMPTY_FILTERS: MemberFilters = { status: '', gender: '', sortBy: '' };

const STATUS_OPTIONS: { label: string; value: string; icon: any; color: string }[] = [
  { label: 'Active', value: 'active', icon: UserCheck, color: '#22C55E' },
  { label: 'Expired', value: 'expired', icon: Clock, color: '#EF4444' },
  { label: 'Frozen', value: 'frozen', icon: Snowflake, color: '#3B82F6' },
  { label: 'Cancelled', value: 'cancelled', icon: XCircle, color: '#6B7280' },
  { label: 'Payment Due', value: 'payment_due', icon: AlertTriangle, color: '#F59E0B' },
  { label: 'No Plan', value: 'no_plan', icon: CircleSlash, color: '#9CA3AF' },
];

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

const SORT_OPTIONS: { label: string; value: string; icon: any }[] = [
  { label: 'Newest First', value: 'newest', icon: ArrowDownUp },
  { label: 'Oldest First', value: 'oldest', icon: ArrowUpDown },
  { label: 'Expiry Soon', value: 'expiry', icon: Calendar },
  { label: 'Name A\u2192Z', value: 'name_asc', icon: SortAsc },
  { label: 'Name Z\u2192A', value: 'name_desc', icon: SortDesc },
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

    const handleReset = () => {
      setLocal(EMPTY_FILTERS);
      onApply(EMPTY_FILTERS);
      sheetRef.current?.hide();
    };

    const activeCount = Object.values(local).filter(Boolean).length;
    const insets = useSafeAreaInsets();

    return (
      <BottomSheet ref={sheetRef} snapPoints={[520, 600]}>
        <View style={{ flex: 1, paddingBottom: insets.bottom }}>
          {/* Header */}
          <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }]}>
            <View>
              <Text style={{ color: colors.text, fontSize: typography.sizes.title.fontSize, fontWeight: '700' }}>
                Filter Members
              </Text>
              {activeCount > 0 && (
                <Animated.Text
                  entering={FadeIn.duration(150)}
                  style={{ color: colors.primary, fontSize: typography.sizes.caption.fontSize, fontWeight: '600', marginTop: 2 }}
                >
                  {activeCount} filter{activeCount > 1 ? 's' : ''} active
                </Animated.Text>
              )}
            </View>
            {activeCount > 0 && (
              <Pressable
                onPress={handleReset}
                accessibilityLabel="Clear all filters"
                style={({ pressed }) => [
                  styles.clearBtn,
                  { backgroundColor: colors.error + '15', borderRadius: radius.md, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={{ color: colors.error, fontSize: typography.sizes.caption.fontSize, fontWeight: '700' }}>
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
            {/* Status Section */}
            <View style={[styles.section, { marginBottom: spacing.lg }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                MEMBERSHIP STATUS
              </Text>
              <View style={styles.statusGrid}>
                {STATUS_OPTIONS.map((opt) => {
                  const isActive = local.status === opt.value;
                  const Icon = opt.icon;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => toggle('status', opt.value)}
                      style={({ pressed }) => [
                        styles.statusCard,
                        {
                          backgroundColor: isActive ? opt.color + '18' : colors.surfaceElevated,
                          borderColor: isActive ? opt.color : colors.border,
                          borderRadius: radius.md,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <View style={[styles.statusIconWrap, { backgroundColor: isActive ? opt.color + '22' : colors.border + '40' }]}>
                        <Icon size={14} color={isActive ? opt.color : colors.textMuted} />
                      </View>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: isActive ? '700' : '500',
                          color: isActive ? opt.color : colors.text,
                          marginTop: 4,
                          textAlign: 'center',
                        }}
                        numberOfLines={1}
                      >
                        {opt.label}
                      </Text>
                      {isActive && (
                        <Animated.View entering={ZoomIn.duration(150)} style={[styles.checkMark, { backgroundColor: opt.color }]}>
                          <Check size={8} color="#fff" strokeWidth={3} />
                        </Animated.View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Gender Section */}
            <View style={[styles.section, { marginBottom: spacing.lg }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                GENDER
              </Text>
              <View style={styles.chips}>
                {GENDER_OPTIONS.map((opt) => {
                  const isActive = local.gender === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => toggle('gender', opt.value)}
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          borderRadius: radius.full,
                          paddingHorizontal: spacing.lg,
                          paddingVertical: spacing.xs + 2,
                          backgroundColor: isActive ? colors.primaryLight : colors.surfaceElevated,
                          borderWidth: 1.5,
                          borderColor: isActive ? colors.primary : colors.border,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      {isActive && (
                        <Animated.View entering={FadeIn.duration(150)} style={{ marginRight: 4 }}>
                          <Check size={12} color={colors.primary} />
                        </Animated.View>
                      )}
                      <Text
                        style={{
                          color: isActive ? colors.primary : colors.text,
                          fontSize: typography.sizes.caption.fontSize,
                          fontWeight: isActive ? '700' : '500',
                        }}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Sort Section */}
            <View style={[styles.section, { marginBottom: spacing.sm }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                SORT BY
              </Text>
              <View>
                {SORT_OPTIONS.map((opt) => {
                  const isActive = local.sortBy === opt.value;
                  const Icon = opt.icon;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => toggle('sortBy', opt.value)}
                      style={({ pressed }) => [
                        styles.sortRow,
                        {
                          backgroundColor: isActive ? colors.primaryLight : colors.surfaceElevated,
                          borderRadius: radius.md,
                          borderWidth: 1,
                          borderColor: isActive ? colors.primary : colors.border,
                          marginBottom: 8,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <View style={[styles.sortIconWrap, { backgroundColor: isActive ? colors.primary + '20' : colors.border + '40' }]}>
                        <Icon size={14} color={isActive ? colors.primary : colors.textMuted} />
                      </View>
                      <Text
                        style={{
                          flex: 1,
                          fontSize: typography.sizes.body.fontSize,
                          fontWeight: isActive ? '700' : '400',
                          color: isActive ? colors.primary : colors.text,
                        }}
                      >
                        {opt.label}
                      </Text>
                      {isActive && (
                        <Animated.View entering={ZoomIn.duration(150)}>
                          <Check size={16} color={colors.primary} />
                        </Animated.View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, gap: spacing.sm }]}>
            <SecondaryButton
              label="Reset"
              onPress={handleReset}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label={activeCount > 0 ? `Apply (${activeCount})` : 'Apply Filters'}
              onPress={handleApply}
              style={{ flex: 2 }}
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
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  body: {
    flex: 1,
  },
  section: {},
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusCard: {
    width: '30%',
    flexGrow: 1,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    position: 'relative',
  },
  statusIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  sortIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    width: '100%',
    flexDirection: 'row',
  },
});
