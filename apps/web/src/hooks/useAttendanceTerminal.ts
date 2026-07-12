import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { attendanceApi, devicesApi, gymApi, membersApi } from '../lib/api';
import { mapApiMembersToLocal, MemberCheckIn } from '../lib/api/mappers';
import { useDebouncedValue } from './useDebouncedValue';

// ----------------------------------------------------------------------
// Query hooks
// ----------------------------------------------------------------------

export function useTodayAttendance(gymId: string) {
  return useQuery({
    queryKey: ['attendance', 'logs', gymId],
    queryFn: () => attendanceApi.listLogs(gymId),
    enabled: !!gymId,
    refetchInterval: 30_000,
  });
}

export function useAttendanceStats(gymId: string) {
  return useQuery({
    queryKey: ['attendance', 'stats', gymId],
    queryFn: () => attendanceApi.getStats(gymId),
    enabled: !!gymId,
    refetchInterval: 30_000,
  });
}

export function useOccupancy(gymId: string) {
  return useQuery({
    queryKey: ['gym', 'occupancy', gymId],
    queryFn: () => gymApi.getOccupancy(gymId),
    enabled: !!gymId,
    refetchInterval: 30_000,
  });
}

export function useDevices(gymId: string) {
  return useQuery({
    queryKey: ['devices', gymId],
    queryFn: () => devicesApi.list(gymId),
    enabled: !!gymId,
    refetchInterval: 30_000,
  });
}

export function useMemberSearch(query: string, branches: any[]) {
  const debouncedQuery = useDebouncedValue(query, 300);
  const enabled = debouncedQuery.trim().length >= 2;

  const result = useQuery({
    queryKey: ['members', 'search', debouncedQuery],
    queryFn: () => membersApi.list({ search: debouncedQuery }),
    enabled,
  });

  const suggestions: MemberCheckIn[] = useMemo(() => {
    if (!enabled || !result.data) return [];
    return mapApiMembersToLocal(result.data, branches);
  }, [result.data, branches, enabled]);

  return { ...result, suggestions };
}

// ----------------------------------------------------------------------
// Mutation hooks
// ----------------------------------------------------------------------

export function useCheckIn(gymId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { memberId?: string; gymId: string; method: string; memberName?: string }) =>
      attendanceApi.checkIn(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'logs', gymId] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'stats', gymId] });
      queryClient.invalidateQueries({ queryKey: ['gym', 'occupancy', gymId] });
    },
  });
}

export function useCheckOut(gymId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => attendanceApi.checkOut(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'logs', gymId] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'stats', gymId] });
      queryClient.invalidateQueries({ queryKey: ['gym', 'occupancy', gymId] });
    },
  });
}

// ----------------------------------------------------------------------
// WebSocket hook
// ----------------------------------------------------------------------

interface AttendanceSocketCallbacks {
  onCheckIn?: (record: any) => void;
  onCheckOut?: (record: any) => void;
  onOccupancyUpdate?: (occupancy: any) => void;
  onDeviceStatus?: (device: any) => void;
  onAlert?: (alert: any) => void;
}

export function useAttendanceSocket(gymId: string, callbacks: AttendanceSocketCallbacks = {}) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  // Keep latest callbacks without re-running the effect on every render
  const callbacksRef = useMemoRef(callbacks);

  useEffect(() => {
    if (!gymId || typeof window === 'undefined') return;

    let socket: import('socket.io-client').Socket | undefined;
    let cancelled = false;

    (async () => {
      const { io } = await import('socket.io-client');
      if (cancelled) return;

      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      socket = io(`${apiUrl}/attendance`, {
        auth: { token },
      });

      socket.on('connect', () => {
        setConnected(true);
        socket?.emit('join:gym', { gymId });
      });

      socket.on('disconnect', () => setConnected(false));

      socket.on('attendance:check-in', (record: any) => {
        queryClient.invalidateQueries({ queryKey: ['attendance', 'logs', gymId] });
        queryClient.invalidateQueries({ queryKey: ['attendance', 'stats', gymId] });
        queryClient.invalidateQueries({ queryKey: ['gym', 'occupancy', gymId] });
        callbacksRef.current.onCheckIn?.(record);
      });

      socket.on('attendance:check-out', (record: any) => {
        queryClient.invalidateQueries({ queryKey: ['attendance', 'logs', gymId] });
        queryClient.invalidateQueries({ queryKey: ['attendance', 'stats', gymId] });
        queryClient.invalidateQueries({ queryKey: ['gym', 'occupancy', gymId] });
        callbacksRef.current.onCheckOut?.(record);
      });

      socket.on('occupancy:update', (occupancy: any) => {
        queryClient.setQueryData(['gym', 'occupancy', gymId], occupancy);
        callbacksRef.current.onOccupancyUpdate?.(occupancy);
      });

      socket.on('device:status', (device: any) => {
        queryClient.invalidateQueries({ queryKey: ['devices', gymId] });
        callbacksRef.current.onDeviceStatus?.(device);
      });

      socket.on('membership:validation', () => {
        // No dedicated cache slot; consumers can use onAlert/onCheckIn paths.
      });

      socket.on('alert', (alert: any) => {
        callbacksRef.current.onAlert?.(alert);
      });
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
      setConnected(false);
    };
  }, [gymId, queryClient]);

  return { connected };
}

// Small helper to keep a stable ref to the latest callbacks object.
function useMemoRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
