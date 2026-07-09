'use client';

import { ScrollText, Flame, KeyRound, Building2, Repeat, Server, Webhook, ShieldAlert } from 'lucide-react';
import type { AuditDashboardDTO } from '@/types/audit';

function KpiCard({ icon: Icon, label, value, tone }: { icon: typeof ScrollText; label: string; value: string; tone?: string }) {
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

export default function AuditKpiCards({ dashboard, loading }: { dashboard: AuditDashboardDTO | null; loading: boolean }) {
  if (loading || !dashboard) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[...Array(8)].map((_, i) => <div key={i} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 min-h-[92px] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      <KpiCard icon={ScrollText} label="Total Events Today" value={String(dashboard.totalEventsToday)} />
      <KpiCard icon={Flame} label="Critical Events" value={String(dashboard.criticalEvents)} tone={dashboard.criticalEvents > 0 ? 'text-rose-400' : 'text-slate-500'} />
      <KpiCard icon={KeyRound} label="Authentication" value={String(dashboard.authenticationEvents)} tone="text-sky-400" />
      <KpiCard icon={Building2} label="Organization" value={String(dashboard.organizationEvents)} tone="text-indigo-400" />
      <KpiCard icon={Repeat} label="Subscription" value={String(dashboard.subscriptionEvents)} tone="text-emerald-400" />
      <KpiCard icon={Server} label="System" value={String(dashboard.systemEvents)} tone="text-cyan-400" />
      <KpiCard icon={Webhook} label="API" value={String(dashboard.apiEvents)} tone="text-violet-400" />
      <KpiCard icon={ShieldAlert} label="Security" value={String(dashboard.securityEvents)} tone={dashboard.securityEvents > 0 ? 'text-orange-400' : 'text-slate-500'} />
    </div>
  );
}
