'use client';

import { Building2, Users, Layers, HardDrive, DollarSign, HeartPulse, Clock, MapPin } from 'lucide-react';
import type { Org360Overview } from '@/types/org360';
import { OrgLogo, OrgStatusBadge, ExperienceBadge } from '@/components/organizations/OrgBadges';
import { fmtDate, fmtRelative, fmtMoney } from './shared';
import QuickActionsMenu, { QuickActionGates } from './QuickActionsMenu';

interface Props {
  overview: Org360Overview;
  gates: QuickActionGates;
  actions: {
    onImpersonate: () => void;
    onAssignPlan: () => void;
    onSuspend: () => void;
    onActivate: () => void;
    onResetLimits: () => void;
    onNotify: () => void;
    onSupportTicket: () => void;
    onExport: () => void;
    onArchive: () => void;
  };
}

function HeroCard({ icon: Icon, label, value, sub, tone }: { icon: typeof Building2; label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between min-h-[92px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <Icon size={14} className={tone || 'text-indigo-400'} />
      </div>
      <div>
        <span className="text-lg font-black text-slate-100 block truncate" title={value}>{value}</span>
        {sub && <span className="text-[10px] text-slate-600">{sub}</span>}
      </div>
    </div>
  );
}

export default function OrgHeader({ overview: o, gates, actions }: Props) {
  const isSuspended = o.status === 'SUSPENDED';
  const isArchived = o.status === 'ARCHIVED';
  const usageText = (m: { used: number; limit: number | null }) => (m.limit == null ? `${m.used} (unlimited)` : `${m.used} / ${m.limit}`);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <OrgLogo name={o.name} logoUrl={o.logoUrl} size={52} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-50 tracking-tight">{o.name}</h1>
              <OrgStatusBadge status={o.status} />
              <ExperienceBadge experience={o.workspaceExperience} />
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1.5 text-[11px] text-slate-500">
              <span className="font-mono">{o.slug}</span>
              <span>·</span>
              <span>{o.plan?.name || 'No plan'}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><MapPin size={11} /> {o.region}</span>
              <span>·</span>
              <span>Created {fmtDate(o.createdAt)}</span>
              {o.owner && (
                <>
                  <span>·</span>
                  <span>Owner: {o.owner.name}</span>
                </>
              )}
            </div>
            {isSuspended && o.suspendReason && (
              <p className="text-[11px] text-rose-400 mt-1.5">Suspended: {o.suspendReason}</p>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <QuickActionsMenu isSuspended={isSuspended} isArchived={isArchived} gates={gates} {...actions} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <HeroCard icon={Building2} label="Branches" value={String(o.kpis.branches.used)} sub={o.kpis.branches.limit != null ? `of ${o.kpis.branches.limit}` : 'unlimited'} />
        <HeroCard icon={Users} label="Members" value={String(o.kpis.members.used)} sub={o.kpis.members.limit != null ? `of ${o.kpis.members.limit}` : 'unlimited'} />
        <HeroCard icon={Layers} label="Org Users" value={String(o.kpis.users.used)} sub={o.kpis.users.limit != null ? `of ${o.kpis.users.limit}` : 'unlimited'} />
        <HeroCard icon={HardDrive} label="Storage Used" value={`${o.kpis.storage.used}${o.kpis.storage.unit ? ` ${o.kpis.storage.unit}` : ' GB'}`} sub={o.kpis.storage.limit != null ? `of ${o.kpis.storage.limit} GB` : 'unlimited'} />
        <HeroCard icon={Layers} label="Current Plan" value={o.plan?.name || '—'} sub={o.plan ? o.plan.billingCycle : undefined} />
        <HeroCard icon={DollarSign} label="Monthly Revenue" value={fmtMoney(o.kpis.monthlyRevenue, o.plan?.currency || 'USD')} />
        <HeroCard icon={HeartPulse} label="Health Score" value={String(o.kpis.health.score)} sub={o.kpis.health.band} tone={o.kpis.health.band === 'CRITICAL' ? 'text-rose-400' : o.kpis.health.band === 'WARNING' ? 'text-amber-400' : 'text-emerald-400'} />
        <HeroCard icon={Clock} label="Last Activity" value={fmtRelative(o.kpis.lastActivity)} />
      </div>
    </div>
  );
}
