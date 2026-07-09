'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Repeat, TrendingDown, Sparkles } from 'lucide-react';
import { platformRevenueApi } from '@/lib/api';
import type { ForecastDTO } from '@/types/revenue';

const fmtCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString();

export default function ForecastingSection() {
  const [data, setData] = useState<ForecastDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformRevenueApi.getForecast().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-6">
      <p className="text-[11px] text-slate-500 bg-slate-900/40 border border-slate-850 rounded-xl px-3 py-2">
        Projections are computed from a trailing 3-month linear trend and real upcoming renewal/trial data — not guarantees.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"><TrendingUp size={12} className="text-emerald-400" /> Projected Revenue</span>
          <span className="block text-xl font-black text-slate-100 mt-2">{fmtCurrency(data.projectedRevenueNextMonth)}</span>
        </div>
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"><Sparkles size={12} className="text-indigo-400" /> Predicted MRR</span>
          <span className="block text-xl font-black text-slate-100 mt-2">{fmtCurrency(data.predictedMrr)}</span>
        </div>
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"><Repeat size={12} className="text-sky-400" /> Expected Renewals</span>
          <span className="block text-xl font-black text-slate-100 mt-2">{data.expectedRenewals}</span>
        </div>
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"><TrendingDown size={12} className="text-rose-400" /> Expected Churn</span>
          <span className="block text-xl font-black text-slate-100 mt-2">{data.expectedChurnRate}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-850"><span className="text-xs font-bold text-slate-200">Upcoming Renewals (30d)</span></div>
          <div className="divide-y divide-slate-900/60">
            {data.upcomingRenewals.length === 0 ? (
              <p className="text-[11px] text-slate-600 p-4">No renewals in the next 30 days.</p>
            ) : (
              data.upcomingRenewals.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <span className="block text-xs font-semibold text-slate-200">{r.organizationName}</span>
                    <span className="block text-[10px] text-slate-600">{r.planName} · {fmtDate(r.endDate)}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-300">{fmtCurrency(r.value)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-850"><span className="text-xs font-bold text-slate-200">Upcoming Trial Expirations (14d)</span></div>
          <div className="divide-y divide-slate-900/60">
            {data.upcomingExpirations.length === 0 ? (
              <p className="text-[11px] text-slate-600 p-4">No trials expiring in the next 14 days.</p>
            ) : (
              data.upcomingExpirations.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <span className="block text-xs font-semibold text-slate-200">{r.organizationName}</span>
                    <span className="block text-[10px] text-slate-600">{r.planName}</span>
                  </div>
                  <span className="text-[11px] text-amber-400">{fmtDate(r.trialEndDate)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
