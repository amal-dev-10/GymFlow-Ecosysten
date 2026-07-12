import { useMemo } from 'react';
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
/** Parse a date-ish value to epoch ms, or null if it isn't parseable. */
function toEpoch(value: any): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return isNaN(t) ? null : t;
}

/**
 * Derive the member's activity timeline from the loaded member record.
 * Sorting is done on a precomputed numeric timestamp so a single unparseable
 * date can never corrupt the comparator (which would leave the list unsorted).
 */
function buildTimeline(member: MemberDto): TimelineEvent[] {
  const events: Array<TimelineEvent & { _t: number }> = [];
  const add = (e: Omit<TimelineEvent, 'createdAt'> & { createdAt: any }) => {
    const t = toEpoch(e.createdAt);
    if (t == null || !e.title) return;
    events.push({ ...e, createdAt: new Date(t).toISOString(), _t: t });
  };

  // 1. Member created
  add({
    id: `created-${member.id}`,
    type: 'member_created',
    title: 'Member Registered',
    description: 'Profile created in the system',
    createdAt: member.createdAt,
  });

  // 2. Attendances (each check-in / check-out at its own timestamp). A
  //    Denied attempt still has a checkInTime (the attempt itself happened),
  //    but must never read as a successful "Checked In" — that would hide
  //    the fact that entry was blocked, and why.
  (member.attendances || []).forEach((att: any) => {
    const denied = String(att.status || '').toLowerCase() === 'denied';
    if (att.id && att.checkInTime) {
      add(
        denied
          ? {
              id: `checkin-${att.id}`,
              type: 'checkin_denied',
              title: 'Entry Denied',
              description: att.reason || 'Blocked by security validation rules.',
              createdAt: att.checkInTime,
            }
          : {
              id: `checkin-${att.id}`,
              type: 'checked_in',
              title: 'Checked In',
              description: att.method === 'QR_SCAN' ? 'Checked in via mobile QR code' : 'Checked in at front desk',
              createdAt: att.checkInTime,
            }
      );
    }
    if (att.id && att.checkOutTime) {
      add({
        id: `checkout-${att.id}`,
        type: 'checked_out',
        title: 'Checked Out',
        description: 'Checked out from gym',
        createdAt: att.checkOutTime,
      });
    }
  });

  // 3. Memberships — dated by when the record was created (renewals have a
  //    FUTURE startDate, which would otherwise sort them above today's events).
  const memberships = member.memberMemberships || [];
  memberships.forEach((sub: any, idx: number) => {
    if (!sub.id) return;
    const isOldest = idx === memberships.length - 1;
    add({
      id: `membership-${sub.id}`,
      type: isOldest ? 'membership_purchased' : 'membership_renewed',
      title: isOldest ? 'Membership Purchased' : 'Membership Renewed',
      description: `${sub.membershipPlan?.name || 'Plan'} (₹${sub.amountPaid || 0})`,
      createdAt: sub.createdAt || sub.startDate,
    });
  });

  // 4. Manual timeline events stored on aiInsights (tolerate createdAt/timestamp/date).
  if (Array.isArray(member.aiInsights?.timelineEvents)) {
    member.aiInsights.timelineEvents.forEach((e: any, i: number) => {
      add({
        id: e.id || `ai-${i}`,
        type: e.type || 'other',
        title: e.title || e.type,
        description: e.description,
        createdAt: e.createdAt || e.timestamp || e.date,
      });
    });
  }

  // Dedupe by id, sort newest-first on the numeric key, cap the list.
  const seen = new Set<string>();
  return events
    .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
    .sort((a, b) => b._t - a._t)
    .slice(0, 20)
    .map(({ _t, ...e }) => e);
}

export function useMemberTimeline(id: string) {
  const { data: member, isLoading } = useMember(id);
  // Derived straight from the member record so it always reflects the latest
  // data (a separate cached query went stale after check-ins/purchases).
  const data = useMemo(() => (member ? buildTimeline(member) : []), [member]);
  return { data, isLoading };
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
    mutate: (payload?: { method?: string; memberName?: string }, options?: any) =>
      checkInMutation.mutate({ memberId, gymId: gid, ...payload }, options),
    isPending: checkInMutation.isPending
  };

  const checkOut = {
    mutate: (payload: { attendanceId: string }, options?: any) =>
      checkOutMutation.mutate({ memberId, gymId: gid, attendanceId: payload.attendanceId }, options),
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
