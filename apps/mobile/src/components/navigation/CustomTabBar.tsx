import React from 'react';
import { View, StyleSheet, Pressable, Platform, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/theme';
import { useHaptics } from '../../hooks/useHaptics';
import { useAppStore } from '../../store/app.store';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, typography, radius } = useTheme();
  const { lightImpact } = useHaptics();
  const insets = useSafeAreaInsets();

  // Hide tab bar on sub-screens like 'create' (Add Member)
  const currentTab = state.routes[state.index];
  const nestedRouteName = currentTab.state?.routes?.[currentTab.state.index]?.name;
  if (nestedRouteName === 'create') {
    return null;
  }

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 16,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];

        // Skip hidden tabs
        if (options.href === null || options.tabBarItemStyle?.display === 'none') {
          return null;
        }

        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.index === index;
        const isCheckIn = route.name === '(attendance)' || route.name === 'check-in';

        const onPress = () => {
          lightImpact();
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TabItem
            key={route.key}
            isFocused={isFocused}
            isCheckIn={isCheckIn}
            label={label as string}
            options={options}
            onPress={onPress}
            onLongPress={onLongPress}
            colors={colors}
            radius={radius}
            typography={typography}
          />
        );
      })}
    </View>
  );
}

function TabItem({ isFocused, isCheckIn, label, options, onPress, onLongPress, colors, radius, typography }: any) {
  const animatedScale = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(isFocused ? 1.1 : 1) }],
    };
  });

  const animatedColor = isFocused ? colors.primary : colors.textMuted;

  if (isCheckIn) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        testID={options.tabBarTestID}
        onPress={onPress}
        onLongPress={onLongPress}
        style={styles.checkInContainer}
      >
        <Animated.View
          style={[
            styles.checkInButton,
            { backgroundColor: colors.primary, borderRadius: radius.full },
            animatedScale
          ]}
        >
          {options.tabBarIcon && options.tabBarIcon({ focused: isFocused, color: '#FFF', size: 28 })}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarTestID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.iconContainer, animatedScale]}>
        {options.tabBarIcon && options.tabBarIcon({ focused: isFocused, color: animatedColor, size: 20 })}
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          { color: animatedColor, fontWeight: isFocused ? '600' : '500' }
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    alignItems: 'flex-start', // allow checkin button to stick up
    height: Platform.OS === 'ios' ? 88 : 84, // keep constant height for safe area
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50
  },
  iconContainer: {
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 9.5,
    textAlign: 'center',
  },
  checkInContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  checkInButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20, // pop out of the tab bar
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  }
});
