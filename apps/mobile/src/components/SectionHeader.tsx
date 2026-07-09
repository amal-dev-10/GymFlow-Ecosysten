import React from 'react';
import { StyleSheet, Text, View, Pressable, ViewStyle } from 'react-native';
import { useTheme } from '../theme/theme';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionLabel,
  onActionPress,
  style,
}) => {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.container, { marginBottom: spacing.md }, style]}>
      <Text
        style={[
          styles.title,
          {
            color: colors.text,
            fontSize: typography.sizes.title.fontSize,
            lineHeight: typography.sizes.title.lineHeight,
            fontWeight: typography.sizes.title.fontWeight,
          },
        ]}
      >
        {title}
      </Text>
      
      {actionLabel && onActionPress && (
        <Pressable onPress={onActionPress} accessibilityRole="button" accessibilityLabel={actionLabel}>
          <Text
            style={[
              styles.action,
              {
                color: colors.primary,
                fontSize: typography.sizes.bodyMedium.fontSize,
                fontWeight: '600',
              },
            ]}
          >
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {},
  action: {},
});
