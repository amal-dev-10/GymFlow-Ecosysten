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
    mutationFn: async ({ memberId, gymId, token, method = 'FRONT_DESK', memberName }: { memberId?: string; gymId: string; token?: string; method?: string; memberName?: string }) => {
      if (isOffline && memberId) {
        enqueue({
          type: 'check-in',
          payload: { memberId, gymId, method, memberName },
        });
        return { success: true, offline: true, memberId };
      }
      
      if (!memberId && !token) throw new Error("Member ID or QR Token is required for check-in");

      return attendanceApi.checkIn({ memberId, gymId, method, memberName, token });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activeMembers', variables.gymId] });
      queryClient.invalidateQueries({ queryKey: ['attendanceStats', variables.gymId] });
      queryClient.invalidateQueries({ queryKey: ['attendanceLogs', variables.gymId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  const { isOffline } = useNetworkStatus();

  return useMutation({
    mutationFn: async ({ memberId, gymId, attendanceId }: { memberId: string; gymId: string; attendanceId?: string }) => {
      if (isOffline) {
        enqueue({
          type: 'check-out',
          payload: { memberId, gymId },
        });
        return { success: true, offline: true, memberId };
      }
      return attendanceApi.checkOut(attendanceId || memberId);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activeMembers', variables.gymId] });
      queryClient.invalidateQueries({ queryKey: ['attendanceStats', variables.gymId] });
      queryClient.invalidateQueries({ queryKey: ['attendanceLogs', variables.gymId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}
