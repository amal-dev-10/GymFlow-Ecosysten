import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { QrCode, Phone, MessageCircle } from 'lucide-react-native';
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
  memberPhone,
} from '../../lib/member';
import { Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  member: MemberDto;
  onQR?: () => void;
}

function getStatusColor(type: string): string {
  switch (type) {
    case 'success': return '#0cd556ff';
    case 'error': return '#bb0000ff';
    case 'warning': return '#F59E0B';
    case 'info': return '#3B82F6';
    default: return '#6B7280';
  }
}

export const MemberProfileHeader: React.FC<Props> = ({ member, onQR }) => {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const status = membershipStatus(member);
  const plan = planName(member);
  const days = daysUntilExpiry(member);
  const balance = outstandingBalance(member);
  const statusColor = getStatusColor(status.type);
  const phone = memberPhone(member);

  const headerHeight = 56; // Standard navigation header height
  const topPadding = insets.top + headerHeight;

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.wrapper}>
      {/* Status-tinted hero band - extends to the very top */}
      <View style={[styles.heroBand, { backgroundColor: statusColor + '12', height: topPadding + 92 }]} />

      <View style={[styles.container, { padding: spacing.xl, paddingTop: topPadding }]}>
        {/* Avatar row */}
        <View style={styles.avatarRow}>
          {/* Avatar with status ring */}
          <View style={[styles.avatarRing, { borderColor: statusColor, backgroundColor: statusColor + '18' }]}>
            <UserAvatar uri={memberPhotoUrl(member)} name={memberName(member)} size={76} />
          </View>

          {/* Name + ID + Status */}
          <View style={[styles.nameBlock, { marginLeft: spacing.md }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
              <Text
                numberOfLines={2}
                style={{
                  color: colors.text,
                  fontSize: 22,
                  fontWeight: '800',
                  lineHeight: 26,
                  letterSpacing: -0.3,
                  flex: 1,
                }}
              >
                {memberName(member)}
              </Text>
              {onQR && (
                <Pressable
                  onPress={onQR}
                  style={({ pressed }) => [
                    styles.qrBtn,
                    { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30', opacity: pressed ? 0.7 : 1 }
                  ]}
                >
                  <QrCode size={13} color={colors.primary} />
                </Pressable>
              )}
            </View>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 12,
                fontWeight: '500',
                marginTop: 3,
                letterSpacing: 0.5,
              }}
            >
              {memberNumber(member)}
            </Text>
            <View style={{ marginTop: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <StatusBadge label={status.label} type={status.type} />
            </View>
          </View>
        </View>

        {/* Contact action row */}
        {phone && phone !== '—' && (
          <View style={[styles.contactRow, { marginTop: spacing.md + 5, gap: spacing.sm }]}>
            <Pressable
              onPress={() => Linking.openURL(`tel:${phone}`)}
              style={({ pressed }) => [
                styles.contactBtn,
                { backgroundColor: '#3B82F615', borderColor: '#3B82F630', opacity: pressed ? 0.75 : 1 }
              ]}
            >
              <Phone size={15} color="#3B82F6" />
              <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '600', marginLeft: 6 }}>Call</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const cleaned = phone.replace(/\D/g, '');
                Linking.openURL(`https://wa.me/${cleaned}`);
              }}
              style={({ pressed }) => [
                styles.contactBtn,
                { backgroundColor: '#22C55E15', borderColor: '#22C55E30', opacity: pressed ? 0.75 : 1 }
              ]}
            >
              <MessageCircle size={15} color="#22C55E" />
              <Text style={{ color: '#22C55E', fontSize: 13, fontWeight: '600', marginLeft: 6 }}>WhatsApp</Text>
            </Pressable>
          </View>
        )}

        {/* Stats row */}
        <View
          style={[
            styles.statsRow,
            {
              marginTop: spacing.md,
              backgroundColor: colors.surfaceElevated,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.statItem}>
            <Text
              numberOfLines={1}
              style={[styles.statValue, { color: colors.text }]}
            >
              {plan || '—'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Plan</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                { color: days !== null && days < 7 ? '#F59E0B' : days !== null && days < 0 ? '#EF4444' : colors.text },
              ]}
            >
              {days !== null ? (days <= 0 ? 'Expired' : `${days}d`) : '—'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Expiry</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                { color: balance > 0 ? '#EF4444' : '#22C55E' },
              ]}
            >
              {balance > 0 ? formatCurrency(balance) : 'Paid ✓'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Balance</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  heroBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  container: {},
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBlock: {
    flex: 1,
  },
  qrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  contactRow: {
    flexDirection: 'row',
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  divider: {
    width: 1,
    height: 30,
  },
});
