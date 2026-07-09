import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { IconButton } from '../../../src/components/IconButton';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../../src/theme/theme';

export default function NotificationsLayout() {
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
            onPress={() => router.replace('/(app)/(dashboard)')}
            accessibilityLabel="Go back"
            style={{ marginLeft: -8 }}
          />
        ),
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Details' }} />
    </Stack>
  );
}
