import React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { IconButton } from '@/components/IconButton';
import { ChevronLeft } from 'lucide-react-native';

export default function SupportLayout() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const segments = useSegments();

  const currentScreen = segments[segments.length - 1];
  const isRoot = currentScreen === 'support' || currentScreen === '(support)' || currentScreen === 'index';

  const handleBack = () => {
    if (isRoot) {
      router.replace('/(app)/(more)');
    } else {
      router.back();
    }
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontSize: typography.sizes.title.fontSize,
          fontWeight: typography.sizes.title.fontWeight,
        },
        headerShadowVisible: false,
        headerLeft: () => (
          <IconButton
            icon={<ChevronLeft size={24} color={colors.text} />}
            onPress={handleBack}
            accessibilityLabel="Go back"
            style={{ marginLeft: -8 }}
          />
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Help & Support', gestureEnabled: false }} />
      <Stack.Screen name="new" options={{ title: 'New Ticket', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Ticket Details' }} />
    </Stack>
  );
}
