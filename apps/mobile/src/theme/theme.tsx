import React, { createContext, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, ThemeColors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { elevation } from './elevation';
import { opacity } from './opacity';
import { useAppStore } from '../store/app.store';
import { motion } from './motion';

export type ThemeType = 'light' | 'dark' | 'system';

export interface ThemeContextProps {
  themeMode: ThemeType;
  setThemeMode: (mode: ThemeType) => void;
  isDark: boolean;
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  elevation: typeof elevation;
  opacity: typeof opacity;
  motion: typeof motion
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();

  // Read and write theme configuration from Zustand store (persisted with MMKV)
  const themeMode = useAppStore((state) => state.themePreference);
  const setThemeMode = useAppStore((state) => state.setThemePreference);

  const resolvedIsDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const currentColors = resolvedIsDark ? darkColors : lightColors;

  const value: ThemeContextProps = {
    themeMode,
    setThemeMode,
    isDark: resolvedIsDark,
    colors: currentColors,
    typography,
    spacing,
    radius,
    elevation,
    opacity,
    motion
  };

  return (
    <ThemeContext.Provider value= { value } >
    { children }
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
