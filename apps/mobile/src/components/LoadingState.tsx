import React from 'react';
import { StyleSheet, ActivityIndicator, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/theme';

export interface LoadingStateProps {
  message?: string;
  overlay?: boolean;
  style?: ViewStyle;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  overlay = false,
  style,
}) => {
  const { colors, typography, spacing } = useTheme();

  if (overlay) {
    return (
      <View style={[styles.overlayContainer, { backgroundColor: colors.overlay }, style]}>
        <View style={[styles.dialogCard, { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.xl }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          {message && (
            <Text
              style={[
                styles.message,
                {
                  color: colors.text,
                  fontSize: typography.sizes.bodyMedium.fontSize,
                  marginTop: spacing.md,
                },
              ]}
            >
              {message}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && (
        <Text
          style={[
            styles.message,
            {
              color: colors.textSecondary,
              fontSize: typography.sizes.body.fontSize,
              marginTop: spacing.sm,
            },
          ]}
        >
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  dialogCard: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  message: {
    textAlign: 'center',
  },
});
