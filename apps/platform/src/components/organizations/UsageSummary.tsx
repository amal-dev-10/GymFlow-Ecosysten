'use client';

import type { UsageMetric } from '@/types/organizations';

function MiniBar({ label, metric }: { label: string; metric: UsageMetric }) {
  const unlimited = metric.limit === null;
  const disabled = metric.limit === 0;
  const pct = unlimited || disabled ? null : Math.min(100, Math.round((metric.used / (metric.limit || 1)) * 100));
  const exceeded = pct !== null && pct >= 100;
  const warning = pct !== null && pct >= 85 && pct < 100;
  const barColor = exceeded ? 'bg-rose-500' : warning ? 'bg-amber-400' : 'bg-indigo-500';
  const valueText = disabled
    ? '—'
    : unlimited
      ? `${metric.used}${metric.unit ? ` ${metric.unit}` : ''} / ∞`
      : `${metric.used}${metric.unit ? metric.unit : ''} / ${metric.limit}${metric.unit ? metric.unit : ''}`;

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">{label}</span>
        <span className={`text-[10px] font-bold ${exceeded ? 'text-rose-400' : warning ? 'text-amber-400' : 'text-slate-400'}`}>{valueText}</span>
      </div>
      <div className="h-1 w-full rounded-full bg-slate-900 overflow-hidden">
        {!disabled && <div className={`h-full rounded-full ${unlimited ? 'bg-emerald-500/60' : barColor}`} style={{ width: unlimited ? '100%' : `${pct ?? 0}%` }} />}
      </div>
    </div>
  );
}

export default function UsageSummary({
  members,
  storage,
  branches,
  users,
  compact = false,
}: {
  members: UsageMetric;
  storage: UsageMetric;
  branches: UsageMetric;
  users: UsageMetric;
  compact?: boolean;
}) {
  return (
    <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2'} gap-x-4 gap-y-2 min-w-[180px]`}>
      <MiniBar label="Members" metric={members} />
      <MiniBar label="Storage" metric={storage} />
      <MiniBar label="Branches" metric={branches} />
      <MiniBar label="Users" metric={users} />
    </div>
  );
}
