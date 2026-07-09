import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { IconButton } from '../../../src/components/IconButton';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../../src/theme/theme';

export default function MembershipsLayout() {
  const router = useRouter();
  const { colors, typography } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontSize: typography.sizes.title.fontSize,
          fontWeight: typography.sizes.title.fontWeight,
        },
        headerShadowVisible: false,
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
      <Stack.Screen name="[id]" options={{ title: 'Membership Details' }} />
      <Stack.Screen name="create" options={{ title: 'New Membership', presentation: 'modal' }} />
      <Stack.Screen name="renew" options={{ title: 'Renew Membership', presentation: 'modal' }} />
      <Stack.Screen name="freeze" options={{ title: 'Freeze Membership', presentation: 'modal' }} />
      <Stack.Screen name="adjust" options={{ title: 'Adjust Membership', presentation: 'modal' }} />
    </Stack>
  );
}
