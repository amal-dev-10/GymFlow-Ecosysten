import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { WifiOff } from 'lucide-react-native';
import { useTheme } from '../theme/theme';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const OfflineBanner: React.FC = () => {
  const { colors, typography, spacing, motion } = useTheme();
  const { isOffline } = useNetworkStatus();
  const insets = useSafeAreaInsets();

  // Slide translation value (starts offscreen above the device header)
  const translateY = useSharedValue(-100);

  useEffect(() => {
    if (isOffline) {
      translateY.value = withSpring(insets.top, motion.spring.gentle);
    } else {
      translateY.value = withTiming(-100, motion.ease.sharp);
    }
  }, [isOffline, translateY, insets.top, motion]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.error,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        },
        animatedStyle,
      ]}
    >
      <WifiOff size={16} color={colors.background} style={styles.icon} />
      <Text
        style={[
          styles.text,
          {
            color: colors.background,
            fontSize: typography.sizes.caption.fontSize,
            fontWeight: '600',
          },
        ]}
      >
        You are currently offline. Checking connection...
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    // Add simple shadow
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  icon: {
    marginRight: 8,
  },
  text: {},
});
