import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme/theme';

export default function LobbyLayout() {
  const { colors, typography } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: typography.sizes.title.fontWeight as any,
          fontSize: typography.sizes.title.fontSize,
        },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="organizations" options={{ title: 'Select Organization', headerBackVisible: false }} />
      <Stack.Screen name="gyms" options={{ title: 'Select Gym' }} />
      <Stack.Screen name="create-organization" options={{ title: 'Create Organization' }} />
    </Stack>
  );
}
