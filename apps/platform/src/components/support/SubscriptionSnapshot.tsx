'use client';

import { Repeat } from 'lucide-react';
import type { SubscriptionSnapshotDTO } from '@/types/support';

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString() : '-';
}

export default function SubscriptionSnapshot({ sub }: { sub: SubscriptionSnapshotDTO }) {
  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 space-y-2">
      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200"><Repeat size={13} className="text-emerald-400" /> Subscription</span>
      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-400">
        <span>Plan</span><span className="text-slate-200 text-right">{sub.plan?.name || '-'}</span>
        <span>Status</span><span className="text-slate-200 text-right">{sub.subscriptionStatus}</span>
        <span>Payment</span><span className="text-slate-200 text-right">{sub.paymentStatus}</span>
        {sub.trialEndDate && (<><span>Trial Ends</span><span className="text-slate-200 text-right">{fmtDate(sub.trialEndDate)}</span></>)}
        <span>Renews</span><span className="text-slate-200 text-right">{fmtDate(sub.subscriptionEndDate)}</span>
        {sub.isEnterprise && (<><span>Tier</span><span className="text-amber-400 text-right">Enterprise</span></>)}
      </div>
    </div>
  );
}
