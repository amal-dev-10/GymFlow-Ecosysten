export const palette = {
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
  indigo: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
    950: '#1E1B4B',
  },
  emerald: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  rose: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    200: '#FECDD3',
    300: '#FDA4AF',
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
    700: '#BE123C',
    800: '#9F1239',
    900: '#881337',
  },
  blue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  common: {
    white: '#FFFFFF',
    black: '#000000',
  },
};

export const lightColors = {
  primary: palette.indigo[600],
  primaryLight: palette.indigo[50],
  primaryDark: palette.indigo[800],
  
  background: palette.slate[50],
  surface: palette.common.white,
  surfaceElevated: palette.slate[100],
  surfaceOverlay: palette.common.white,
  
  border: palette.slate[200],
  borderStrong: palette.slate[300],
  
  text: palette.slate[900],
  textSecondary: palette.slate[500],
  textMuted: palette.slate[400],
  textOnPrimary: palette.common.white,
  
  success: palette.emerald[600],
  successLight: palette.emerald[50],
  successText: palette.emerald[700],
  
  warning: palette.amber[500],
  warningLight: palette.amber[50],
  warningText: palette.amber[700],
  
  error: palette.rose[600],
  errorLight: palette.rose[50],
  errorText: palette.rose[700],
  
  info: palette.blue[600],
  infoLight: palette.blue[50],
  infoText: palette.blue[700],

  ripple: 'rgba(0, 0, 0, 0.05)',
  overlay: 'rgba(15, 23, 42, 0.4)',
};

export const darkColors = {
  primary: palette.indigo[400],
  primaryLight: palette.indigo[950],
  primaryDark: palette.indigo[300],
  
  background: palette.slate[950],
  surface: palette.slate[900],
  surfaceElevated: palette.slate[800],
  surfaceOverlay: palette.slate[800],
  
  border: palette.slate[800],
  borderStrong: palette.slate[700],
  
  text: palette.slate[50],
  textSecondary: palette.slate[400],
  textMuted: palette.slate[500],
  textOnPrimary: palette.slate[950],
  
  success: palette.emerald[400],
  successLight: 'rgba(16, 185, 129, 0.1)',
  successText: palette.emerald[300],
  
  warning: palette.amber[400],
  warningLight: 'rgba(245, 158, 11, 0.1)',
  warningText: palette.amber[300],
  
  error: palette.rose[400],
  errorLight: 'rgba(244, 63, 94, 0.1)',
  errorText: palette.rose[300],
  
  info: palette.blue[400],
  infoLight: 'rgba(59, 130, 246, 0.1)',
  infoText: palette.blue[300],

  ripple: 'rgba(255, 255, 255, 0.05)',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export type ThemeColors = typeof lightColors;
