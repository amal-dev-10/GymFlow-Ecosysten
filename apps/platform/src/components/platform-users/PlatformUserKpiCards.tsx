'use client';

import { Users, CheckCircle2, Clock, Ban, Radio, Crown, LifeBuoy, Code2 } from 'lucide-react';
import type { PlatformUserStatsDTO } from '@/types/platformUsers';

function KpiCard({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: string; tone?: string }) {
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

export default function PlatformUserKpiCards({ stats, loading }: { stats: PlatformUserStatsDTO | null; loading: boolean }) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[...Array(8)].map((_, i) => <div key={i} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 min-h-[92px] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      <KpiCard icon={Users} label="Total Users" value={String(stats.total)} />
      <KpiCard icon={CheckCircle2} label="Active" value={String(stats.active)} tone="text-emerald-400" />
      <KpiCard icon={Clock} label="Pending Invitations" value={String(stats.pendingInvitations)} tone="text-sky-400" />
      <KpiCard icon={Ban} label="Suspended" value={String(stats.suspended)} tone={stats.suspended > 0 ? 'text-rose-400' : 'text-slate-500'} />
      <KpiCard icon={Radio} label="Online Now" value={String(stats.online)} tone="text-emerald-400" />
      <KpiCard icon={Crown} label="Administrators" value={String(stats.administrators)} tone="text-amber-400" />
      <KpiCard icon={LifeBuoy} label="Support Engineers" value={String(stats.supportEngineers)} tone="text-sky-400" />
      <KpiCard icon={Code2} label="Developers" value={String(stats.developers)} tone="text-cyan-400" />
    </div>
  );
}
