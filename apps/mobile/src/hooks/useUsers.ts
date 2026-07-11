import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../providers/WorkspaceProvider';
import { orgUsersApi, rolesApi, gymApi } from '../lib/api';

export function useRoles() {
  return useQuery({
    queryKey: ['roles', 'list'],
    queryFn: () => rolesApi.list(),
  });
}

export function useGyms() {
  const { organizationId } = useWorkspace();
  return useQuery({
    queryKey: ['gyms', 'list', organizationId || ''],
    queryFn: () => gymApi.list(organizationId || ''),
    enabled: !!organizationId,
  });
}

export const usersKeys = {
  all: ['org-users'] as const,
  list: (orgId: string) => [...usersKeys.all, 'list', orgId] as const,
  stats: (orgId: string) => [...usersKeys.all, 'stats', orgId] as const,
  invitations: (orgId: string) => [...usersKeys.all, 'invitations', orgId] as const,
};

export function useUsers() {
  const { organizationId } = useWorkspace();
  return useQuery({
    queryKey: usersKeys.list(organizationId || ''),
    queryFn: () => orgUsersApi.list(),
    enabled: !!organizationId,
  });
}

export function useUserStats() {
  const { organizationId } = useWorkspace();
  return useQuery({
    queryKey: usersKeys.stats(organizationId || ''),
    queryFn: () => orgUsersApi.getStats(),
    enabled: !!organizationId,
  });
}

export function useInvitations() {
  const { organizationId } = useWorkspace();
  return useQuery({
    queryKey: usersKeys.invitations(organizationId || ''),
    queryFn: () => orgUsersApi.getInvitations(),
    enabled: !!organizationId,
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  const { organizationId } = useWorkspace();
  
  return useMutation({
    mutationFn: (payload: { phoneNumber: string; roleId?: string; roleIds?: string[]; email?: string; fullName?: string; gymIds?: string[]; message?: string }) => 
      orgUsersApi.inviteUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.invitations(organizationId || '') });
      queryClient.invalidateQueries({ queryKey: usersKeys.stats(organizationId || '') });
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();
  const { organizationId } = useWorkspace();
  
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) => 
      orgUsersApi.toggleStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.list(organizationId || '') });
      queryClient.invalidateQueries({ queryKey: usersKeys.stats(organizationId || '') });
    },
  });
}

export function useChangeUserRole() {
  const queryClient = useQueryClient();
  const { organizationId } = useWorkspace();
  
  return useMutation({
    mutationFn: ({ userId, roleId, roleIds }: { userId: string; roleId: string; roleIds?: string[] }) => 
      orgUsersApi.changeRole(userId, roleId, roleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.list(organizationId || '') });
    },
  });
}

export function useAssignGyms() {
  const queryClient = useQueryClient();
  const { organizationId } = useWorkspace();
  
  return useMutation({
    mutationFn: ({ userId, gymIds }: { userId: string; gymIds: string[] }) => 
      orgUsersApi.assignGyms(userId, gymIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.list(organizationId || '') });
    },
  });
}

export function useRemoveUser() {
  const queryClient = useQueryClient();
  const { organizationId } = useWorkspace();
  
  return useMutation({
    mutationFn: (userId: string) => orgUsersApi.removeUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.list(organizationId || '') });
      queryClient.invalidateQueries({ queryKey: usersKeys.stats(organizationId || '') });
    },
  });
}
