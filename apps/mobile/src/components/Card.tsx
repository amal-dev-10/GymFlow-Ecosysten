import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/theme';

// Generic surface container matching the border/radius/elevation styling
// already used ad-hoc by MetricCard/InfoCard — factored out so dashboard
// sections (and anything else) can wrap arbitrary content consistently
// instead of repeating the same style object everywhere.
export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, padded = true }) => {
  const { colors, radius, spacing, elevation } = useTheme();

  return (
    <View
      style={[
        styles.container,
        elevation.xs,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: padded ? spacing.lg : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
