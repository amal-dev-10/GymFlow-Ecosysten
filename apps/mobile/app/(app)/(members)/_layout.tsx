import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { IconButton } from '../../../src/components/IconButton';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../../src/theme/theme';

export default function MembersLayout() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerShadowVisible: false,
        headerTintColor: colors.text,
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
      <Stack.Screen name="[id]" options={{ title: 'Member Profile' }} />
      <Stack.Screen name="create" options={{ title: 'Add Member' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Edit Member' }} />
      <Stack.Screen name="[id]/membership" options={{ title: 'Membership' }} />
      <Stack.Screen name="[id]/freeze" options={{ title: 'Freeze' }} />
      <Stack.Screen
        name="scan"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
    </Stack>
  );
}
