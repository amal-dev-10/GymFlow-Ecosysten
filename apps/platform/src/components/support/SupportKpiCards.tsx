'use client';

import { Inbox, Flame, Sparkles, Clock, CheckCircle2, Timer, Hourglass, Star } from 'lucide-react';
import type { SupportDashboardDTO } from '@/types/support';

function KpiCard({ icon: Icon, label, value, tone }: { icon: typeof Inbox; label: string; value: string; tone?: string }) {
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

function fmtMinutes(minutes: number | null): string {
  if (minutes == null) return '-';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round((minutes / 60) * 10) / 10}h`;
  return `${Math.round((minutes / 1440) * 10) / 10}d`;
}

export default function SupportKpiCards({ dashboard, loading }: { dashboard: SupportDashboardDTO | null; loading: boolean }) {
  if (loading || !dashboard) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[...Array(8)].map((_, i) => <div key={i} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 min-h-[92px] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      <KpiCard icon={Inbox} label="Open Tickets" value={String(dashboard.openTickets)} tone="text-sky-400" />
      <KpiCard icon={Flame} label="Critical Tickets" value={String(dashboard.criticalTickets)} tone={dashboard.criticalTickets > 0 ? 'text-rose-400' : 'text-slate-500'} />
      <KpiCard icon={Sparkles} label="Pending Tickets" value={String(dashboard.pendingTickets)} tone="text-violet-400" />
      <KpiCard icon={Clock} label="Waiting on Customer" value={String(dashboard.waitingOnCustomer)} tone="text-amber-400" />
      <KpiCard icon={CheckCircle2} label="Resolved Today" value={String(dashboard.resolvedToday)} tone="text-emerald-400" />
      <KpiCard icon={Timer} label="Avg Response Time" value={fmtMinutes(dashboard.avgResponseMinutes)} tone="text-cyan-400" />
      <KpiCard icon={Hourglass} label="Avg Resolution Time" value={fmtMinutes(dashboard.avgResolutionMinutes)} tone="text-indigo-400" />
      <KpiCard icon={Star} label="Customer Satisfaction" value={dashboard.avgCsat != null ? `${dashboard.avgCsat}/5` : '-'} tone="text-amber-400" />
    </div>
  );
}
