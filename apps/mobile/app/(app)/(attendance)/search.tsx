import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '../../../src/theme/theme';
import { Search } from 'lucide-react-native';
import { useMembers } from '../../../src/hooks/useMembers';
import { useWorkspaceStore } from '../../../src/store/workspace.store';
import { useCheckIn } from '../../../src/hooks/useAttendance';
import { ListItem } from '../../../src/components/ListItem';
import { UserAvatar } from '../../../src/components/UserAvatar';
import { EmptyState } from '../../../src/components/EmptyState';
import { useHaptics } from '../../../src/hooks/useHaptics';
import { useRouter } from 'expo-router';

export default function AttendanceSearchScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const { activeGymId } = useWorkspaceStore();
  const { success, error, mediumImpact } = useHaptics();
  const router = useRouter();

  // useMembers(search, filters) — the active gym is resolved inside the hook.
  const { data: membersPage, isLoading } = useMembers(searchQuery);
  const members = useMemo(() => membersPage?.pages.flatMap((p) => p.data) || [], [membersPage]);

  const checkInMutation = useCheckIn();

  const handleCheckIn = (member: any) => {
    mediumImpact();
    Alert.alert(
      'Manual Check-In',
      `Check in ${member.firstName} ${member.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => {
            checkInMutation.mutate({ memberId: member.id, gymId: activeGymId || '', method: 'FRONT_DESK', memberName: `${member.firstName} ${member.lastName}` }, {
              onSuccess: () => {
                success();
                Alert.alert('Success', `${member.firstName} checked in successfully.`, [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              },
              onError: (err: any) => {
                error();
                Alert.alert('Error', err.message || 'Failed to check in');
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
      subtitle={item.phoneNumber}
      leftComponent={<UserAvatar name={`${item.firstName} ${item.lastName}`} size={40} />}
      onPress={() => handleCheckIn(item)}
      style={{ paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border }}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { padding: spacing.md, backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.background, borderRadius: radius.full }]}>
          <Search size={20} color={colors.textMuted} style={{ marginLeft: spacing.md }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text, fontSize: typography.sizes.body.fontSize }]}
            placeholder="Search by name or phone..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            autoCapitalize="none"
          />
        </View>
      </View>

      <FlashList
        data={members}
        renderItem={renderItem}
        estimatedItemSize={70}
        keyExtractor={(item: any) => item.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
          ) : searchQuery.length > 0 ? (
            <EmptyState
              title="No members found"
              description="Try adjusting your search terms."
              icon={<Search size={36} color={colors.textMuted} />}
              style={{ marginTop: spacing.xxl }}
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingTop: 10,
    paddingBottom: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
  },
});
