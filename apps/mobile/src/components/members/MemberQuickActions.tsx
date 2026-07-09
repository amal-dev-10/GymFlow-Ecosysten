import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Linking, Alert } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import {
  LogIn,
  LogOut,
  CreditCard,
  Snowflake,
  RefreshCw,
  ArrowUpCircle,
  Dumbbell,
  Salad,
  Ruler,
  CalendarCheck,
  History,
  Phone,
  MessageCircle,
  Mail,
  UserPen,
  UserX,
  QrCode,
} from 'lucide-react-native';
import { useTheme } from '../../theme/theme';
import { useHaptics } from '../../hooks/useHaptics';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type { Feature } from '../../lib/permissions';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  feature?: Feature;
  destructive?: boolean;
}

interface Props {
  memberId: string;
  phoneNumber?: string;
  email?: string | null;
  isInsideGym?: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onEdit: () => void;
  onQR: () => void;
  onDeactivate: () => void;
}

function comingSoon(name: string) {
  Alert.alert(name, `${name} will be available in a dedicated module — coming soon.`);
}

export const MemberQuickActions: React.FC<Props> = ({
  memberId,
  phoneNumber,
  email,
  isInsideGym,
  onCheckIn,
  onCheckOut,
  onEdit,
  onQR,
  onDeactivate,
}) => {
  const { colors, typography, spacing, radius } = useTheme();
  const { lightImpact } = useHaptics();
  const { can } = useWorkspace();

  const callMember = () => {
    if (phoneNumber) Linking.openURL(`tel:${phoneNumber}`);
  };
  const whatsappMember = () => {
    if (phoneNumber) {
      const cleaned = phoneNumber.replace(/\D/g, '');
      Linking.openURL(`https://wa.me/${cleaned}`);
    }
  };
  const emailMember = () => {
    if (email) Linking.openURL(`mailto:${email}`);
  };

  const actions: QuickAction[] = [
    // Attendance
    ...(isInsideGym
      ? [{ icon: <LogOut size={18} color={colors.warning} />, label: 'Check Out', onPress: onCheckOut, feature: 'mark-attendance' as Feature }]
      : [{ icon: <LogIn size={18} color={colors.success} />, label: 'Check In', onPress: onCheckIn, feature: 'mark-attendance' as Feature }]),
    // QR
    { icon: <QrCode size={18} color={colors.primary} />, label: 'QR Code', onPress: onQR },
    // Communication
    ...(phoneNumber ? [{ icon: <Phone size={18} color={colors.info} />, label: 'Call', onPress: callMember }] : []),
    ...(phoneNumber ? [{ icon: <MessageCircle size={18} color={colors.success} />, label: 'WhatsApp', onPress: whatsappMember }] : []),
    ...(email ? [{ icon: <Mail size={18} color={colors.primary} />, label: 'Email', onPress: emailMember }] : []),
    // Membership stubs
    { icon: <CreditCard size={18} color={colors.primary} />, label: 'Payment', onPress: () => comingSoon('Collect Payment'), feature: 'record-payment' as Feature },
    { icon: <RefreshCw size={18} color={colors.info} />, label: 'Renew', onPress: () => comingSoon('Renew Membership'), feature: 'create-membership' as Feature },
    { icon: <Snowflake size={18} color={colors.info} />, label: 'Freeze', onPress: () => comingSoon('Freeze Membership'), feature: 'freeze-membership' as Feature },
    { icon: <ArrowUpCircle size={18} color={colors.primary} />, label: 'Upgrade', onPress: () => comingSoon('Upgrade Membership'), feature: 'create-membership' as Feature },
    // Trainer/Workout/Diet stubs
    { icon: <Dumbbell size={18} color={colors.primary} />, label: 'Workout', onPress: () => comingSoon('Assign Workout'), feature: 'assign-workout' as Feature },
    { icon: <Salad size={18} color={colors.success} />, label: 'Diet', onPress: () => comingSoon('Assign Diet'), feature: 'assign-diet' as Feature },
    { icon: <Ruler size={18} color={colors.info} />, label: 'Measure', onPress: () => comingSoon('Record Measurement'), feature: 'record-measurement' as Feature },
    // Edit
    { icon: <UserPen size={18} color={colors.text} />, label: 'Edit', onPress: onEdit, feature: 'manage-members' as Feature },
    // Deactivate
    { icon: <UserX size={18} color={colors.error} />, label: 'Deactivate', onPress: onDeactivate, feature: 'manage-members' as Feature, destructive: true },
  ];

  // Filter to only actions the current role can perform
  const visible = actions.filter((a) => !a.feature || can(a.feature));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, { paddingHorizontal: spacing.lg, gap: spacing.sm }]}
    >
      {visible.map((action, i) => (
        <Animated.View key={action.label} entering={FadeInRight.delay(i * 30).duration(250)}>
          <Pressable
            onPress={() => {
              lightImpact();
              action.onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={[
              styles.actionChip,
              {
                backgroundColor: action.destructive ? colors.errorLight : colors.surfaceElevated,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              },
            ]}
          >
            {action.icon}
            <Text
              style={{
                color: action.destructive ? colors.error : colors.text,
                fontSize: typography.sizes.overline.fontSize,
                fontWeight: '600',
                marginTop: 4,
              }}
            >
              {action.label}
            </Text>
          </Pressable>
        </Animated.View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingVertical: 4,
  },
  actionChip: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
});
