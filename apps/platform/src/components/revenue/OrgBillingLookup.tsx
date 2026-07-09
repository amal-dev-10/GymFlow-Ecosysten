'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ExternalLink, Building2 } from 'lucide-react';
import { platformRevenueApi } from '@/lib/api';
import type { OrgBillingSnapshotDTO } from '@/types/revenue';

const fmtCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '-');

export default function OrgBillingLookup() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; name: string; country: string | null }[]>([]);
  const [snapshot, setSnapshot] = useState<OrgBillingSnapshotDTO | null>(null);
  const [loading, setLoading] = useState(false);

  const search = (q: string) => {
    setQuery(q);
    setSnapshot(null);
    if (q.length < 2) { setResults([]); return; }
    platformRevenueApi.searchOrganizations(q).then(setResults).catch(() => setResults([]));
  };

  const select = (orgId: string) => {
    setResults([]);
    setLoading(true);
    platformRevenueApi.getOrgBillingSnapshot(orgId).then(setSnapshot).catch(() => setSnapshot(null)).finally(() => setLoading(false));
  };

  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 space-y-3">
      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200"><Building2 size={13} className="text-indigo-400" /> Organization Billing Lookup</span>

      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        <input value={query} onChange={(e) => search(e.target.value)} placeholder="Search an organization by name..." className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500/40 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none" />
        {results.length > 0 && (
          <div className="absolute left-0 right-0 mt-1 rounded-xl bg-[#0b101d] border border-slate-800 shadow-2xl z-30 max-h-48 overflow-y-auto scrollbar-thin">
            {results.map((o) => (
              <button key={o.id} onClick={() => select(o.id)} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-900 transition-colors">{o.name}</button>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="h-32 bg-slate-900/40 rounded-xl animate-pulse" />}

      {snapshot && !loading && (
        <div className="pt-2 border-t border-slate-900/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-100">{snapshot.organization.name}</span>
            <button onClick={() => router.push(`/organizations/${snapshot.organization.id}?tab=billing`)} className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 hover:text-indigo-200">
              <ExternalLink size={11} /> Full Billing View
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div><span className="block text-slate-600">Current Plan</span><span className="text-slate-200 font-semibold">{snapshot.subscription.plan?.name || 'No plan'}</span></div>
            <div><span className="block text-slate-600">Status</span><span className="text-slate-200 font-semibold">{snapshot.subscription.status}</span></div>
            <div><span className="block text-slate-600">Renewal Date</span><span className="text-slate-200">{fmtDate(snapshot.subscription.renewalDate)}</span></div>
            <div><span className="block text-slate-600">Monthly Revenue</span><span className="text-slate-200">{fmtCurrency(snapshot.subscription.monthlyRevenue)}</span></div>
            <div><span className="block text-slate-600">Trial</span><span className="text-slate-200">{snapshot.subscription.isTrial ? `${snapshot.subscription.trialDaysLeft}d left` : 'No'}</span></div>
            <div><span className="block text-slate-600">Payment Status</span><span className="text-slate-200">{snapshot.subscription.paymentStatus}</span></div>
          </div>
          <p className="text-[10px] text-slate-600">{snapshot.subscription.invoices.length} invoice(s) · {snapshot.subscription.coupons.length} coupon(s) applied</p>
        </div>
      )}
    </div>
  );
}
