import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { IconButton } from '../../../src/components/IconButton';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../../src/theme/theme';

export default function AttendanceLayout() {
  const router = useRouter();
  const { colors, typography } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontSize: typography.sizes.title.fontSize,
          fontWeight: typography.sizes.title.fontWeight,
        },
        headerLeft: () => (
          <IconButton
            icon={<ChevronLeft size={24} color={colors.text} />}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            style={{ marginLeft: -8 }}
          />
        ),
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="scan" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="active" options={{ title: 'Active Members Inside' }} />
      <Stack.Screen name="search" options={{ title: 'Manual Search', presentation: 'modal' }} />
    </Stack>
  );
}
