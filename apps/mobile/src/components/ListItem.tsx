import React from 'react';
import { StyleSheet, Text, View, Pressable, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/theme';
import { useHaptics } from '../hooks/useHaptics';
import { lightColors } from '@/theme/colors';

import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ListItemProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
  showChevron?: boolean;
  showBottomBorder?: boolean;
  style?: ViewStyle;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  onPress,
  leftComponent,
  rightComponent,
  showChevron = true,
  showBottomBorder = true,
  style,
}) => {
  const { colors, typography, spacing, motion } = useTheme();
  const { lightImpact } = useHaptics();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, motion.spring.interactive);
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, motion.spring.gentle);
    }
  };

  const handlePress = () => {
    if (onPress) {
      lightImpact();
      onPress();
    }
  };

  const Wrapper = onPress ? AnimatedPressable : View;

  return (
    <Wrapper
      onPress={onPress ? handlePress : undefined}
      onPressIn={onPress ? handlePressIn : undefined}
      onPressOut={onPress ? handlePressOut : undefined}
      android_ripple={onPress ? { color: colors.ripple } : undefined}
      style={({ pressed }: any) => [
        styles.container,
        {
          paddingVertical: 16,
          paddingHorizontal: spacing.lg,
          backgroundColor: onPress && pressed ? colors.background : colors.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        onPress ? animatedStyle : undefined,
        style,
      ]}
    >
      <View style={[styles.contentRow, { borderBottomWidth: showBottomBorder ? 1 : 0 }]}>
        {leftComponent && <View style={styles.leftWrapper}>{leftComponent}</View>}

        <View style={styles.textContainer}>
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              {
                color: colors.text,
                fontSize: typography.sizes.bodyMedium.fontSize,
                lineHeight: typography.sizes.bodyMedium.lineHeight,
                fontWeight: typography.sizes.bodyMedium.fontWeight,
              },
            ]}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              numberOfLines={1}
              style={[
                styles.subtitle,
                {
                  color: colors.textSecondary,
                  fontSize: typography.sizes.caption.fontSize,
                  lineHeight: typography.sizes.caption.lineHeight,
                  marginTop: 2,
                },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {rightComponent && <View style={styles.rightWrapper}>{rightComponent}</View>}

        {onPress && showChevron && !rightComponent && (
          <ChevronRight size={16} color={colors.textMuted} style={styles.chevron} />
        )}
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 15,
    borderBottomColor: lightColors.border
  },
  leftWrapper: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {},
  subtitle: {},
  rightWrapper: {
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevron: {
    marginLeft: 8,
  },
});
