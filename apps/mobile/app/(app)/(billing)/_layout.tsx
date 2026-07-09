import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/theme/theme';

export default function BillingLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '700',
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Payments',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="collect"
        options={{
          title: 'Collect Payment',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="pending"
        options={{
          title: 'Pending Dues',
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: 'Payment History',
        }}
      />
      <Stack.Screen
        name="invoices/[id]"
        options={{
          title: 'Invoice Details',
        }}
      />
      <Stack.Screen
        name="receipts/[id]"
        options={{
          title: 'Digital Receipt',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
