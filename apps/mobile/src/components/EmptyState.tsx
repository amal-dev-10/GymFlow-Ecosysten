import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../theme/theme';
import { PrimaryButton } from './PrimaryButton';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onActionPress,
  style,
}) => {
  const { colors, typography, spacing } = useTheme();

  return (
    <Animated.View
      entering={FadeIn}
      style={[styles.container, { padding: spacing.xxl }, style]}
    >
      {icon && <View style={[styles.iconContainer, { marginBottom: spacing.md }]}>{icon}</View>}

      <Text
        style={[
          styles.title,
          {
            color: colors.text,
            fontSize: typography.sizes.title.fontSize,
            lineHeight: typography.sizes.title.lineHeight,
            fontWeight: typography.sizes.title.fontWeight,
            marginBottom: spacing.xs,
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
            marginBottom: actionLabel ? spacing.xl : 0,
          },
        ]}
      >
        {description}
      </Text>

      {actionLabel && onActionPress && (
        <PrimaryButton label={actionLabel} onPress={onActionPress} style={styles.button} />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
  },
  button: {
    maxWidth: 200,
  },
});
