import React, { useRef } from 'react';
import { StyleSheet, TextInput, View, Pressable, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Search, X } from 'lucide-react-native';
import { useTheme } from '../theme/theme';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  style?: ViewStyle;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  onClear,
  style,
}) => {
  const { colors, typography, radius, spacing, motion } = useTheme();
  const inputRef = useRef<TextInput>(null);
  
  // Animation value to animate borders or background slightly on focus
  const focusProgress = useSharedValue(0);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      borderColor: withTiming(
        focusProgress.value === 1 ? colors.primary : colors.border,
        motion.ease.standard
      ),
      backgroundColor: withTiming(
        focusProgress.value === 1 ? colors.surface : colors.surfaceElevated,
        motion.ease.standard
      ),
    };
  });

  const handleFocus = () => {
    focusProgress.value = 1;
  };

  const handleBlur = () => {
    focusProgress.value = 0;
  };

  const handleClear = () => {
    onChangeText('');
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
        },
        containerAnimatedStyle,
        style,
      ]}
    >
      <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
      
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        onFocus={handleFocus}
        onBlur={handleBlur}
        accessibilityRole="search"
        accessibilityLabel="Search input"
        style={[
          styles.input,
          {
            color: colors.text,
            fontSize: typography.sizes.body.fontSize,
            lineHeight: typography.sizes.body.lineHeight,
          },
        ]}
      />

      {value.length > 0 && (
        <Pressable onPress={handleClear} accessibilityLabel="Clear search input">
          <X size={16} color={colors.textSecondary} />
        </Pressable>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 0, // fixes vertical center alignment on iOS/Android
    height: '100%',
  },
});
