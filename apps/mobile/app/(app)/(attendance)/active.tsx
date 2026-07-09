import React from 'react';
import { StyleSheet, View, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../src/theme/theme';
import { useWorkspaceStore } from '../../../src/store/workspace.store';
import { useActiveMembers, useCheckOut } from '../../../src/hooks/useAttendance';
import { ListItem } from '../../../src/components/ListItem';
import { EmptyState } from '../../../src/components/EmptyState';
import { UserAvatar } from '../../../src/components/UserAvatar';
import { LogOut, Users } from 'lucide-react-native';
import { IconButton } from '../../../src/components/IconButton';
import { useHaptics } from '../../../src/hooks/useHaptics';

export default function ActiveMembersScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { activeGymId } = useWorkspaceStore();
  const { success } = useHaptics();

  const { data: members, isLoading, refetch, isFetching } = useActiveMembers(activeGymId || '');
  const checkOutMutation = useCheckOut();

  const handleCheckOut = (member: any) => {
    Alert.alert(
      'Check-Out',
      `Are you sure you want to check out ${member.firstName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Check-Out', 
          onPress: () => {
            checkOutMutation.mutate({ memberId: member.id, gymId: activeGymId || '' }, {
              onSuccess: () => {
                success();
              }
            });
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <ListItem
      title={`${item.firstName} ${item.lastName}`}
      subtitle={`Checked in at ${new Date(item.checkInTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
      leftComponent={<UserAvatar name={`${item.firstName} ${item.lastName}`} size={40} />}
      rightComponent={
        <IconButton 
          icon={<LogOut size={20} color={colors.primary} />} 
          onPress={() => handleCheckOut(item)}
          style={{ backgroundColor: colors.primary + '10' }}
        />
      }
      onPress={() => router.push(`/(app)/(members)/${item.id}`)}
      style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlashList
        data={members || []}
        renderItem={renderItem}
        estimatedItemSize={70}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
          ) : (
            <EmptyState
              title="No active members"
              description="There are currently no members checked into this branch."
              icon={<Users size={36} color={colors.textMuted} />}
              style={{ marginTop: spacing.xxl }}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
