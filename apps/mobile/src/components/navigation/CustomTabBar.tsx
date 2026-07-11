import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/theme';
import { useHaptics } from '../../hooks/useHaptics';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, typography, radius } = useTheme();
  const { lightImpact } = useHaptics();
  const insets = useSafeAreaInsets();

  // Hide tab bar on sub-screens (any screen in the nested stack that is not the main index list)
  const currentTab = state.routes[state.index];
  if (
    currentTab.name === '(memberships)' ||
    currentTab.name === 'memberships' ||
    currentTab.name === '(support)' ||
    currentTab.name === 'support'
  ) {
    return null;
  }
  const nestedRouteName = currentTab.state?.routes?.[currentTab.state.index]?.name;
  if (nestedRouteName && nestedRouteName !== 'index') {
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

          if (!event.defaultPrevented) {
            const hasSubScreens = ['(dashboard)', '(members)', '(staffs)', '(attendance)', '(billing)', '(reports)', '(more)'].includes(route.name);
            if (hasSubScreens) {
              navigation.navigate(route.name, { screen: 'index' });
            } else {
              navigation.navigate(route.name, route.params);
            }
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
      transform: [{
        scale: withSpring(isFocused ? 1.15 : 1, {
          damping: 14,
          stiffness: 220,
        })
      }],
    };
  });

  const animatedColor = isFocused ? colors.primary : colors.textMuted;

  const labelStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isFocused ? 1 : 0.7),
    transform: [
      {
        translateY: withSpring(isFocused ? 0 : 2)
      }
    ]
  }));

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
            { backgroundColor: colors.primary, borderRadius: radius.full, borderColor: colors.surface },
            animatedScale
          ]}
        >
          {options.tabBarIcon && options.tabBarIcon({ focused: isFocused, color: '#FFF', size: 20 })}
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
      <Animated.View
        style={[
          styles.activeContainer,
          {
            backgroundColor: isFocused
              ? colors.primary + '15'
              : 'transparent',
          },
          animatedScale,
        ]}
      >
        {options.tabBarIcon && options.tabBarIcon({ focused: isFocused, color: animatedColor, size: 12 })}
      </Animated.View>
      <Animated.Text
        style={[
          styles.tabLabel,
          { color: animatedColor, fontWeight: isFocused ? '600' : '500' },
          labelStyle
        ]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 5,
    right: 5,
    bottom: 0,

    flexDirection: 'row',
    alignItems: 'center',

    height: 92,

    paddingHorizontal: 8,
    paddingVertical: 8,

    borderRadius: 24,
    borderTopWidth: 0,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 18,
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
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  checkInContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  checkInButton: {
    width: 64,
    height: 64,
    marginTop: -34,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10
    },
    elevation: 14,
  },
  activeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
});
