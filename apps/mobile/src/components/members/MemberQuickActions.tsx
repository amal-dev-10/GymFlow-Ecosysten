import React from 'react';
import { StyleSheet, Text, View, Pressable, Alert } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  LogIn,
  LogOut,
  Ruler,
  Mail,
  Check,
  Award,
  RefreshCw,
  Snowflake,
  Play,
  CreditCard,
} from 'lucide-react-native';
import { useTheme } from '../../theme/theme';
import { useHaptics } from '../../hooks/useHaptics';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import { Linking } from 'react-native';
import type { Feature } from '../../lib/permissions';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  feature?: Feature;
  color: string;
  bgColor: string;
  disabled?: boolean;
}

interface Props {
  memberId: string;
  phoneNumber?: string;
  email?: string | null;
  isInsideGym?: boolean;
  hasCheckedInToday?: boolean;
  hasActivePlan?: boolean;
  isFrozen?: boolean;
  hasDues?: boolean;
  duesAmount?: number;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onSellMembership?: () => void;
  onFreezeMembership?: () => void;
  onCollectDues?: () => void;
}

export const MemberQuickActions: React.FC<Props> = ({
  memberId,
  phoneNumber,
  email,
  isInsideGym,
  hasCheckedInToday,
  hasActivePlan,
  isFrozen,
  hasDues,
  duesAmount,
  onCheckIn,
  onCheckOut,
  onSellMembership,
  onFreezeMembership,
  onCollectDues,
}) => {
  const { colors, spacing, radius } = useTheme();
  const { lightImpact } = useHaptics();
  const { can } = useWorkspace();

  // Attendance action
  let attendanceAction: QuickAction;
  if (isInsideGym) {
    attendanceAction = {
      icon: <LogOut size={20} color="#F59E0B" />,
      label: 'Check Out',
      onPress: onCheckOut,
      feature: 'mark-attendance' as Feature,
      color: '#F59E0B',
      bgColor: '#F59E0B18',
    };
  } else if (hasCheckedInToday) {
    attendanceAction = {
      icon: <Check size={20} color="#22C55E" />,
      label: 'Checked In',
      onPress: () => {},
      feature: 'mark-attendance' as Feature,
      color: '#22C55E',
      bgColor: '#22C55E18',
      disabled: true,
    };
  } else {
    attendanceAction = {
      icon: <LogIn size={20} color="#22C55E" />,
      label: 'Check In',
      onPress: onCheckIn,
      feature: 'mark-attendance' as Feature,
      color: '#22C55E',
      bgColor: '#22C55E18',
    };
  }

  const actions: QuickAction[] = [
    attendanceAction,

    // Sell / Renew Membership
    ...(onSellMembership ? [{
      icon: hasActivePlan
        ? <RefreshCw size={20} color={colors.primary} />
        : <Award size={20} color={colors.primary} />,
      label: hasActivePlan ? 'Renew' : 'Sell Plan',
      onPress: onSellMembership,
      feature: 'create-membership' as Feature,
      color: colors.primary,
      bgColor: colors.primary + '15',
    }] : []),

    // Collect Dues (only if there are outstanding dues)
    ...(hasDues && onCollectDues ? [{
      icon: <CreditCard size={20} color="#EF4444" />,
      label: duesAmount ? `₹${duesAmount.toLocaleString('en-IN')}` : 'Collect',
      onPress: onCollectDues,
      feature: 'record-payment' as Feature,
      color: '#EF4444',
      bgColor: '#EF444418',
    }] : []),

    // Freeze / Reactivate
    ...(onFreezeMembership && hasActivePlan ? [{
      icon: isFrozen
        ? <Play size={20} color="#3B82F6" />
        : <Snowflake size={20} color="#3B82F6" />,
      label: isFrozen ? 'Unfreeze' : 'Freeze',
      onPress: onFreezeMembership,
      feature: 'freeze-membership' as Feature,
      color: '#3B82F6',
      bgColor: '#3B82F618',
    }] : []),

    // Email
    ...(email ? [{
      icon: <Mail size={20} color="#8B5CF6" />,
      label: 'Email',
      onPress: () => Linking.openURL(`mailto:${email}`),
      color: '#8B5CF6',
      bgColor: '#8B5CF618',
    }] : []),

    // Measure
    {
      icon: <Ruler size={20} color="#EC4899" />,
      label: 'Measure',
      onPress: () => Alert.alert('Measure', 'Record Measurement will be available in a dedicated module — coming soon.'),
      feature: 'record-measurement' as Feature,
      color: '#EC4899',
      bgColor: '#EC489918',
    },
  ];

  const visible = actions.filter((a) => !a.feature || can(a.feature));

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.lg, gap: spacing.sm }]}>
      {visible.map((action, i) => (
        <Animated.View
          key={action.label}
          entering={FadeInUp.delay(i * 40).duration(280)}
          style={styles.actionWrapper}
        >
          <Pressable
            disabled={action.disabled}
            onPress={() => {
              lightImpact();
              action.onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={({ pressed }) => [
              styles.actionCard,
              {
                backgroundColor: action.bgColor,
                borderColor: action.color + '35',
                borderRadius: radius.lg,
                opacity: action.disabled ? 0.55 : pressed ? 0.75 : 1,
              },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: action.color + '22' }]}>
              {action.icon}
            </View>
            <Text
              numberOfLines={1}
              style={{
                color: action.color,
                fontSize: 11,
                fontWeight: '700',
                marginTop: 6,
                textAlign: 'center',
              }}
            >
              {action.label}
            </Text>
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionWrapper: {
    flexGrow: 1,
    minWidth: 72,
    maxWidth: '25%',
  },
  actionCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderWidth: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
