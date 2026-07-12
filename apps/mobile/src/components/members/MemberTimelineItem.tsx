import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  UserPlus,
  CreditCard,
  LogIn,
  LogOut,
  Dumbbell,
  Salad,
  Ruler,
  UserCog,
  Snowflake,
  RefreshCw,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '../../theme/theme';
import type { TimelineEvent } from '../../lib/api';
import { formatDate } from '../../lib/member';

interface Props {
  event: TimelineEvent;
  isLast?: boolean;
}

const EVENT_ICONS: Record<string, { icon: typeof UserPlus; color: string }> = {};

function getEventMeta(type: string, colors: any) {
  switch (type) {
    case 'member_created':
      return { Icon: UserPlus, color: colors.success };
    case 'membership_purchased':
    case 'membership_renewed':
      return { Icon: CreditCard, color: colors.primary };
    case 'payment_collected':
      return { Icon: CreditCard, color: colors.success };
    case 'checked_in':
      return { Icon: LogIn, color: colors.info };
    case 'checked_out':
      return { Icon: LogOut, color: colors.warning };
    case 'checkin_denied':
      return { Icon: AlertCircle, color: colors.error };
    case 'workout_assigned':
      return { Icon: Dumbbell, color: colors.primary };
    case 'diet_assigned':
      return { Icon: Salad, color: colors.success };
    case 'measurement_updated':
      return { Icon: Ruler, color: colors.info };
    case 'trainer_changed':
      return { Icon: UserCog, color: colors.primary };
    case 'membership_frozen':
      return { Icon: Snowflake, color: colors.info };
    case 'membership_reactivated':
      return { Icon: RefreshCw, color: colors.success };
    default:
      return { Icon: AlertCircle, color: colors.textMuted };
  }
}

export const MemberTimelineItem: React.FC<Props> = ({ event, isLast = false }) => {
  const { colors, typography, spacing, radius } = useTheme();
  const { Icon, color } = getEventMeta(event.type, colors);

  return (
    <View style={styles.container}>
      {/* Timeline connector */}
      <View style={styles.connector}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor: color,
              borderRadius: radius.full,
            },
          ]}
        >
          <Icon size={12} color={colors.surface} />
        </View>
        {!isLast && <View style={[styles.line, { backgroundColor: colors.border }]} />}
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingBottom: isLast ? 0 : spacing.lg, marginLeft: spacing.md }]}>
        <Text
          style={{
            color: colors.text,
            fontSize: typography.sizes.body.fontSize,
            fontWeight: '500',
          }}
        >
          {event.title}
        </Text>
        {event.description && (
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.sizes.caption.fontSize,
              marginTop: 2,
            }}
          >
            {event.description}
          </Text>
        )}
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.sizes.overline.fontSize,
            marginTop: spacing.xs,
          }}
        >
          {formatDate(event.createdAt)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  connector: {
    alignItems: 'center',
    width: 28,
  },
  dot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
});
