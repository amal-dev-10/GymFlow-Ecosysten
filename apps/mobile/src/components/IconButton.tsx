import React from 'react';
import { StyleSheet, Pressable, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../theme/theme';
import { useHaptics } from '../hooks/useHaptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'filled' | 'outlined';
  style?: ViewStyle;
  accessibilityLabel: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  disabled = false,
  size = 'md',
  variant = 'ghost',
  style,
  accessibilityLabel,
}) => {
  const { colors, radius, motion } = useTheme();
  const { lightImpact } = useHaptics();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.9, motion.spring.interactive);
      lightImpact();
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, motion.spring.gentle);
    }
  };

  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return { width: 36, height: 36, sizeRadius: radius.sm };
      case 'lg':
        return { width: 56, height: 56, sizeRadius: radius.xl };
      case 'md':
      default:
        return { width: 44, height: 44, sizeRadius: radius.md };
    }
  };

  const { width, height, sizeRadius } = getDimensions();

  const getBackgroundColors = () => {
    if (disabled) return colors.border;
    switch (variant) {
      case 'filled':
        return colors.primaryLight;
      case 'outlined':
        return colors.surface;
      case 'ghost':
      default:
        return 'transparent';
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius: sizeRadius,
          backgroundColor: getBackgroundColors(),
        },
        variant === 'outlined' && !disabled && {
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {icon}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
