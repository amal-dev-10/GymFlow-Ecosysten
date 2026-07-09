import React from 'react';
import { StyleSheet, Text, Pressable, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../theme/theme';
import { useHaptics } from '../../hooks/useHaptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface QuickActionButtonProps {
  label: string;
  icon: React.ReactNode;
  color?: string;
  onPress: () => void;
  style?: ViewStyle;
}

// Compact square tile for the dashboard's Quick Actions grid — distinct from
// IconButton (no label) and InfoCard (full-width row), sized for a 3-per-row grid.
export const QuickActionButton: React.FC<QuickActionButtonProps> = ({ label, icon, color, onPress, style }) => {
  const { colors, typography, radius, spacing, motion } = useTheme();
  const { lightImpact } = useHaptics();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.94, motion.spring.interactive);
    lightImpact();
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, motion.spring.gentle);
  };

  const tintColor = color || colors.primary;
  const bgColor = color ? color + '15' : colors.primaryLight;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.02,
          shadowRadius: 6,
          elevation: 1,
        },
        animatedStyle,
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.iconWrap,
          { backgroundColor: bgColor, borderRadius: radius.full, marginBottom: spacing.sm },
        ]}
      >
        {icon}
      </Animated.View>
      <Text
        numberOfLines={2}
        style={[
          styles.label,
          {
            color: colors.text,
            fontSize: 12,
            lineHeight: 14,
            fontWeight: '600',
          },
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 104, // Slightly wider
    height: 104,
  },
  iconWrap: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
    marginTop: 2,
  },
});
