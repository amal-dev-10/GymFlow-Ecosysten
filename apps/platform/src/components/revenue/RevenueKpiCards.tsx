'use client';

import { TrendingUp, Landmark, Sun, CalendarDays, Sparkles, Repeat, ArrowUpRight, XCircle, FileWarning, Undo2, TrendingDown, Users } from 'lucide-react';
import type { RevenueDashboardDTO } from '@/types/revenue';

function KpiCard({ icon: Icon, label, value, tone }: { icon: typeof TrendingUp; label: string; value: string; tone?: string }) {
  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between min-h-[92px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <Icon size={14} className={tone || 'text-indigo-400'} />
      </div>
      <span className="text-xl font-black text-slate-100 block">{value}</span>
    </div>
  );
}

const fmtCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function RevenueKpiCards({ dashboard, loading }: { dashboard: RevenueDashboardDTO | null; loading: boolean }) {
  if (loading || !dashboard) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[...Array(12)].map((_, i) => <div key={i} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 min-h-[92px] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      <KpiCard icon={TrendingUp} label="MRR" value={fmtCurrency(dashboard.mrr)} tone="text-emerald-400" />
      <KpiCard icon={Landmark} label="ARR" value={fmtCurrency(dashboard.arr)} tone="text-emerald-400" />
      <KpiCard icon={Sun} label="Revenue Today" value={fmtCurrency(dashboard.revenueToday)} tone="text-sky-400" />
      <KpiCard icon={CalendarDays} label="Revenue This Month" value={fmtCurrency(dashboard.revenueThisMonth)} tone="text-sky-400" />
      <KpiCard icon={Sparkles} label="New Subscriptions" value={String(dashboard.newSubscriptions)} tone="text-violet-400" />
      <KpiCard icon={Repeat} label="Renewals" value={String(dashboard.renewals)} tone="text-indigo-400" />
      <KpiCard icon={ArrowUpRight} label="Trial Conversions" value={String(dashboard.trialConversions)} tone="text-cyan-400" />
      <KpiCard icon={XCircle} label="Failed Payments" value={String(dashboard.failedPayments)} tone={dashboard.failedPayments > 0 ? 'text-rose-400' : 'text-slate-500'} />
      <KpiCard icon={FileWarning} label="Outstanding Invoices" value={`${dashboard.outstandingInvoices.count} · ${fmtCurrency(dashboard.outstandingInvoices.amount)}`} tone="text-amber-400" />
      <KpiCard icon={Undo2} label="Refunds" value={`${dashboard.refunds.count} · ${fmtCurrency(dashboard.refunds.amount)}`} tone="text-orange-400" />
      <KpiCard icon={TrendingDown} label="Churn Rate" value={`${dashboard.churnRate}%`} tone={dashboard.churnRate > 5 ? 'text-rose-400' : 'text-slate-400'} />
      <KpiCard icon={Users} label="Avg Revenue / Org" value={fmtCurrency(dashboard.arpo)} tone="text-indigo-400" />
    </div>
  );
}
