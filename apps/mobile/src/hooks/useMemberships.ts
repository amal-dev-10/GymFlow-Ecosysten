import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipsApi } from '../lib/api';
import { useNetworkStatus } from './useNetworkStatus';
import { enqueue } from '../lib/offlineQueue';

export function useMemberships() {
  return useQuery({
    queryKey: ['memberships', 'all'],
    queryFn: () => membershipsApi.listAllSubscriptions(),
  });
}

export function useMemberMemberships(memberId: string) {
  return useQuery({
    queryKey: ['memberships', 'member', memberId],
    queryFn: () => membershipsApi.listPurchased(memberId),
    enabled: !!memberId,
  });
}

export function useMembershipDetails(id: string) {
  return useQuery({
    queryKey: ['memberships', 'detail', id],
    queryFn: () => membershipsApi.getSubscription(id),
    enabled: !!id,
  });
}

export function useCreateMembership() {
  const queryClient = useQueryClient();
  const { isOffline } = useNetworkStatus();
  return useMutation({
    mutationFn: async (payload: any) => {
      if (isOffline) {
        enqueue({ type: 'create-membership', payload });
        return { id: `offline-${Date.now()}`, ...payload };
      }
      return membershipsApi.purchaseMembership(payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      // Member list + detail surface the active membership/status.
      queryClient.invalidateQueries({ queryKey: ['members'] });
      if (variables.memberId) {
        queryClient.invalidateQueries({ queryKey: ['members', 'detail', variables.memberId] });
      }
      // Billing reads off the same subscription ledger a purchase writes to.
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['pendingDues'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['billingDashboard'] });
    },
  });
}

export function useUpdateMembership() {
  const queryClient = useQueryClient();
  const { isOffline } = useNetworkStatus();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      if (isOffline) {
        enqueue({ type: 'update-membership', payload: { id, payload } });
        return { id, ...payload };
      }
      return membershipsApi.updateSubscription(id, payload);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['memberships', 'detail', variables.id] });
    },
  });
}

/** All freeze records for the org — used to find the active freeze on a sub. */
export function useFreezes() {
  return useQuery({
    queryKey: ['freezes'],
    queryFn: () => membershipsApi.listFreezes(),
  });
}

export function useFreezeMembership() {
  const queryClient = useQueryClient();
  const { isOffline } = useNetworkStatus();
  return useMutation({
    mutationFn: async (payload: any) => {
      if (isOffline) {
        enqueue({ type: 'freeze-membership', payload });
        return payload;
      }
      return membershipsApi.requestFreeze(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['freezes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'freezes'] });
    },
  });
}

export function useReactivateMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (freezeId: string) => membershipsApi.reactivateEarly(freezeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['freezes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'freezes'] });
    },
  });
}

export function useMembershipPlans() {
  return useQuery({
    queryKey: ['memberships', 'plans'],
    queryFn: () => membershipsApi.listPlans(),
  });
}

export function useCreateMembershipPlan() {
  const queryClient = useQueryClient();
  const { isOffline } = useNetworkStatus();
  return useMutation({
    mutationFn: async (payload: any) => {
      if (isOffline) {
        enqueue({ type: 'create-membership-plan', payload });
        return { id: `offline-${Date.now()}`, ...payload };
      }
      return membershipsApi.createPlan(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships', 'plans'] });
    },
  });
}
