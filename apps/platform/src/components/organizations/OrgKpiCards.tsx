'use client';

import { Building2, CheckCircle2, Clock, Ban, AlertOctagon, Gem, Sparkle, HeartPulse } from 'lucide-react';
import type { OrganizationStatsDTO } from '@/types/organizations';

function KpiCard({ icon: Icon, label, value, tone, sub }: { icon: typeof Building2; label: string; value: string; tone?: 'default' | 'warning' | 'danger'; sub?: string }) {
  const toneClass = tone === 'danger' ? 'text-rose-400' : tone === 'warning' ? 'text-amber-400' : 'text-indigo-400';
  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between min-h-[96px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <Icon size={14} className={toneClass} />
      </div>
      <div>
        <span className="text-xl font-black text-slate-100 block">{value}</span>
        {sub && <span className="text-[10px] text-slate-600">{sub}</span>}
      </div>
    </div>
  );
}

export default function OrgKpiCards({ stats, loading }: { stats: OrganizationStatsDTO | null; loading: boolean }) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 min-h-[96px] animate-pulse">
            <div className="h-2.5 w-14 bg-slate-900 rounded mb-3" />
            <div className="h-5 w-10 bg-slate-900 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      <KpiCard icon={Building2} label="Total" value={String(stats.total)} />
      <KpiCard icon={CheckCircle2} label="Active" value={String(stats.active)} />
      <KpiCard icon={Clock} label="Trial" value={String(stats.trial)} />
      <KpiCard icon={Ban} label="Suspended" value={String(stats.suspended)} tone={stats.suspended > 0 ? 'danger' : 'default'} />
      <KpiCard icon={AlertOctagon} label="Expired" value={String(stats.expired)} tone={stats.expired > 0 ? 'warning' : 'default'} />
      <KpiCard icon={Gem} label="Enterprise" value={String(stats.enterprise)} />
      <KpiCard icon={Sparkle} label="New This Month" value={String(stats.newThisMonth)} />
      <KpiCard icon={HeartPulse} label="Avg Health" value={String(stats.averageHealthScore)} sub="out of 100" />
    </div>
  );
}
