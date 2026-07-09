import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/theme';
import { LucideIcon } from 'lucide-react-native';

interface BillingWidgetProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  color: string;
  onPress?: () => void;
}

export function BillingWidget({ title, value, subtitle, icon: Icon, color, onPress }: BillingWidgetProps) {
  const { colors, spacing, typography, radius } = useTheme();

  const content = (
    <View style={[styles.container, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: color + '15', borderRadius: radius.md }]}>
          <Icon size={24} color={color} />
        </View>
      </View>
      <Text style={{ fontSize: typography.sizes.title.fontSize, fontWeight: '700', color: colors.text, marginTop: spacing.md }}>
        {value}
      </Text>
      <Text style={{ fontSize: typography.sizes.body.fontSize, fontWeight: '600', color: colors.textSecondary, marginTop: 4 }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ fontSize: typography.sizes.small.fontSize, color: colors.textMuted, marginTop: 2 }}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.touchable}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.touchable}>{content}</View>;
}

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
  },
  container: {
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
