'use client';

import { ShieldCheck, Layers, Boxes, Copy, Users, Clock } from 'lucide-react';
import type { RolesDashboardDTO } from '@/types/roles';

function KpiCard({ icon: Icon, label, value, tone }: { icon: typeof ShieldCheck; label: string; value: string; tone?: string }) {
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

export default function RolesKpiCards({ dashboard, loading }: { dashboard: RolesDashboardDTO | null; loading: boolean }) {
  if (loading || !dashboard) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <div key={i} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 min-h-[92px] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiCard icon={ShieldCheck} label="Total Roles" value={String(dashboard.totalRoles)} />
      <KpiCard icon={Layers} label="System Roles" value={String(dashboard.systemRoles)} tone="text-amber-400" />
      <KpiCard icon={Copy} label="Custom Roles" value={String(dashboard.customRoles)} tone="text-indigo-400" />
      <KpiCard icon={Boxes} label="Permission Groups" value={String(dashboard.permissionGroups)} tone="text-violet-400" />
      <KpiCard icon={Users} label="Users Assigned" value={String(dashboard.platformUsersAssigned)} tone="text-emerald-400" />
      <KpiCard icon={Clock} label="Temporary Grants" value={String(dashboard.temporaryAccessGrants)} tone={dashboard.temporaryAccessGrants > 0 ? 'text-sky-400' : 'text-slate-500'} />
    </div>
  );
}
