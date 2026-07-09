'use client';

import { Layers, CheckCircle2, FileEdit, Building2, Star, DollarSign } from 'lucide-react';
import type { PlanStatsDTO } from '@/types/plans';

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof Layers; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between min-h-[100px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <Icon size={14} className="text-indigo-400" />
      </div>
      <div>
        <span className="text-xl font-black text-slate-100 block truncate" title={value}>{value}</span>
        {sub && <span className="text-[10px] text-slate-600">{sub}</span>}
      </div>
    </div>
  );
}

export default function PlanStatCards({ stats, loading }: { stats: PlanStatsDTO | null; loading: boolean }) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 min-h-[100px] animate-pulse">
            <div className="h-2.5 w-16 bg-slate-900 rounded mb-3" />
            <div className="h-5 w-12 bg-slate-900 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard icon={Layers} label="Total Plans" value={String(stats.totalPlans)} />
      <StatCard icon={CheckCircle2} label="Active Plans" value={String(stats.activePlans)} />
      <StatCard icon={FileEdit} label="Draft Plans" value={String(stats.draftPlans)} />
      <StatCard icon={Building2} label="Orgs Using Plans" value={String(stats.organizationsUsingPlans)} />
      <StatCard
        icon={Star}
        label="Most Popular"
        value={stats.mostPopularPlan?.name || '—'}
        sub={stats.mostPopularPlan ? `${stats.mostPopularPlan.organizationCount} orgs` : 'No data yet'}
      />
      <StatCard
        icon={DollarSign}
        label="MRR by Plan"
        value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(stats.mrrByPlan)}
      />
    </div>
  );
}
