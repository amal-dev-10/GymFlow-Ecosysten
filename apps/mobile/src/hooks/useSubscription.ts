import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi, ApiError } from '../lib/api';

export function useSubscriptionInvoices() {
  return useQuery({
    queryKey: ['subscription', 'invoices'],
    queryFn: () => subscriptionApi.getInvoices(),
  });
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription', 'plans'],
    queryFn: () => subscriptionApi.getPlans(),
  });
}

// Switch to a FREE plan (paid plans go through web checkout).
export function useSubscribeToPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => subscriptionApi.subscribe(planId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription', 'active'] });
      qc.invalidateQueries({ queryKey: ['subscription', 'invoices'] });
    },
  });
}

// The org's own GymFlow subscription. A 404 means "no active plan" — surface
// that as a state rather than an error, and don't keep retrying it.
export function useSubscription() {
  return useQuery({
    queryKey: ['subscription', 'active'],
    queryFn: () => subscriptionApi.getActive(),
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.status === 404) return false;
      return failureCount < 2;
    },
  });
}
