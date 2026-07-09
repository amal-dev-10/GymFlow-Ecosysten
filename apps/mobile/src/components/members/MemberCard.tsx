import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { CreditCard, Clock, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../theme/theme';
import { useHaptics } from '../../hooks/useHaptics';
import { UserAvatar } from '../UserAvatar';
import { StatusBadge } from '../StatusBadge';
import type { MemberDto } from '../../lib/api';
import {
  memberName,
  memberNumber,
  memberPhotoUrl,
  membershipStatus,
  planName,
  daysUntilExpiry,
  outstandingBalance,
} from '../../lib/member';

interface Props {
  member: MemberDto;
  onPress: () => void;
}

export const MemberCard = React.memo(({ member, onPress }: Props) => {
  const { colors, typography, spacing, radius, elevation } = useTheme();
  const { lightImpact } = useHaptics();

  const status = membershipStatus(member);
  const plan = planName(member);
  const days = daysUntilExpiry(member);
  const balance = outstandingBalance(member);

  const expiryText =
    days === null
      ? null
      : days < 0
        ? `Expired ${Math.abs(days)}d ago`
        : days === 0
          ? 'Expires today'
          : `${days}d left`;

  return (
    <Pressable
      onPress={() => {
        lightImpact();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${memberName(member)}, ${status.label}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          padding: spacing.md,
          marginBottom: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.9 : 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.03,
          shadowRadius: 8,
          elevation: 2,
        },
      ]}
    >
      <View style={styles.row}>
        <UserAvatar uri={memberPhotoUrl(member)} name={memberName(member)} size={52} />

        <View style={[styles.info, { marginLeft: spacing.md }]}>
          <View style={styles.nameRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.name,
                { color: colors.text, fontSize: typography.sizes.title.fontSize, fontWeight: '700', letterSpacing: -0.3 }
              ]}
            >
              {memberName(member)}
            </Text>
            <StatusBadge label={status.label} type={status.type} />
          </View>

          <Text style={[styles.meta, { color: colors.textSecondary, fontSize: typography.sizes.body.fontSize, fontWeight: '500' }]}>
            {memberNumber(member)}
            {plan ? ` · ${plan}` : ''}
          </Text>

          <View style={[styles.statsRow, { marginTop: spacing.md }]}>
            {expiryText && (
              <View style={[styles.stat, { backgroundColor: days !== null && days < 7 ? colors.warningLight : colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm }]}>
                <Clock size={12} color={days !== null && days < 7 ? colors.warning : colors.textMuted} />
                <Text
                  style={{
                    color: days !== null && days < 7 ? colors.warningText : colors.textSecondary,
                    fontSize: typography.sizes.overline.fontSize,
                    fontWeight: '600',
                    marginLeft: 4,
                  }}
                >
                  {expiryText}
                </Text>
              </View>
            )}
            {balance > 0 && (
              <View style={[styles.stat, { backgroundColor: colors.errorLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm }]}>
                <CreditCard size={12} color={colors.error} />
                <Text style={{ color: colors.errorText, fontSize: typography.sizes.overline.fontSize, fontWeight: '600', marginLeft: 4 }}>
                  ₹{balance.toLocaleString('en-IN')} due
                </Text>
              </View>
            )}
          </View>
        </View>

        <ChevronRight size={20} color={colors.textMuted} style={{ marginLeft: spacing.sm }} />
      </View>
    </Pressable>
  );
});

MemberCard.displayName = 'MemberCard';

const styles = StyleSheet.create({
  card: {
    // border removed for a cleaner glass/elevated look
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
  },
  meta: {
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
