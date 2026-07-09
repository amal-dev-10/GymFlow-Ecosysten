import { Platform } from 'react-native';

const systemFont = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

const fontWeights = {
  thin: '100' as const,
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
};

export const typography = {
  fonts: {
    // Falls back to system font if custom font (e.g. Inter) is loading/unavailable
    display: systemFont,
    body: systemFont,
  },
  
  sizes: {
    display: {
      fontSize: 34,
      lineHeight: 40,
      fontWeight: fontWeights.bold,
      letterSpacing: -0.5,
    },
    headline: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: fontWeights.bold,
      letterSpacing: -0.3,
    },
    title: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: fontWeights.semibold,
      letterSpacing: -0.2,
    },
    subtitle: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: fontWeights.medium,
      letterSpacing: -0.1,
    },
    body: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: fontWeights.regular,
      letterSpacing: 0,
    },
    bodyMedium: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: fontWeights.medium,
      letterSpacing: 0,
    },
    caption: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: fontWeights.regular,
      letterSpacing: 0.1,
    },
    label: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: fontWeights.semibold,
      letterSpacing: 0.2,
    },
    overline: {
      fontSize: 10,
      lineHeight: 14,
      fontWeight: fontWeights.bold,
      letterSpacing: 1.0,
      textTransform: 'uppercase' as const,
    },
  },
  
  weights: fontWeights,
};

export type TypographyType = typeof typography;
export type TypographySizeKey = keyof typeof typography.sizes;
