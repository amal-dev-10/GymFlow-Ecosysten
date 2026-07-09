'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { platformRevenueApi } from '@/lib/api';
import type { SubscriptionAnalyticsDTO } from '@/types/revenue';

const STATUS_TONE: Record<string, string> = {
  Active: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  Trialing: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  Canceled: 'text-slate-400 bg-slate-800/60 border-slate-700/60',
  Paused: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Expired: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  Past_Due: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  Grace_Period: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Pending_Payment: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
};

export default function SubscriptionAnalyticsSection() {
  const router = useRouter();
  const [data, setData] = useState<SubscriptionAnalyticsDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformRevenueApi.getSubscriptionAnalytics().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <div key={i} className="h-64 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>;
  }

  const maxPlanCount = Math.max(1, ...data.byPlan.map((p) => p.count));
  const maxStatusCount = Math.max(1, ...data.byStatus.map((s) => s.count));

  return (
    <div className="space-y-4">
      <button onClick={() => router.push('/commercial/subscriptions')} className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 hover:text-indigo-200 transition-colors">
        <ExternalLink size={12} /> Manage subscriptions
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">By Plan</p>
          <div className="space-y-2">
            {data.byPlan.map((p) => (
              <div key={p.plan}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-300 font-semibold">{p.plan}</span>
                  <span className="text-slate-500">{p.count}</span>
                </div>
                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(p.count / maxPlanCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">By Status</p>
          <div className="flex flex-wrap gap-2">
            {data.byStatus.map((s) => (
              <span key={s.status} className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full border ${STATUS_TONE[s.status] || 'text-slate-400 bg-slate-800/60 border-slate-700/60'}`}>
                {s.status.replace(/_/g, ' ')} · {s.count}
              </span>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {data.byStatus.map((s) => (
              <div key={s.status}>
                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(s.count / maxStatusCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
