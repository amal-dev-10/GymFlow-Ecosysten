import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi, membersApi } from '../lib/api';
import { enqueue } from '../lib/offlineQueue';
import { useNetworkStatus } from './useNetworkStatus';

export function useAttendanceStats(gymId: string) {
  return useQuery({
    queryKey: ['attendanceStats', gymId],
    queryFn: () => attendanceApi.getStats(gymId),
    enabled: !!gymId,
    refetchInterval: 30000, // Real-timeish polling
  });
}

export function useActiveMembers(gymId: string) {
  return useQuery({
    queryKey: ['activeMembers', gymId],
    queryFn: () => attendanceApi.listActive(gymId),
    enabled: !!gymId,
    refetchInterval: 15000, // Poll every 15s to keep dashboard fresh
  });
}

export function useAttendanceLogs(gymId: string) {
  return useQuery({
    queryKey: ['attendanceLogs', gymId],
    queryFn: () => attendanceApi.listLogs(gymId),
    enabled: !!gymId,
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  const { isOffline } = useNetworkStatus();

  return useMutation({
    mutationFn: async ({ memberId, gymId, token }: { memberId?: string; gymId: string; token?: string }) => {
      if (isOffline && memberId) {
        enqueue({
          type: 'check-in',
          payload: { memberId, gymId },
        });
        return { success: true, offline: true, memberId };
      }
      
      if (!memberId) throw new Error("Member ID is required for check-in");

      return membersApi.checkIn(memberId, gymId);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activeMembers', variables.gymId] });
      queryClient.invalidateQueries({ queryKey: ['attendanceStats', variables.gymId] });
      queryClient.invalidateQueries({ queryKey: ['attendanceLogs', variables.gymId] });
      if (variables.memberId) {
        queryClient.invalidateQueries({ queryKey: ['member', variables.memberId] });
      }
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  const { isOffline } = useNetworkStatus();

  return useMutation({
    mutationFn: async ({ memberId, gymId }: { memberId: string; gymId: string }) => {
      if (isOffline) {
        enqueue({
          type: 'check-out',
          payload: { memberId, gymId },
        });
        return { success: true, offline: true, memberId };
      }
      return membersApi.checkOut(memberId, gymId);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activeMembers', variables.gymId] });
      queryClient.invalidateQueries({ queryKey: ['attendanceStats', variables.gymId] });
      queryClient.invalidateQueries({ queryKey: ['attendanceLogs', variables.gymId] });
      queryClient.invalidateQueries({ queryKey: ['member', variables.memberId] });
    },
  });
}
