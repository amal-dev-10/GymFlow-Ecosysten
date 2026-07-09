import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AlertCircle } from 'lucide-react-native';
import { useTheme } from '../theme/theme';
import { PrimaryButton } from './PrimaryButton';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  style,
}) => {
  const { colors, typography, spacing } = useTheme();

  return (
    <Animated.View
      entering={FadeIn}
      style={[styles.container, { padding: spacing.xxl }, style]}
    >
      <AlertCircle size={48} color={colors.error} style={{ marginBottom: spacing.md }} />

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
          styles.message,
          {
            color: colors.textSecondary,
            fontSize: typography.sizes.body.fontSize,
            lineHeight: typography.sizes.body.lineHeight,
            marginBottom: onRetry ? spacing.xl : 0,
          },
        ]}
      >
        {message}
      </Text>

      {onRetry && (
        <PrimaryButton
          label="Try Again"
          onPress={onRetry}
          style={[styles.button, { backgroundColor: colors.text, alignSelf: 'center' }]}
          labelStyle={{ color: colors.background }}
        />
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
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
  button: {
    maxWidth: 160,
  },
});
