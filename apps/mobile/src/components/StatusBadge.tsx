import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/theme';

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'default';

export interface StatusBadgeProps {
  label: string;
  type?: StatusType;
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  type = 'default',
  style,
}) => {
  const { colors, typography, radius, spacing } = useTheme();

  const getThemeDetails = () => {
    switch (type) {
      case 'success':
        return { bg: colors.successLight, text: colors.successText };
      case 'warning':
        return { bg: colors.warningLight, text: colors.warningText };
      case 'error':
        return { bg: colors.errorLight, text: colors.errorText };
      case 'info':
        return { bg: colors.infoLight, text: colors.infoText };
      case 'default':
      default:
        return { bg: colors.surfaceElevated, text: colors.textSecondary };
    }
  };

  const { bg, text } = getThemeDetails();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          borderRadius: radius.full,
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: text,
            fontSize: typography.sizes.overline.fontSize,
            lineHeight: typography.sizes.overline.lineHeight,
            fontWeight: '600',
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
});
