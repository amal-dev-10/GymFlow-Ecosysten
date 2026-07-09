import React, { useEffect } from 'react';
import { StyleSheet, Pressable, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { useTheme } from '../theme/theme';
import { useHaptics } from '../hooks/useHaptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface FABProps {
  icon: React.ReactNode;
  onPress: () => void;
  style?: ViewStyle;
  accessibilityLabel: string;
}

export const FloatingActionButton: React.FC<FABProps> = ({
  icon,
  onPress,
  style,
  accessibilityLabel,
}) => {
  const { colors, radius, elevation, motion } = useTheme();
  const { mediumImpact } = useHaptics();
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      150,
      withSpring(1, motion.spring.bouncy)
    );
  }, [scale, motion]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.9, motion.spring.interactive);
    mediumImpact();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, motion.spring.gentle);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.container,
        elevation.lg,
        {
          backgroundColor: colors.primary,
          borderRadius: radius.full,
        },
        animatedStyle,
        style,
      ]}
    >
      {icon}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 80,
  },
});
