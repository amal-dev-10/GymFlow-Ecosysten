import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { FileText, ChevronRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../theme/theme';
import { useHaptics } from '../../hooks/useHaptics';
import { InvoiceDto } from '../../lib/api';

interface InvoiceCardProps {
  invoice: InvoiceDto;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function InvoiceCard({ invoice, onPress }: InvoiceCardProps) {
  const { colors, spacing, typography, radius, motion } = useTheme();
  const { lightImpact } = useHaptics();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, motion.spring.interactive);
    lightImpact();
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, motion.spring.gentle);
  };

  let StatusIcon = Clock;
  let statusColor = colors.warning;
  let statusBg = colors.warningLight;
  let statusText = colors.warningText;

  if (invoice.status === 'Paid') {
    StatusIcon = CheckCircle2;
    statusColor = colors.success;
    statusBg = colors.successLight;
    statusText = colors.successText;
  } else if (invoice.status === 'Overdue') {
    StatusIcon = AlertCircle;
    statusColor = colors.error;
    statusBg = colors.errorLight;
    statusText = colors.errorText;
  }

  return (
    <AnimatedPressable
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.02,
          shadowRadius: 6,
          elevation: 1,
        },
        animatedStyle
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View style={styles.header}>
        <View style={styles.left}>
          <View style={[styles.iconBox, { backgroundColor: colors.primary + '12', borderRadius: radius.lg }]}>
            <FileText size={20} color={colors.primary} />
          </View>
          <View style={{ marginLeft: spacing.md, flex: 1 }}>
            <Text style={{ fontSize: typography.sizes.body.fontSize, fontWeight: '700', color: colors.text }} numberOfLines={1}>
              {invoice.memberName}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginTop: 2 }}>
              {invoice.invoiceNumber}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', marginLeft: spacing.sm }}>
          <Text style={{ fontSize: typography.sizes.title.fontSize, fontWeight: '800', color: colors.text }}>
            ₹{invoice.total.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={[styles.statusBadge, { backgroundColor: statusBg, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 }]}>
          <StatusIcon size={12} color={statusColor} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: statusText, marginLeft: 4, textTransform: 'uppercase' }}>
            {invoice.status}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>
            Due: {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
          </Text>
          <ChevronRight size={16} color={colors.textMuted} />
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  }
});
