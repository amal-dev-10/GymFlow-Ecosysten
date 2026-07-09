import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, Dimensions, ScrollView, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, withSpring, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Plus, X, UserPlus, Award, CreditCard, LogIn, LogOut, Snowflake, FileText, Activity, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/theme';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import { useHaptics } from '../../hooks/useHaptics';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Shared configuration for all quick actions to be reused on the Dashboard
export const QUICK_ACTIONS = [
  { id: 'checkin', label: 'Check In', icon: LogIn, permission: 'mark-attendance', route: '/(app)/(checkin)', color: '#10B981' },
  { id: 'checkout', label: 'Check Out', icon: LogOut, permission: 'mark-attendance', route: '/(app)/(checkin)', color: '#EF4444' },
  { id: 'payment', label: 'Collect Payment', icon: CreditCard, permission: 'record-payment', route: '/(app)/(billing)/collect', color: '#3B82F6' },
  { id: 'member', label: 'Create Member', icon: UserPlus, permission: 'manage-members', route: null, color: '#8B5CF6' },
  { id: 'membership', label: 'Create Membership', icon: Award, permission: 'create-membership', route: '/(app)/(memberships)/create', color: '#F59E0B' },
  { id: 'freeze', label: 'Freeze Membership', icon: Snowflake, permission: 'freeze-membership', route: null, color: '#0EA5E9' },
  { id: 'renew', label: 'Renew Membership', icon: RefreshCw, permission: 'create-membership', route: null, color: '#14B8A6' },
  { id: 'workout', label: 'Assign Workout', icon: Activity, permission: 'assign-workout', route: null, color: '#EC4899' },
  { id: 'expenses', label: 'Add Expense', icon: FileText, permission: 'view-reports', route: null, color: '#64748B' },
];

export function GlobalFAB() {
  const { colors, radius, spacing } = useTheme();
  const { can } = useWorkspace();
  const { mediumImpact, lightImpact } = useHaptics();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  // Filter available actions based on user permissions
  const availableActions = QUICK_ACTIONS.filter(action => can(action.permission as any));

  if (availableActions.length === 0) return null; // Hide FAB if no actions available

  const toggleOpen = () => {
    mediumImpact();
    setIsOpen(!isOpen);
  };

  const handleAction = (route: string | null, actionName: string) => {
    lightImpact();
    setIsOpen(false);
    if (route) {
      router.push(route as any);
    } else {
      // Feature not implemented yet
      setTimeout(() => alert(`${actionName} coming soon!`), 300);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100 }]}
        >
          <Pressable style={{ flex: 1 }} onPress={toggleOpen} />
        </Animated.View>
      )}

      {/* Bottom Sheet */}
      {isOpen && (
        <Animated.View
          entering={SlideInDown.duration(250)}
          exiting={SlideOutDown.duration(200)}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
            }
          ]}
        >
          <View style={styles.sheetHeader}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Quick Actions</Text>
            <Pressable onPress={toggleOpen} style={{ padding: 8, backgroundColor: colors.background, borderRadius: radius.full }}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.grid}>
            {availableActions.map((action, index) => (
              <Animated.View key={action.id} entering={FadeIn.delay(index * 40).duration(200)}>
                <Pressable
                  onPress={() => handleAction(action.route, action.label)}
                  style={({ pressed }) => [
                    styles.actionItem,
                    { backgroundColor: pressed ? colors.background : 'transparent', borderRadius: radius.md }
                  ]}
                >
                  <View style={[styles.iconBox, { backgroundColor: action.color + '15' }]}>
                    <action.icon size={24} color={action.color} />
                  </View>
                  <Text style={{ marginTop: 8, fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center' }}>
                    {action.label}
                  </Text>
                </Pressable>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* FAB Button */}
      <Animated.View
        style={[
          styles.fabContainer,
          { bottom: (Platform.OS === 'ios' ? 18 : 84) + 12 } // Float exactly 12 units above the custom tab bar
        ]}
      >
        <Pressable
          onPress={toggleOpen}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.primary, borderRadius: radius.full, transform: [{ scale: pressed ? 0.95 : 1 }] }
          ]}
        >
          <Animated.View style={{ transform: [{ rotate: isOpen ? '45deg' : '0deg' }] }}>
            <Plus size={28} color="#FFF" />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 101, // Above backdrop
  },
  fab: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 101,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionItem: {
    width: (SCREEN_WIDTH - 40) / 3 - 10,
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
