import React from 'react';
import { Stack } from 'expo-router';

export default function MoreLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="organization" />
      <Stack.Screen name="announcements" />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/appearance" />
      <Stack.Screen name="settings/notifications" />
      <Stack.Screen name="settings/security" />
      <Stack.Screen name="settings/offline" />
      <Stack.Screen name="settings/devices" />
    </Stack>
  );
}
