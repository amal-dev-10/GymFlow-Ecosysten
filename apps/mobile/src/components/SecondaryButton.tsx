import React from 'react';
import { StyleSheet, Text, Pressable, ActivityIndicator, StyleProp, ViewStyle, TextStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../theme/theme';
import { useHaptics } from '../hooks/useHaptics';
import { ButtonProps } from './PrimaryButton';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface SecondaryButtonProps extends ButtonProps {
  variant?: 'outlined' | 'ghost';
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'outlined',
  style,
  labelStyle,
  accessibilityLabel,
}) => {
  const { colors, typography, radius, spacing, motion } = useTheme();
  const { lightImpact } = useHaptics();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.97, motion.spring.interactive);
      lightImpact();
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(1, motion.spring.gentle);
    }
  };

  const isOutlined = variant === 'outlined';

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={accessibilityLabel || label}
      style={[
        styles.button,
        isOutlined && {
          borderWidth: 1,
          borderColor: disabled ? colors.border : colors.borderStrong,
        },
        {
          backgroundColor: isOutlined ? colors.surface : 'transparent',
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} size="small" />
      ) : (
        <Text
          style={[
            styles.label,
            {
              color: disabled ? colors.textMuted : colors.text,
              fontSize: typography.sizes.bodyMedium.fontSize,
              lineHeight: typography.sizes.bodyMedium.lineHeight,
              fontWeight: typography.sizes.bodyMedium.fontWeight,
            },
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    alignSelf: 'stretch',
  },
  label: {
    textAlign: 'center',
  },
});
