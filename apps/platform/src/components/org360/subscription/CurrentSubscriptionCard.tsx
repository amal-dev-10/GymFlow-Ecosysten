'use client';

import { RefreshCw, RefreshCwOff } from 'lucide-react';
import { SectionCard, InfoRow, fmtDate, fmtMoney } from '../shared';
import SubscriptionStatusBadge from './SubscriptionStatusBadge';
import type { Org360Subscription } from '@/types/org360';

export default function CurrentSubscriptionCard({ subscription: s }: { subscription: Org360Subscription }) {
  if (!s.hasSubscription || !s.plan) {
    return (
      <SectionCard title="Current Subscription">
        <p className="text-xs text-slate-500 py-4 text-center">This organization has no subscription assigned.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Current Subscription" action={<SubscriptionStatusBadge status={s.status} renewalDate={s.renewalDate} isEnterpriseCustom={s.isEnterpriseCustom} />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        <InfoRow label="Plan" value={s.plan.name} />
        <InfoRow
          label="Price"
          value={
            s.isEnterpriseCustom && s.customPrice != null ? (
              <span>
                {fmtMoney(s.customPrice, s.plan.currency)} <span className="text-[10px] text-amber-400">(custom)</span>
              </span>
            ) : (
              fmtMoney(s.plan.price, s.plan.currency)
            )
          }
        />
        <InfoRow label="Currency" value={s.plan.currency} />
        <InfoRow label="Billing Cycle" value={s.billingCycle} />
        <InfoRow label="Trial Days Remaining" value={s.isTrial ? `${s.trialDaysLeft} day(s)` : '—'} />
        <InfoRow label="Started On" value={fmtDate(s.startDate)} />
        <InfoRow label="Renewal Date" value={fmtDate(s.renewalDate)} />
        <InfoRow label="Expires On" value={s.status === 'Canceled' ? fmtDate(s.cancelledAt) : fmtDate(s.renewalDate)} />
        <InfoRow label="Payment Method" value={s.paymentMethod || 'Not on file'} />
        <InfoRow
          label="Auto Renewal"
          value={
            <span className={`inline-flex items-center gap-1 ${s.autoRenew ? 'text-emerald-400' : 'text-slate-500'}`}>
              {s.autoRenew ? <RefreshCw size={11} /> : <RefreshCwOff size={11} />}
              {s.autoRenew ? 'Enabled' : 'Disabled'}
            </span>
          }
        />
      </div>
      {s.cancelReason && (
        <div className="mt-3 p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Cancellation Reason</span>
          <p className="text-[11px] text-slate-400 mt-0.5">{s.cancelReason}</p>
        </div>
      )}
    </SectionCard>
  );
}
