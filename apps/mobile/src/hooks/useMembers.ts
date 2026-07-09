import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../providers/WorkspaceProvider';
import { membersApi, MemberDto, TimelineEvent } from '../lib/api';
import { enqueue } from '../lib/offlineQueue';
import { useNetworkStatus } from './useNetworkStatus';
import { useHaptics } from './useHaptics';
import { useCheckIn, useCheckOut } from './useAttendance';

// ---------------------------------------------------------------------------
// Query keys — centralised so invalidation is consistent across the module.
// ---------------------------------------------------------------------------
export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (gymId: string, search: string, filters: Record<string, string>) =>
    [...memberKeys.lists(), gymId, search, filters] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (id: string) => [...memberKeys.details(), id] as const,
  timeline: (id: string) => [...memberKeys.all, 'timeline', id] as const,
};

// ---------------------------------------------------------------------------
// Member list — infinite query with search + filters.
// The backend may not support pagination yet, so we gracefully fall back to
// the flat list endpoint and simulate pages on the client side.
// ---------------------------------------------------------------------------
const PAGE_SIZE = 20;

export function useMembers(search: string, filters: Record<string, string> = {}) {
  const { gymId } = useWorkspace();
  const gid = gymId || '';

  return useInfiniteQuery({
    queryKey: memberKeys.list(gid, search, filters),
    queryFn: async ({ pageParam = 1 }) => {
      try {
        // Try paginated endpoint first
        const res = await membersApi.list(gid, search || undefined, pageParam, PAGE_SIZE, filters);
        
        // If the backend returned a flat array despite pagination params, handle it
        if (Array.isArray(res)) {
          const all = res;
          const start = (pageParam - 1) * PAGE_SIZE;
          const slice = all.slice(start, start + PAGE_SIZE);
          return {
            data: slice,
            page: pageParam,
            totalPages: Math.max(1, Math.ceil(all.length / PAGE_SIZE)),
            total: all.length,
          };
        }
        
        return { data: res.data || [], page: res.page || 1, totalPages: res.totalPages || 1, total: res.total || res.data?.length || 0 };
      } catch {
        // Fallback: flat list endpoint (backend may not support pagination query)
        const all = await membersApi.listFlat(gid, search || undefined, filters);
        const start = (pageParam - 1) * PAGE_SIZE;
        const slice = all.slice(start, start + PAGE_SIZE);
        return {
          data: slice,
          page: pageParam,
          totalPages: Math.max(1, Math.ceil(all.length / PAGE_SIZE)),
          total: all.length,
        };
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: !!gid,
  });
}

// ---------------------------------------------------------------------------
// Single member detail
// ---------------------------------------------------------------------------
export function useMember(id: string) {
  return useQuery({
    queryKey: memberKeys.detail(id),
    queryFn: () => membersApi.getById(id),
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------
export function useMemberTimeline(id: string) {
  return useQuery<TimelineEvent[]>({
    queryKey: memberKeys.timeline(id),
    queryFn: () => membersApi.timeline(id),
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Create member
// ---------------------------------------------------------------------------
export function useCreateMember() {
  const qc = useQueryClient();
  const { isOffline } = useNetworkStatus();
  const { successNotification, errorNotification } = useHaptics();

  return useMutation({
    mutationFn: async (payload: Parameters<typeof membersApi.create>[0]) => {
      if (isOffline) {
        enqueue({ type: 'create-member', payload });
        // Return a placeholder so the UI can navigate away
        return { id: `offline-${Date.now()}`, ...payload } as unknown as MemberDto;
      }
      return membersApi.create(payload);
    },
    onSuccess: () => {
      successNotification();
      qc.invalidateQueries({ queryKey: memberKeys.lists() });
    },
    onError: () => {
      errorNotification();
    },
  });
}

// ---------------------------------------------------------------------------
// Update member
// ---------------------------------------------------------------------------
export function useUpdateMember() {
  const qc = useQueryClient();
  const { isOffline } = useNetworkStatus();
  const { successNotification, errorNotification } = useHaptics();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (isOffline) {
        enqueue({ type: 'update-member', payload: { id, data } });
        return {} as MemberDto;
      }
      return membersApi.update(id, data);
    },
    onSuccess: (_data, variables) => {
      successNotification();
      qc.invalidateQueries({ queryKey: memberKeys.detail(variables.id) });
      qc.invalidateQueries({ queryKey: memberKeys.lists() });
    },
    onError: () => {
      errorNotification();
    },
  });
}

// ---------------------------------------------------------------------------
// Member actions — check in/out, QR, deactivate
// ---------------------------------------------------------------------------
export function useMemberActions(memberId: string) {
  const qc = useQueryClient();
  const { gymId } = useWorkspace();
  const { successNotification, errorNotification } = useHaptics();
  const gid = gymId || '';

  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  const checkIn = {
    mutate: () => checkInMutation.mutate({ memberId, gymId: gid }),
    isPending: checkInMutation.isPending
  };

  const checkOut = {
    mutate: () => checkOutMutation.mutate({ memberId, gymId: gid }),
    isPending: checkOutMutation.isPending
  };

  const generateQr = useMutation({
    mutationFn: () => membersApi.generateQr(memberId),
    onError: () => errorNotification(),
  });

  const deactivate = useMutation({
    mutationFn: () => membersApi.deactivate(memberId),
    onSuccess: () => {
      successNotification();
      qc.invalidateQueries({ queryKey: memberKeys.detail(memberId) });
      qc.invalidateQueries({ queryKey: memberKeys.lists() });
    },
    onError: () => errorNotification(),
  });

  return { checkIn, checkOut, generateQr, deactivate };
}
