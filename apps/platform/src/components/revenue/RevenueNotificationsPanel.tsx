'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle, AlertTriangle, Clock, CheckCircle2, Undo2, TrendingDown, Bell } from 'lucide-react';
import { platformRevenueApi } from '@/lib/api';
import type { RevenueNotificationsDTO } from '@/types/revenue';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const fmtCurrency = (n: number | null) => (n == null ? '' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n));
const fmtDate = (d: string) => new Date(d).toLocaleDateString();

export default function RevenueNotificationsPanel() {
  const router = useRouter();
  const [data, setData] = useState<RevenueNotificationsDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformRevenueApi.getNotifications().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-40 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />;

  const total = data ? data.paymentFailed.length + data.invoiceOverdue.length + data.trialEnding.length + data.subscriptionRenewed.length + data.refundProcessed.length + (data.highChurnAlert ? 1 : 0) : 0;

  if (!data || total === 0) {
    return <PlatformEmptyState icon={Bell} title="No alerts right now" description="Failed payments, overdue invoices, trials ending, renewals, refunds and churn alerts from the last 24h will show up here." />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {data.highChurnAlert && (
        <div className="sm:col-span-2 flex items-center gap-2 bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4">
          <TrendingDown size={16} className="text-rose-400 shrink-0" />
          <span className="text-xs font-bold text-rose-300">High Churn Alert: {data.highChurnAlert.churnRate}% this month</span>
        </div>
      )}
      {data.paymentFailed.length > 0 && (
        <Group icon={XCircle} label="Payment Failed" tone="text-rose-400">
          {data.paymentFailed.map((p) => <Row key={p.id} title={`${p.organizationName} · ${fmtCurrency(p.amount)}`} sub={fmtDate(p.createdAt)} onClick={() => router.push('/commercial/billing?section=payments')} />)}
        </Group>
      )}
      {data.invoiceOverdue.length > 0 && (
        <Group icon={AlertTriangle} label="Invoice Overdue" tone="text-orange-400">
          {data.invoiceOverdue.map((i) => <Row key={i.id} title={`${i.organizationName} · ${fmtCurrency(i.amount)}`} sub={`Due ${fmtDate(i.dueDate)}`} onClick={() => router.push('/commercial/billing?section=invoices')} />)}
        </Group>
      )}
      {data.trialEnding.length > 0 && (
        <Group icon={Clock} label="Trial Ending" tone="text-amber-400">
          {data.trialEnding.map((t) => <Row key={t.organizationId} title={t.organizationName} sub={fmtDate(t.trialEndDate)} onClick={() => router.push(`/organizations/${t.organizationId}`)} />)}
        </Group>
      )}
      {data.subscriptionRenewed.length > 0 && (
        <Group icon={CheckCircle2} label="Subscription Renewed" tone="text-emerald-400">
          {data.subscriptionRenewed.map((r) => <Row key={r.id} title={`${r.organizationName} · ${fmtCurrency(r.amount)}`} sub={fmtDate(r.paidAt)} onClick={() => router.push('/commercial/billing?section=invoices')} />)}
        </Group>
      )}
      {data.refundProcessed.length > 0 && (
        <Group icon={Undo2} label="Refund Processed" tone="text-fuchsia-400">
          {data.refundProcessed.map((r) => <Row key={r.id} title={`${r.organizationName} · ${fmtCurrency(r.amount)}`} sub={r.refundedAt ? fmtDate(r.refundedAt) : ''} onClick={() => router.push('/commercial/billing?section=refunds')} />)}
        </Group>
      )}
    </div>
  );
}

function Group({ icon: Icon, label, tone, children }: { icon: typeof XCircle; label: string; tone: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 space-y-1.5">
      <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${tone}`}><Icon size={12} /> {label}</span>
      {children}
    </div>
  );
}

function Row({ title, sub, onClick }: { title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-900/60 transition-colors">
      <span className="block text-[11px] font-semibold text-slate-300 truncate">{title}</span>
      <span className="block text-[10px] text-slate-600 truncate">{sub}</span>
    </button>
  );
}
