import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useTheme } from '../../theme/theme';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react-native';
import { typography } from '../../theme/typography';

export type ValidationState = 'success' | 'error' | 'frozen' | 'expired' | null;

interface ValidationOverlayProps {
  state: ValidationState;
  title?: string;
  subtitle?: string;
  memberName?: string;
}

export function ValidationOverlay({ state, title, subtitle, memberName }: ValidationOverlayProps) {
  const { colors, spacing, radius } = useTheme();

  if (!state) return null;

  let Icon = Info;
  let color = colors.primary;
  let defaultTitle = '';

  if (state === 'success') {
    Icon = CheckCircle2;
    color = colors.success;
    defaultTitle = 'Check-in Successful';
  } else if (state === 'error') {
    Icon = XCircle;
    color = colors.error;
    defaultTitle = 'Invalid QR Code';
  } else if (state === 'frozen') {
    Icon = Info;
    color = colors.info;
    defaultTitle = 'Membership Frozen';
  } else if (state === 'expired') {
    Icon = AlertCircle;
    color = colors.warning;
    defaultTitle = 'Membership Expired';
  }

  return (
    <Animated.View 
      entering={FadeInDown.duration(400).springify()}
      exiting={FadeOutDown.duration(300)}
      style={[styles.container, { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }]}
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 }]}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Icon size={48} color={color} />
        </View>
        <Text style={{ fontSize: typography.sizes.title.fontSize, fontWeight: '700', color: colors.text, marginTop: spacing.md, textAlign: 'center' }}>
          {title || defaultTitle}
        </Text>
        {memberName && (
          <Text style={{ fontSize: typography.sizes.body.fontSize, color: colors.text, fontWeight: '500', marginTop: spacing.sm, textAlign: 'center' }}>
            {memberName}
          </Text>
        )}
        {subtitle && (
          <Text style={{ fontSize: typography.sizes.body.fontSize, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' }}>
            {subtitle}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  card: {
    padding: 24,
    alignItems: 'center',
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
