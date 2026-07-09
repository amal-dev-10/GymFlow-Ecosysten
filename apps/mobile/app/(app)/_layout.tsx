import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { LayoutDashboard, Users, ScanLine, MoreHorizontal, CreditCard, Dumbbell, BarChart2, UserCog } from 'lucide-react-native';

import { useWorkspace } from '../../src/providers/WorkspaceProvider';
import { CustomTabBar } from '../../src/components/navigation/CustomTabBar';
import { GlobalFAB } from '../../src/components/navigation/QuickActions';
import { GlobalSearchModal } from '../../src/components/search/GlobalSearchModal';

export default function AppLayout() {
  const { can } = useWorkspace();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        initialRouteName="(dashboard)"
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="(dashboard)"
          options={{
            title: 'Dashboard',
            href: can('view-dashboard') ? '/(app)/(dashboard)' : null,
            tabBarItemStyle: { display: can('view-dashboard') ? 'flex' : 'none' },
            tabBarIcon: ({ color, focused }) => (
              <LayoutDashboard size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="(members)"
          options={{
            title: 'Members',
            href: can('manage-members') ? '/(app)/(members)' : null,
            tabBarItemStyle: { display: can('manage-members') ? 'flex' : 'none' },
            tabBarIcon: ({ color, focused }) => (
              <Users size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="(staffs)"
          options={{
            title: 'Staffs',
            href: can('manage-staff') ? '/(app)/(staffs)' : null,
            tabBarItemStyle: { display: can('manage-staff') ? 'flex' : 'none' },
            tabBarIcon: ({ color, focused }) => (
              <UserCog size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="(attendance)"
          options={{
            title: 'Check-In',
            href: can('mark-attendance') ? '/(app)/(attendance)' : null,
            tabBarItemStyle: { display: can('mark-attendance') ? 'flex' : 'none' },
            tabBarIcon: ({ color, focused }) => (
              <ScanLine size={28} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="(billing)"
          options={{
            title: 'Payments',
            href: can('record-payment') ? '/(app)/(billing)' : null,
            tabBarItemStyle: { display: can('record-payment') ? 'flex' : 'none' },
            tabBarIcon: ({ color, focused }) => (
              <CreditCard size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="(reports)"
          options={{
            title: 'Reports',
            href: can('view-reports') ? '/(app)/(reports)' : null,
            tabBarItemStyle: { display: can('view-reports') ? 'flex' : 'none' },
            tabBarIcon: ({ color, focused }) => (
              <BarChart2 size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        {/* Memberships hidden from bottom bar */}
        <Tabs.Screen
          name="(memberships)"
          options={{
            title: 'Memberships',
            href: null,
            tabBarItemStyle: { display: 'none' },
          }}
        />
        {/* Notifications stack hidden from bottom bar (accessed via header bell) */}
        <Tabs.Screen
          name="(notifications)"
          options={{
            title: 'Notifications',
            href: null,
            tabBarItemStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="(more)"
          options={{
            title: 'More',
            href: '/(app)/(more)', // Always visible
            tabBarIcon: ({ color, focused }) => (
              <MoreHorizontal size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
      </Tabs>

      {/* Spotlight Command Center Search Modal */}
      <GlobalSearchModal />
    </View>
  );
}
