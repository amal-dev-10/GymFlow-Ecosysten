import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../theme/theme';
import type { StatusType } from '../StatusBadge';
import { StatusBadge } from '../StatusBadge';
import { SectionHeader } from '../SectionHeader';
import { Card } from '../Card';
import { formatDate, formatCurrency } from '../../lib/member';

interface Props {
  memberships: any[];
  onPressItem?: (membership: any) => void;
}

function statusType(status?: string): StatusType {
  const s = (status || '').toLowerCase();
  if (s === 'active') return 'success';
  if (s === 'frozen') return 'info';
  if (s === 'expired' || s === 'cancelled') return 'error';
  return 'default';
}

/** Full history of a member's membership terms, newest first. */
export const MemberMembershipHistory: React.FC<Props> = ({ memberships, onPressItem }) => {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={{ marginBottom: spacing.lg, paddingHorizontal: spacing.md }}>
      <SectionHeader title="Membership History" style={{ paddingHorizontal: spacing.lg }} />
      <Card padded={!memberships?.length}>
        {!memberships?.length ? (
          <Text style={{ color: colors.textMuted, fontSize: typography.sizes.body.fontSize, textAlign: 'center', paddingVertical: spacing.md }}>
            No membership history found.
          </Text>
        ) : (
          memberships.map((m, i) => {
            const outstanding = Number(m.outstandingDues) || 0;
            const Row: any = onPressItem ? Pressable : View;
            return (
              <Row
                key={m.id || i}
                onPress={onPressItem ? () => onPressItem(m) : undefined}
                style={({ pressed }: any) => [
                  styles.row,
                  {
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.lg,
                    borderBottomWidth: i < memberships.length - 1 ? StyleSheet.hairlineWidth : 0,
                    borderBottomColor: colors.border,
                    backgroundColor: pressed ? colors.background : 'transparent',
                  },
                ]}
              >
                <View style={{ flex: 1, marginRight: spacing.md }}>
                  <Text style={{ fontSize: typography.sizes.bodyMedium.fontSize, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                    {m.membershipPlan?.name || 'Membership'}
                  </Text>
                  <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textSecondary, marginTop: 2 }}>
                    {formatDate(m.startDate)} – {formatDate(m.endDate)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <StatusBadge label={m.status || 'Unknown'} type={statusType(m.status)} />
                  <Text style={{ fontSize: typography.sizes.caption.fontSize, fontWeight: '600', color: outstanding > 0 ? colors.error : colors.textSecondary, marginTop: 4 }}>
                    {outstanding > 0 ? `${formatCurrency(outstanding)} due` : formatCurrency(Number(m.amountPaid) || 0)}
                  </Text>
                </View>
                {onPressItem && <ChevronRight size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />}
              </Row>
            );
          })
        )}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
