'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Calendar, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import { useSubscriptionContext } from '../../../../context/subscription';
import { Card, Badge, Button } from '../../../../components/ui';

function formatPrice(price: number, currency: string) {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(price);
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Read-only view of the organization's current plan, usage/limits, and
 * features. Purchasing or switching plans is deliberately NOT done here -
 * that lives at /organizations/[id]/subscription, a screen outside the
 * workspace shell, backed by the same shared SubscriptionProvider context.
 */
export default function SubscriptionTab({ orgId }: { orgId: string }) {
  const router = useRouter();
  const { subscription, loading, error, refetch } = useSubscriptionContext();

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse select-none">
        <div className="h-40 bg-white border border-neutral-200 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-56 bg-white border border-neutral-200 rounded-2xl" />
          <div className="h-56 bg-white border border-neutral-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-neutral-100 rounded-3xl p-12 text-center flex flex-col items-center max-w-md mx-auto mt-6">
        <AlertTriangle className="text-danger mb-4" size={36} />
        <h3 className="text-sm font-bold text-neutral-900">Couldn't load subscription</h3>
        <p className="text-xs text-neutral-600 mt-2 leading-relaxed">{error}</p>
        <Button variant="secondary" size="sm" icon={<RefreshCw size={12} />} className="mt-6" onClick={refetch}>
          Retry
        </Button>
      </div>
    );
  }

  const isTrialing = !!subscription?.trialEndDate && new Date(subscription.trialEndDate) > new Date();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* CURRENT PLAN */}
      <Card className="p-6">
        {subscription ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xl font-black text-neutral-900">{subscription.plan.name}</span>
                <Badge tone={subscription.status === 'Active' ? 'success' : 'warning'}>{subscription.status}</Badge>
                {isTrialing && <Badge tone="info">Trial ends {formatDate(subscription.trialEndDate)}</Badge>}
              </div>
              {subscription.plan.description && <p className="text-xs text-neutral-500 mt-1.5 max-w-lg">{subscription.plan.description}</p>}
              <div className="flex items-center gap-5 mt-4 text-xs text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} className="shrink-0" />
                  Started {formatDate(subscription.startDate)}
                </span>
                <span className="flex items-center gap-1.5">
                  <RefreshCw size={13} className="shrink-0" />
                  {subscription.autoRenew ? 'Renews' : 'Ends'} {formatDate(subscription.endDate)}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-3">
              <div className="text-3xl font-black text-neutral-900">
                {formatPrice(subscription.plan.price, subscription.plan.currency)}
                {subscription.plan.price > 0 && <span className="text-sm font-semibold text-neutral-500"> /{subscription.plan.billingCycle.toLowerCase()}</span>}
              </div>
              <Button variant="secondary" size="sm" icon={<ExternalLink size={13} />} onClick={() => router.push(`/organizations/${orgId}/subscription`)}>
                Manage Subscription
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm font-bold text-neutral-900">No active subscription</p>
            <Button variant="primary" size="sm" className="mt-4" onClick={() => router.push(`/organizations/${orgId}/subscription`)}>
              Choose a Plan
            </Button>
          </div>
        )}
      </Card>

      {/* USAGE & LIMITS */}
      {subscription && subscription.limits.some((l) => l.limitType === 'LIMITED') && (
        <Card className="p-6">
          <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider mb-4">Usage & Limits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {subscription.limits
              .filter((l) => l.limitType === 'LIMITED')
              .map((limit) => {
                const percent = limit.limitValue ? Math.min(100, Math.round((limit.currentValue / limit.limitValue) * 100)) : 0;
                const isNearLimit = percent >= 80;
                return (
                  <div key={limit.key} className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-600 font-bold">{limit.label}</span>
                      <span className="text-neutral-500">
                        {limit.currentValue} / {limit.limitValue}
                        {limit.unit ? ` ${limit.unit}` : ''}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-50 border border-neutral-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${isNearLimit ? 'bg-warning' : 'bg-primary'}`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* FEATURES */}
      {subscription && (
        <Card className="p-6">
          <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider mb-4">Included Features</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {subscription.features.map((f) => (
              <div key={f.key} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl border ${f.enabled ? 'border-neutral-100 bg-neutral-50/60' : 'border-neutral-100 opacity-50'}`}>
                {f.enabled ? <CheckCircle2 size={13} className="text-success shrink-0" /> : <XCircle size={13} className="text-neutral-400 shrink-0" />}
                <span className={f.enabled ? 'text-neutral-700 font-semibold' : 'text-neutral-500'}>{f.label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
