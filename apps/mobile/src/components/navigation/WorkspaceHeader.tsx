import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, interpolate, Extrapolation, SharedValue, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Bell, ChevronDown, Building2, Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSearchStore } from '../../store/search.store';
import { useNotificationsStore } from '../../store/notifications.store';

import { useTheme } from '../../theme/theme';
import { useAuthStore } from '../../store/auth.store';
import { useWorkspaceStore } from '../../store/workspace.store';
import { UserAvatar } from '../UserAvatar';
import { IconButton } from '../IconButton';
import { useHaptics } from '../../hooks/useHaptics';

interface WorkspaceHeaderProps {
  scrollY?: SharedValue<number>;
  activeInside?: number;
}

function PulseDot({ color }: { color: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }), -1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pulseStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 1], [1, 2.2]);
    const opacity = interpolate(progress.value, [0, 0.8, 1], [0.5, 0.3, 0]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <View style={{ width: 6, height: 6, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: color,
          },
          pulseStyle,
        ]}
      />
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
    </View>
  );
}

const formatToday = () => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

export function WorkspaceHeader({ scrollY, activeInside }: WorkspaceHeaderProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { activeGymName, clearWorkspace } = useWorkspaceStore();
  const { mediumImpact } = useHaptics();
  const unreadCount = useNotificationsStore((state) => state.unreadCount);

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSwitchWorkspace = () => {
    mediumImpact();
    clearWorkspace();
    router.replace('/(lobby)/organizations');
  };

  const animatedStyle = useAnimatedStyle(() => {
    if (!scrollY) return {};
    
    // Collapse the header slightly as user scrolls down
    const translateY = interpolate(scrollY.value, [0, 100], [0, -20], Extrapolation.CLAMP);
    const opacity = interpolate(scrollY.value, [0, 100], [1, 0.9], Extrapolation.CLAMP);
    const scale = interpolate(scrollY.value, [0, 100], [1, 0.98], Extrapolation.CLAMP);

    return {
      transform: [{ translateY }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      entering={FadeInDown.duration(500).springify()}
      style={[
        {
          backgroundColor: colors.primary,
          borderRadius: radius.xl,
          padding: spacing.xl,
          marginBottom: spacing.lg,
          overflow: 'hidden',
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.28,
          shadowRadius: 16,
          elevation: 8,
        },
        animatedStyle
      ]}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -70,
          right: -50,
          width: 190,
          height: 190,
          borderRadius: 95,
          backgroundColor: 'rgba(255,255,255,0.13)',
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: -80,
          left: -40,
          width: 150,
          height: 150,
          borderRadius: 75,
          backgroundColor: 'rgba(255,255,255,0.08)',
        }}
      />

      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={{ color: colors.textOnPrimary, fontSize: typography.sizes.body.fontSize, opacity: 0.85, fontWeight: '500' }}>
            {getGreeting()},
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: colors.textOnPrimary,
              fontSize: typography.sizes.display.fontSize,
              lineHeight: typography.sizes.display.lineHeight,
              fontWeight: '800',
              letterSpacing: -0.5,
              marginTop: 2,
            }}
          >
            {user?.name || 'Staff'}
          </Text>
          <Text style={{ color: colors.textOnPrimary, opacity: 0.7, fontSize: typography.sizes.caption.fontSize, fontWeight: '600', marginTop: 4 }}>
            {formatToday()}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton
            icon={<Search size={20} color={colors.textOnPrimary} />}
            onPress={() => {
              mediumImpact();
              useSearchStore.getState().openSearch();
            }}
            accessibilityLabel="Search"
            variant="ghost"
          />
          <View style={{ position: 'relative' }}>
            <IconButton
              icon={<Bell size={20} color={colors.textOnPrimary} />}
              onPress={() => {
                mediumImpact();
                router.push('/(app)/(notifications)');
              }}
              accessibilityLabel="Notifications"
              variant="ghost"
            />
            {unreadCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.error,
                  borderWidth: 1.5,
                  borderColor: colors.primary,
                }}
              />
            )}
          </View>
          <UserAvatar name={user?.name || 'Staff'} size={44} showOnlineStatus isOnline />
        </View>
      </View>

      <View style={styles.headerFooter}>
        <Pressable
          onPress={handleSwitchWorkspace}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.18)',
              paddingLeft: spacing.sm,
              paddingRight: spacing.md,
              paddingVertical: 8,
              borderRadius: radius.full,
              gap: 6,
              flexShrink: 1,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Building2 size={14} color={colors.textOnPrimary} />
          <Text
            numberOfLines={1}
            style={{ color: colors.textOnPrimary, fontSize: typography.sizes.caption.fontSize, fontWeight: '700', flexShrink: 1 }}
          >
            {(activeGymName || 'Gym')}
          </Text>
          <ChevronDown size={14} color={colors.textOnPrimary} style={{ opacity: 0.8 }} />
        </Pressable>

        {typeof activeInside === 'number' && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              backgroundColor: 'rgba(255,255,255,0.18)',
              paddingHorizontal: spacing.md,
              paddingVertical: 8,
              borderRadius: radius.full,
            }}
          >
            <PulseDot color={colors.textOnPrimary} />
            <Text style={{ color: colors.textOnPrimary, fontSize: typography.sizes.caption.fontSize, fontWeight: '700' }}>
              {activeInside} inside now
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
});
