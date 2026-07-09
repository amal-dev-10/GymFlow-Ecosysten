'use client';

import { TrendingUp, MoonStar, Gauge, Clock, CreditCard, ShieldAlert } from 'lucide-react';
import type { OrganizationInsightsDTO } from '@/types/organizations';
import { OrgLogo, HealthBadge } from './OrgBadges';

interface Row {
  id: string;
  name: string;
  logoUrl: string | null;
  meta: string;
  health: { band: any; score: number };
}

function InsightCard({
  icon: Icon,
  title,
  tone,
  rows,
  emptyText,
  onOpen,
}: {
  icon: typeof TrendingUp;
  title: string;
  tone: string;
  rows: Row[];
  emptyText: string;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${tone}`}>
          <Icon size={15} />
        </div>
        <span className="text-xs font-bold text-slate-100">{title}</span>
        <span className="ml-auto text-[10px] font-bold text-slate-600">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-[11px] text-slate-600 py-3 text-center">{emptyText}</p>
      ) : (
        <div className="space-y-1.5">
          {rows.slice(0, 5).map((r) => (
            <button
              key={r.id}
              onClick={() => onOpen(r.id)}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-900/60 transition-colors text-left"
            >
              <OrgLogo name={r.name} logoUrl={r.logoUrl} size={26} />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-200 block truncate">{r.name}</span>
                <span className="text-[10px] text-slate-500 block truncate">{r.meta}</span>
              </div>
              <HealthBadge band={r.health.band} score={r.health.score} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString() : '—';
}

function daysUntil(d: string | null) {
  if (!d) return '';
  const diff = new Date(d).getTime() - Date.now();
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  return days <= 0 ? 'expiring today' : `in ${days}d`;
}

export default function OrgInsights({ insights, loading, onOpen }: { insights: OrganizationInsightsDTO | null; loading: boolean; onOpen: (id: string) => void }) {
  if (loading || !insights) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      <InsightCard
        icon={TrendingUp}
        title="Fastest Growing"
        tone="bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
        rows={insights.fastestGrowing.map((o) => ({ id: o.id, name: o.name, logoUrl: o.logoUrl, meta: `${o.members} members · ${o.plan || 'No plan'}`, health: o.health }))}
        emptyText="No growth data yet."
        onOpen={onOpen}
      />
      <InsightCard
        icon={MoonStar}
        title="Inactive Organizations"
        tone="bg-slate-500/10 border-slate-500/20 text-slate-300"
        rows={insights.inactive.map((o) => ({ id: o.id, name: o.name, logoUrl: o.logoUrl, meta: `Last active ${fmtDate(o.lastActiveAt)}`, health: o.health }))}
        emptyText="Everyone's been active recently."
        onOpen={onOpen}
      />
      <InsightCard
        icon={Gauge}
        title="Near Limits"
        tone="bg-amber-500/10 border-amber-500/20 text-amber-300"
        rows={insights.nearLimits.map((o) => ({ id: o.id, name: o.name, logoUrl: o.logoUrl, meta: `${o.members} / ${o.limit ?? '∞'} members`, health: o.health }))}
        emptyText="No organizations near their limits."
        onOpen={onOpen}
      />
      <InsightCard
        icon={Clock}
        title="Trials Expiring Soon"
        tone="bg-sky-500/10 border-sky-500/20 text-sky-300"
        rows={insights.trialExpiringSoon.map((o) => ({ id: o.id, name: o.name, logoUrl: o.logoUrl, meta: `Trial ends ${fmtDate(o.trialEndDate)} · ${daysUntil(o.trialEndDate)}`, health: o.health }))}
        emptyText="No trials expiring this week."
        onOpen={onOpen}
      />
      <InsightCard
        icon={CreditCard}
        title="Failed Payments"
        tone="bg-rose-500/10 border-rose-500/20 text-rose-300"
        rows={insights.failedPayments.map((o) => ({ id: o.id, name: o.name, logoUrl: o.logoUrl, meta: `${o.subscriptionStatus} · ${o.plan || 'No plan'}`, health: o.health }))}
        emptyText="No failed payments."
        onOpen={onOpen}
      />
      <InsightCard
        icon={ShieldAlert}
        title="Requiring Attention"
        tone="bg-rose-500/10 border-rose-500/20 text-rose-300"
        rows={insights.requiringAttention.map((o) => ({ id: o.id, name: o.name, logoUrl: o.logoUrl, meta: o.reasons.slice(0, 2).join(' · '), health: o.health }))}
        emptyText="Nothing needs attention right now."
        onOpen={onOpen}
      />
    </div>
  );
}
