import React, { useMemo, useState, useRef, useEffect } from 'react';
import { StyleSheet, View, FlatList, Platform, Text, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Users, UserPlus, Phone, MapPin, ShieldCheck, Mail, Edit, Trash2, Check, UserCog } from 'lucide-react-native';
import { useTheme } from '../../../src/theme/theme';
import { ListItem } from '../../../src/components/ListItem';
import { SearchBar } from '../../../src/components/SearchBar';
import { UserAvatar } from '../../../src/components/UserAvatar';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { LoadingState } from '../../../src/components/LoadingState';
import { ErrorState } from '../../../src/components/ErrorState';
import { EmptyState } from '../../../src/components/EmptyState';
import { MetricCard } from '../../../src/components/MetricCard';
import { BottomSheet, BottomSheetRef } from '../../../src/components/BottomSheet';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { SecondaryButton } from '../../../src/components/SecondaryButton';
import { FloatingActionButton } from '../../../src/components/FloatingActionButton';
import { 
  useUsers, 
  useInvitations, 
  useUserStats, 
  useRemoveUser, 
  useToggleUserStatus, 
  useRoles, 
  useGyms,
  useInviteUser,
  useChangeUserRole,
  useAssignGyms
} from '../../../src/hooks/useUsers';

export default function UsersScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users');
  const [searchQuery, setSearchQuery] = useState('');

  // Data fetching
  const { data: users, isLoading: usersLoading, isError: usersError, error: uErr, refetch: refetchUsers, isRefetching: isRefetchingUsers } = useUsers();
  const { data: invitations, isLoading: invLoading, isError: invError, error: iErr, refetch: refetchInv, isRefetching: isRefetchingInv } = useInvitations();
  const { data: stats, refetch: refetchStats } = useUserStats();
  const { data: roles } = useRoles();
  const { data: gyms } = useGyms();
  
  // Mutations
  const removeUserMutation = useRemoveUser();
  const toggleStatusMutation = useToggleUserStatus();
  const inviteUserMutation = useInviteUser();
  const changeRoleMutation = useChangeUserRole();
  const assignGymsMutation = useAssignGyms();

  // Bottom Sheets
  const actionSheetRef = useRef<BottomSheetRef>(null);
  const inviteSheetRef = useRef<BottomSheetRef>(null);
  const roleSheetRef = useRef<BottomSheetRef>(null);
  const gymSheetRef = useRef<BottomSheetRef>(null);

  // Form states
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  
  // Invite form
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviteGymIds, setInviteGymIds] = useState<string[]>([]);

  // Management form
  const [mgmtRoleId, setMgmtRoleId] = useState('');
  const [mgmtGymIds, setMgmtGymIds] = useState<string[]>([]);

  const filteredUsers = useMemo(() => {
    const list = users ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s: any) =>
        s.name.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        (s.email && s.email.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  const filteredInvitations = useMemo(() => {
    const list = invitations ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s: any) => s.phoneNumber.includes(q)
    );
  }, [invitations, searchQuery]);

  const handleUserPress = (user: any) => {
    setSelectedUser(user);
    setMgmtRoleId(user.roles?.[0]?.id || user.role?.id || '');
    setMgmtGymIds(user.gyms?.map((g: any) => g.id) || []);
    actionSheetRef.current?.show();
  };

  const handleToggleStatus = () => {
    if (!selectedUser) return;
    const nextStatus = selectedUser.status === 'active' ? false : true;
    toggleStatusMutation.mutate(
      { userId: selectedUser.id, isActive: nextStatus },
      {
        onSuccess: () => {
          actionSheetRef.current?.hide();
          refetchUsers();
          refetchStats();
        }
      }
    );
  };

  const handleRemoveUser = () => {
    if (!selectedUser) return;
    Alert.alert('Remove User', 'Are you sure you want to remove this user from the organization?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        removeUserMutation.mutate(selectedUser.id, {
          onSuccess: () => {
            actionSheetRef.current?.hide();
            refetchUsers();
            refetchStats();
          }
        });
      }}
    ]);
  };

  const handleInviteSubmit = () => {
    if (!invitePhone.trim()) {
      Alert.alert('Error', 'Please enter a phone number.');
      return;
    }
    if (!inviteRoleId) {
      Alert.alert('Error', 'Please select a role.');
      return;
    }

    inviteUserMutation.mutate({
      phoneNumber: invitePhone,
      fullName: inviteFullName,
      email: inviteEmail,
      message: inviteMessage,
      roleId: inviteRoleId,
      roleIds: [inviteRoleId],
      gymIds: inviteGymIds,
    }, {
      onSuccess: () => {
        Alert.alert('Success', 'User invited successfully!');
        setInvitePhone('');
        setInviteFullName('');
        setInviteEmail('');
        setInviteMessage('');
        setInviteRoleId('');
        setInviteGymIds([]);
        inviteSheetRef.current?.hide();
        refetchInv();
        refetchStats();
      },
      onError: (err: any) => {
        Alert.alert('Error', err?.message || 'Failed to invite user.');
      }
    });
  };

  const handleChangeRoleSubmit = () => {
    if (!selectedUser || !mgmtRoleId) return;
    changeRoleMutation.mutate({
      userId: selectedUser.id,
      roleId: mgmtRoleId,
      roleIds: [mgmtRoleId]
    }, {
      onSuccess: () => {
        Alert.alert('Success', 'Role updated successfully.');
        roleSheetRef.current?.hide();
        refetchUsers();
      },
      onError: (err: any) => {
        Alert.alert('Error', err?.message || 'Failed to change role.');
      }
    });
  };

  const handleAssignGymsSubmit = () => {
    if (!selectedUser) return;
    assignGymsMutation.mutate({
      userId: selectedUser.id,
      gymIds: mgmtGymIds
    }, {
      onSuccess: () => {
        Alert.alert('Success', 'Gym branch assignments updated.');
        gymSheetRef.current?.hide();
        refetchUsers();
      },
      onError: (err: any) => {
        Alert.alert('Error', err?.message || 'Failed to update gym assignments.');
      }
    });
  };

  const toggleInviteGym = (gymId: string) => {
    setInviteGymIds(prev => 
      prev.includes(gymId) ? prev.filter(id => id !== gymId) : [...prev, gymId]
    );
  };

  const toggleMgmtGym = (gymId: string) => {
    setMgmtGymIds(prev => 
      prev.includes(gymId) ? prev.filter(id => id !== gymId) : [...prev, gymId]
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
          <Text
            style={{
              fontSize: typography.sizes.display.fontSize,
              fontWeight: '800',
              color: colors.text,
              letterSpacing: -0.5,
            }}
          >
            Team
          </Text>
          {users && (
            <Text
              style={{
                fontSize: typography.sizes.title.fontSize,
                fontWeight: '600',
                color: colors.textSecondary,
              }}
            >
              {users.length}
            </Text>
          )}
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.caption.fontSize, marginTop: 4 }}>
          Manage users and invitations
        </Text>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <MetricCard
            label="Active Users"
            value={String(stats?.activeUsers ?? 0)}
            icon={<Users size={20} color={colors.primary} />}
          />
          <MetricCard
            label="Pending Invites"
            value={String(stats?.pendingInvitations ?? 0)}
            icon={<UserPlus size={20} color={colors.warning} />}
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.surface, marginHorizontal: spacing.lg, borderRadius: radius.lg, padding: 4, marginBottom: spacing.md }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'users' && { backgroundColor: colors.primary, borderRadius: radius.md }]} 
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' ? { color: colors.surface, fontWeight: '700' } : { color: colors.textSecondary }]}>Users ({users?.length || 0})</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'invitations' && { backgroundColor: colors.primary, borderRadius: radius.md }]} 
          onPress={() => setActiveTab('invitations')}
        >
          <Text style={[styles.tabText, activeTab === 'invitations' ? { color: colors.surface, fontWeight: '700' } : { color: colors.textSecondary }]}>Invitations ({invitations?.length || 0})</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={activeTab === 'users' ? "Search users..." : "Search invitations..."}
        />
      </View>

      {activeTab === 'users' ? (
        usersLoading ? (
          <LoadingState message="Loading users..." />
        ) : usersError ? (
          <ErrorState message={(uErr as Error)?.message || 'Could not load users.'} onRetry={refetchUsers} />
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            refreshing={isRefetchingUsers}
            onRefresh={refetchUsers}
            contentContainerStyle={[
              styles.listContainer,
              { paddingBottom: Platform.OS === 'ios' ? 100 : 80 },
              filteredUsers.length === 0 && styles.emptyContainer,
            ]}
            ListEmptyComponent={
              <EmptyState
                icon={<Users size={48} color={colors.textMuted} />}
                title={searchQuery ? 'No matches' : 'No users found'}
                description={
                  searchQuery
                    ? 'No users match your search.'
                    : 'Team members you add will appear here.'
                }
              />
            }
            renderItem={({ item, index }) => {
              const userRoles = item.roles?.map((r: any) => r.name).join(', ') || item.role?.name || 'No Role';
              const userGyms = item.gyms?.length ? item.gyms.map((g: any) => g.name).join(', ') : 'No Branch';
              return (
                <Animated.View entering={FadeInUp.delay(Math.min(index, 8) * 50).duration(300)}>
                  <ListItem
                    title={item.name}
                    subtitle={`${userRoles} · ${userGyms}`}
                    onPress={() => handleUserPress(item)}
                    showChevron={false}
                    leftComponent={<UserAvatar name={item.name} size={40} />}
                    rightComponent={
                      <StatusBadge
                        label={item.status === 'active' ? 'Active' : 'Inactive'}
                        type={item.status === 'active' ? 'success' : 'error'}
                      />
                    }
                  />
                </Animated.View>
              );
            }}
          />
        )
      ) : (
        invLoading ? (
          <LoadingState message="Loading invitations..." />
        ) : invError ? (
          <ErrorState message={(iErr as Error)?.message || 'Could not load invitations.'} onRetry={refetchInv} />
        ) : (
          <FlatList
            data={filteredInvitations}
            keyExtractor={(item) => item.id}
            refreshing={isRefetchingInv}
            onRefresh={refetchInv}
            contentContainerStyle={[
              styles.listContainer,
              { paddingBottom: Platform.OS === 'ios' ? 100 : 80 },
              filteredInvitations.length === 0 && styles.emptyContainer,
            ]}
            ListEmptyComponent={
              <EmptyState
                icon={<UserPlus size={48} color={colors.textMuted} />}
                title={searchQuery ? 'No matches' : 'No invitations'}
                description="Pending invitations will appear here."
              />
            }
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInUp.delay(Math.min(index, 8) * 50).duration(300)}>
                <ListItem
                  title={item.phoneNumber}
                  subtitle={`Role: ${item.role?.name || 'Staff'}`}
                  onPress={() => {}}
                  showChevron={false}
                  leftComponent={
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }}>
                      <Phone size={20} color={colors.primary} />
                    </View>
                  }
                  rightComponent={
                    <StatusBadge
                      label={item.status}
                      type={item.status === 'Pending' ? 'warning' : item.status === 'Accepted' ? 'success' : 'error'}
                    />
                  }
                />
              </Animated.View>
            )}
          />
        )
      )}

      {/* Floating Action Button */}
      <FloatingActionButton
        accessibilityLabel="Invite User"
        icon={<UserPlus size={24} color="#FFF" />}
        onPress={() => inviteSheetRef.current?.show()}
        style={{ bottom: 108, right: 20 }}
      />

      {/* User Actions Sheet */}
      <BottomSheet ref={actionSheetRef} snapPoints={[400, 420]}>
        {selectedUser && (
          <View style={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl }}>
              <UserAvatar name={selectedUser.name} size={48} />
              <View>
                <Text style={{ fontSize: typography.sizes.title.fontSize, fontWeight: typography.sizes.title.fontWeight, color: colors.text }}>
                  {selectedUser.name}
                </Text>
                <Text style={{ fontSize: typography.sizes.body.fontSize, color: colors.textSecondary, marginTop: 2 }}>
                  {selectedUser.phone}
                </Text>
              </View>
            </View>

            <View style={{ gap: spacing.sm }}>
              <PrimaryButton
                label="Change Role"
                onPress={() => {
                  actionSheetRef.current?.hide();
                  roleSheetRef.current?.show();
                }}
                icon={<UserCog size={18} color={colors.textOnPrimary} style={{ marginRight: 8 }} />}
              />
              <PrimaryButton
                label="Assign Gym Access"
                onPress={() => {
                  actionSheetRef.current?.hide();
                  gymSheetRef.current?.show();
                }}
                icon={<MapPin size={18} color={colors.textOnPrimary} style={{ marginRight: 8 }} />}
              />
              <SecondaryButton
                label={selectedUser.status === 'active' ? "Deactivate User" : "Activate User"}
                onPress={handleToggleStatus}
                loading={toggleStatusMutation.isPending}
                style={selectedUser.status === 'active' ? { borderColor: colors.error } : {}}
                labelStyle={selectedUser.status === 'active' ? { color: colors.error } : {}}
              />
              <SecondaryButton
                label="Remove from Organization"
                onPress={handleRemoveUser}
                loading={removeUserMutation.isPending}
                style={{ borderColor: colors.error }}
                labelStyle={{ color: colors.error }}
              />
            </View>
          </View>
        )}
      </BottomSheet>

      {/* Invite User Sheet */}
      <BottomSheet ref={inviteSheetRef} snapPoints={[550, 600]}>
        <ScrollView style={{ padding: spacing.lg }}>
          <Text style={{ fontSize: typography.sizes.title.fontSize, fontWeight: '800', color: colors.text, marginBottom: spacing.md }}>
            Invite New User
          </Text>

          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600', marginBottom: 4 }}>Full Name</Text>
            <TextInput
              style={{
                height: 48,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                color: colors.text,
                backgroundColor: colors.surfaceElevated
              }}
              placeholder="e.g. John Doe"
              placeholderTextColor={colors.textMuted}
              value={inviteFullName}
              onChangeText={setInviteFullName}
            />
          </View>

          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600', marginBottom: 4 }}>Email</Text>
            <TextInput
              style={{
                height: 48,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                color: colors.text,
                backgroundColor: colors.surfaceElevated
              }}
              placeholder="e.g. john@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={inviteEmail}
              onChangeText={setInviteEmail}
            />
          </View>

          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600', marginBottom: 4 }}>Phone Number</Text>
            <TextInput
              style={{
                height: 48,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                color: colors.text,
                backgroundColor: colors.surfaceElevated
              }}
              placeholder="e.g. +1234567890"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={invitePhone}
              onChangeText={setInvitePhone}
            />
          </View>

          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600', marginBottom: 4 }}>Invitation Message (Optional)</Text>
            <TextInput
              style={{
                height: 80,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                color: colors.text,
                backgroundColor: colors.surfaceElevated,
                textAlignVertical: 'top'
              }}
              placeholder="Add a custom invitation note..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={inviteMessage}
              onChangeText={setInviteMessage}
            />
          </View>

          {/* Role selector */}
          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600', marginBottom: 8 }}>Select Role</Text>
            <View style={{ gap: spacing.xs }}>
              {roles?.map((r: any) => (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => setInviteRoleId(r.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: spacing.md,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: inviteRoleId === r.id ? colors.primary : colors.border,
                    backgroundColor: inviteRoleId === r.id ? colors.primaryLight : colors.surface
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: colors.text }}>{r.name}</Text>
                    {r.description && <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{r.description}</Text>}
                  </View>
                  {inviteRoleId === r.id && <Check size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Gym selector */}
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600', marginBottom: 8 }}>Assign Gym Branches</Text>
            <View style={{ gap: spacing.xs }}>
              {gyms?.map((g: any) => {
                const isSelected = inviteGymIds.includes(g.id);
                return (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => toggleInviteGym(g.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: spacing.md,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primaryLight : colors.surface
                    }}
                  >
                    <Text style={{ flex: 1, fontWeight: '600', color: colors.text }}>{g.name}</Text>
                    {isSelected && <Check size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <PrimaryButton
            label="Send Invitation"
            onPress={handleInviteSubmit}
            loading={inviteUserMutation.isPending}
            style={{ marginBottom: spacing.xxl }}
          />
        </ScrollView>
      </BottomSheet>

      {/* Change Role Sheet */}
      <BottomSheet ref={roleSheetRef} snapPoints={[450, 500]}>
        <ScrollView style={{ padding: spacing.lg }}>
          <Text style={{ fontSize: typography.sizes.title.fontSize, fontWeight: '800', color: colors.text, marginBottom: spacing.md }}>
            Change User Role
          </Text>

          <View style={{ gap: spacing.xs, marginBottom: spacing.xl }}>
            {roles?.map((r: any) => (
              <TouchableOpacity
                key={r.id}
                onPress={() => setMgmtRoleId(r.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: spacing.md,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: mgmtRoleId === r.id ? colors.primary : colors.border,
                  backgroundColor: mgmtRoleId === r.id ? colors.primaryLight : colors.surface
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>{r.name}</Text>
                  {r.description && <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{r.description}</Text>}
                </View>
                {mgmtRoleId === r.id && <Check size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>

          <PrimaryButton
            label="Update Role"
            onPress={handleChangeRoleSubmit}
            loading={changeRoleMutation.isPending}
            style={{ marginBottom: spacing.xxl }}
          />
        </ScrollView>
      </BottomSheet>

      {/* Assign Gyms Sheet */}
      <BottomSheet ref={gymSheetRef} snapPoints={[450, 500]}>
        <ScrollView style={{ padding: spacing.lg }}>
          <Text style={{ fontSize: typography.sizes.title.fontSize, fontWeight: '800', color: colors.text, marginBottom: spacing.md }}>
            Assign Gym Branches
          </Text>

          <View style={{ gap: spacing.xs, marginBottom: spacing.xl }}>
            {gyms?.map((g: any) => {
              const isSelected = mgmtGymIds.includes(g.id);
              return (
                <TouchableOpacity
                  key={g.id}
                  onPress={() => toggleMgmtGym(g.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: spacing.md,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? colors.primaryLight : colors.surface
                  }}
                >
                  <Text style={{ flex: 1, fontWeight: '600', color: colors.text }}>{g.name}</Text>
                  {isSelected && <Check size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <PrimaryButton
            label="Update Branch Assignments"
            onPress={handleAssignGymsSubmit}
            loading={assignGymsMutation.isPending}
            style={{ marginBottom: spacing.xxl }}
          />
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    //
  },
  title: {
    //
  },
  tabsContainer: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 14,
  },
  listContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    justifyContent: 'center',
  },
});
