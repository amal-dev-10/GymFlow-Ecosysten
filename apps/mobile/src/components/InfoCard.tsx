import React from 'react';
import { StyleSheet, Text, View, Pressable, ViewStyle } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/theme';

export interface InfoCardProps {
  title: string;
  description: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  description,
  onPress,
  icon,
  delay = 0,
  style,
}) => {
  const { colors, typography, radius, spacing, elevation } = useTheme();

  const CardWrapper = onPress ? Pressable : View;

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(450)}
      style={style}
    >
      <CardWrapper
        onPress={onPress}
        style={[
          styles.container,
          elevation.xs,
          {
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            borderColor: colors.border,
            padding: spacing.lg,
          },
        ]}
      >
        <View style={styles.contentRow}>
          {icon && <View style={[styles.iconContainer, { marginRight: spacing.md }]}>{icon}</View>}
          <View style={styles.textContainer}>
            <Text
              style={[
                styles.title,
                {
                  color: colors.text,
                  fontSize: typography.sizes.subtitle.fontSize,
                  lineHeight: typography.sizes.subtitle.lineHeight,
                  fontWeight: typography.sizes.subtitle.fontWeight,
                },
              ]}
            >
              {title}
            </Text>
            <Text
              style={[
                styles.description,
                {
                  color: colors.textSecondary,
                  fontSize: typography.sizes.body.fontSize,
                  lineHeight: typography.sizes.body.lineHeight,
                  marginTop: spacing.xs,
                },
              ]}
            >
              {description}
            </Text>
          </View>
          {onPress && (
            <ChevronRight size={18} color={colors.textMuted} style={styles.chevron} />
          )}
        </View>
      </CardWrapper>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {},
  description: {},
  chevron: {
    marginLeft: 12,
  },
});
