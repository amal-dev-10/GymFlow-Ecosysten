'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Ticket } from 'lucide-react';
import { platformRevenueApi } from '@/lib/api';
import type { CouponAnalyticsDTO } from '@/types/revenue';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const STATUS_TONE: Record<string, string> = {
  Active: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  Inactive: 'text-slate-500 bg-slate-800/40 border-slate-700/40',
  Expired: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  Exhausted: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};
const fmtCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : 'No expiry');

export default function CouponAnalyticsSection() {
  const router = useRouter();
  const [rows, setRows] = useState<CouponAnalyticsDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformRevenueApi.getCouponAnalytics().then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <button onClick={() => router.push('/commercial/coupons')} className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 hover:text-indigo-200 transition-colors">
        <ExternalLink size={12} /> Manage coupons
      </button>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={Ticket} title="No coupons yet" description="Create one from the Coupon Management page." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((c) => (
            <div key={c.id} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-black text-slate-100 font-mono">{c.code}</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${STATUS_TONE[c.status]}`}>{c.status}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{c.discountType === 'PERCENTAGE' ? `${c.discountValue}% off` : `${fmtCurrency(c.discountValue)} off`}</p>

              <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                <div>
                  <span className="block text-[9px] text-slate-600 uppercase font-bold">Usage</span>
                  <span className="text-slate-300">{c.usageCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-600 uppercase font-bold">Expiry</span>
                  <span className="text-slate-300">{fmtDate(c.expiry)}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[9px] text-slate-600 uppercase font-bold">Total Discount Given</span>
                  <span className="text-slate-300">{fmtCurrency(c.totalDiscountApplied)}</span>
                </div>
              </div>

              {c.organizationsUsing.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-900/60">
                  <span className="block text-[9px] text-slate-600 uppercase font-bold mb-1">Organizations Using</span>
                  <div className="flex flex-wrap gap-1">
                    {c.organizationsUsing.slice(0, 4).map((name) => (
                      <span key={name} className="text-[10px] text-slate-400 bg-slate-900 border border-slate-850 px-2 py-0.5 rounded-full">{name}</span>
                    ))}
                    {c.organizationsUsing.length > 4 && <span className="text-[10px] text-slate-600">+{c.organizationsUsing.length - 4} more</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
