import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../theme/theme';

export interface UserAvatarProps {
  uri?: string;
  name: string;
  size?: number;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  style?: ViewStyle;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  uri,
  name,
  size = 40,
  showOnlineStatus = false,
  isOnline = false,
  style,
}) => {
  const { colors, typography, radius } = useTheme();

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const initials = getInitials(name);
  const avatarRadius = size / 2;
  const statusSize = Math.max(8, size * 0.2);

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: avatarRadius }]}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: avatarRadius,
              backgroundColor: colors.primaryLight,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.initials,
              {
                color: colors.primary,
                fontSize: Math.max(10, size * 0.4),
                fontWeight: '600',
              },
            ]}
          >
            {initials}
          </Text>
        </View>
      )}

      {showOnlineStatus && (
        <View
          style={[
            styles.statusDot,
            {
              width: statusSize,
              height: statusSize,
              borderRadius: statusSize / 2,
              backgroundColor: isOnline ? colors.success : colors.textMuted,
              borderColor: colors.surface,
              borderWidth: size > 30 ? 2 : 1,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  initials: {
    textAlign: 'center',
  },
  statusDot: {
    position: 'absolute',
  },
});
