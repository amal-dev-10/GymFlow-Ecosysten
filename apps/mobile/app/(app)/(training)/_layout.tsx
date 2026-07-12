import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { IconButton } from '@/components/IconButton';
import { ChevronLeft } from 'lucide-react-native';

export default function TrainingLayout() {
  const { colors, typography } = useTheme();
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontSize: typography.sizes.title.fontSize,
          fontWeight: typography.sizes.title.fontWeight as any,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        headerLeft: () => (
          <IconButton
            icon={<ChevronLeft size={24} color={colors.text} />}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/(more)'))}
            accessibilityLabel="Go back"
            style={{ marginLeft: -8 }}
          />
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Exercise Library' }} />
      <Stack.Screen name="[id]" options={{ title: 'Exercise' }} />
    </Stack>
  );
}
