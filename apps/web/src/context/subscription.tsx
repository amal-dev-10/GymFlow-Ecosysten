'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { subscriptionApi } from '../lib/api';
import { handleApiError } from '../lib/api/client';
import { mapCurrentSubscription, type CurrentSubscription } from '../lib/api/mappers';
import { loadRazorpayScript, openRazorpayCheckout, type RazorpaySuccessResponse } from '../lib/razorpay';

export interface AvailablePlan {
  id: string;
  name: string;
  description: string | null;
  badge: string | null;
  price: number;
  currency: string;
  billingCycle: string;
  trialDays: number;
}

interface SubscriptionContextProps {
  subscription: CurrentSubscription | null;
  plans: AvailablePlan[];
  loading: boolean;
  switching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  switchPlan: (planId: string) => Promise<{ ok: boolean; error?: string }>;
}

const SubscriptionContext = createContext<SubscriptionContextProps | undefined>(undefined);

/**
 * App-wide subscription state - mounted once at the root (see providers.tsx)
 * so /organizations, the workspace shell, and the subscription management
 * screen all read the same fetched-once data instead of each page/component
 * independently calling the API. Re-fetches on every route change since the
 * "active" organization (read by apiClient from localStorage) can change
 * between /organizations, /organizations/[id]/subscription, and /workspace.
 */
export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [plans, setPlans] = useState<AvailablePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    const orgId = localStorage.getItem('organizationId');
    if (!token || !orgId) {
      setSubscription(null);
      setPlans([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [rawSub, rawPlans] = await Promise.all([
        subscriptionApi.getActive().catch((err: any) => {
          if (err?.response?.status === 404) return null;
          throw err;
        }),
        subscriptionApi.getPlans(),
      ]);
      setSubscription(rawSub ? mapCurrentSubscription(rawSub) : null);
      setPlans(rawPlans || []);
    } catch (err: any) {
      setError(handleApiError(err) || 'Failed to load subscription.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [pathname, refetch]);

  const switchPlan = useCallback(
    async (planId: string) => {
      const plan = plans.find((p) => p.id === planId);

      setSwitching(true);
      try {
        // Free plans activate immediately - no payment step.
        if (plan && plan.price <= 0) {
          await subscriptionApi.subscribe(planId);
          await refetch();
          setSwitching(false);
          return { ok: true };
        }

        // Paid plans go through Razorpay: create an order, open the
        // Checkout widget, then verify the signature server-side before
        // the subscription actually activates.
        const order = await subscriptionApi.checkout(planId);
        if (order.free) {
          await refetch();
          setSwitching(false);
          return { ok: true };
        }

        await loadRazorpayScript();

        return await new Promise<{ ok: boolean; error?: string }>((resolve) => {
          openRazorpayCheckout({
            key: order.keyId,
            amount: order.amount,
            currency: order.currency,
            order_id: order.orderId,
            name: 'Subscription Purchase',
            description: `Upgrade to ${order.planName}`,
            theme: { color: '#2563EB' },
            handler: async (response: RazorpaySuccessResponse) => {
              try {
                await subscriptionApi.verifyPayment({
                  planId,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                });
                await refetch();
                resolve({ ok: true });
              } catch (err: any) {
                resolve({ ok: false, error: handleApiError(err) || 'Payment verification failed.' });
              } finally {
                setSwitching(false);
              }
            },
            modal: {
              ondismiss: () => {
                setSwitching(false);
                resolve({ ok: false, error: 'Payment cancelled.' });
              },
            },
          });
        });
      } catch (err: any) {
        setSwitching(false);
        return { ok: false, error: handleApiError(err) || 'Failed to start checkout.' };
      }
    },
    [plans, refetch],
  );

  return (
    <SubscriptionContext.Provider value={{ subscription, plans, loading, switching, error, refetch, switchPlan }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
}
