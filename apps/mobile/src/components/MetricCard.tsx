import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import { useTheme } from '../theme/theme';

export interface MetricCardProps {
  label: string;
  value: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  trend,
  icon,
  delay = 0,
  style,
}) => {
  const { colors, typography, radius, spacing, elevation } = useTheme();

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(400)}
      style={[
        styles.container,
        elevation.xs,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.lg,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        },
        style,
      ]}
    >
      <View style={styles.header}>
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: colors.textSecondary,
              fontSize: typography.sizes.caption.fontSize,
              lineHeight: typography.sizes.caption.lineHeight,
              fontWeight: typography.sizes.caption.fontWeight,
            },
          ]}
        >
          {label}
        </Text>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
      </View>

      <Text
        numberOfLines={1}
        style={[
          styles.value,
          {
            color: colors.text,
            fontSize: 28,
            lineHeight: 32,
            fontWeight: '800',
            letterSpacing: -0.5,
            marginTop: spacing.sm,
          },
        ]}
      >
        {value}
      </Text>

      {trend && (
        <View style={[styles.trendContainer, { marginTop: spacing.sm }]}>
          <View
            style={[
              styles.trendBadge,
              {
                backgroundColor: trend.isPositive ? colors.successLight : colors.errorLight,
                borderRadius: radius.xs,
                paddingHorizontal: spacing.xs,
                paddingVertical: 2,
              },
            ]}
          >
            {trend.isPositive ? (
              <ArrowUpRight size={12} color={colors.success} style={styles.trendIcon} />
            ) : (
              <ArrowDownRight size={12} color={colors.error} style={styles.trendIcon} />
            )}
            <Text
              style={[
                styles.trendText,
                {
                  color: trend.isPositive ? colors.successText : colors.errorText,
                  fontSize: typography.sizes.overline.fontSize,
                  fontWeight: '600',
                },
              ]}
            >
              {trend.value}
            </Text>
          </View>
          <Text
            style={[
              styles.trendLabel,
              {
                color: colors.textMuted,
                fontSize: typography.sizes.overline.fontSize,
                marginLeft: spacing.xs,
              },
            ]}
          >
            vs last month
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 140,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    flex: 1,
  },
  iconContainer: {
    marginLeft: 8,
  },
  value: {
    fontVariant: ['tabular-nums'],
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendIcon: {
    marginRight: 2,
  },
  trendText: {
    lineHeight: 12,
  },
  trendLabel: {
    lineHeight: 12,
  },
});
