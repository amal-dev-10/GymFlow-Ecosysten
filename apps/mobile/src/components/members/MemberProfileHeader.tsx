import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../theme/theme';
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
  formatCurrency,
} from '../../lib/member';

interface Props {
  member: MemberDto;
}

export const MemberProfileHeader: React.FC<Props> = ({ member }) => {
  const { colors, typography, spacing, radius } = useTheme();
  const status = membershipStatus(member);
  const plan = planName(member);
  const days = daysUntilExpiry(member);
  const balance = outstandingBalance(member);

  return (
    <Animated.View entering={FadeIn.duration(400)} style={[styles.container, { padding: spacing.xl }]}>
      {/* Avatar + Name */}
      <View style={styles.topRow}>
        <UserAvatar uri={memberPhotoUrl(member)} name={memberName(member)} size={80} />
        <View style={[styles.nameSection, { marginLeft: spacing.lg }]}>
          <Text
            numberOfLines={2}
            style={{
              color: colors.text,
              fontSize: typography.sizes.headline.fontSize,
              fontWeight: '700',
              lineHeight: typography.sizes.headline.lineHeight,
            }}
          >
            {memberName(member)}
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.sizes.caption.fontSize,
              marginTop: 2,
            }}
          >
            {memberNumber(member)}
          </Text>
          <View style={{ marginTop: spacing.xs }}>
            <StatusBadge label={status.label} type={status.type} />
          </View>
        </View>
      </View>

      {/* Quick Stats */}
      <View
        style={[
          styles.statsRow,
          {
            marginTop: spacing.lg,
            backgroundColor: colors.surfaceElevated,
            borderRadius: radius.md,
            padding: spacing.md,
          },
        ]}
      >
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text, fontSize: typography.sizes.subtitle.fontSize, fontWeight: '700' }]}>
            {plan || '—'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted, fontSize: typography.sizes.overline.fontSize }]}>
            Plan
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <Text
            style={[
              styles.statValue,
              {
                color: days !== null && days < 7 ? colors.warning : colors.text,
                fontSize: typography.sizes.subtitle.fontSize,
                fontWeight: '700',
              },
            ]}
          >
            {days !== null ? `${days}d` : '—'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted, fontSize: typography.sizes.overline.fontSize }]}>
            Until Expiry
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <Text
            style={[
              styles.statValue,
              {
                color: balance > 0 ? colors.error : colors.success,
                fontSize: typography.sizes.subtitle.fontSize,
                fontWeight: '700',
              },
            ]}
          >
            {balance > 0 ? formatCurrency(balance) : '✓'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted, fontSize: typography.sizes.overline.fontSize }]}>
            Balance
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {},
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameSection: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    textAlign: 'center',
  },
  statLabel: {
    textAlign: 'center',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 32,
  },
});
