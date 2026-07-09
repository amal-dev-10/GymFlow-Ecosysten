'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, AlertTriangle, Gauge } from 'lucide-react';
import { featureEngineApi, platformOrganizationsApi, handleApiError } from '@/lib/api';
import type { OrganizationDetailDTO } from '@/types/featureEngine';
import type { UsageTrend } from '@/types/org360';
import { SectionCard, TabLoading, EmptyRow, MiniAreaChart } from '../shared';

function UsageRow({ label, used, limitType, limitValue, unit }: { label: string; used: number; limitType: string; limitValue: number | null; unit?: string | null }) {
  const unlimited = limitType === 'UNLIMITED';
  const disabled = limitType === 'DISABLED';
  const pct = unlimited || disabled || !limitValue ? null : Math.min(100, Math.round((used / limitValue) * 100));
  const remaining = limitType === 'LIMITED' && limitValue != null ? Math.max(0, limitValue - used) : null;
  const exceeded = pct !== null && pct >= 100;
  const warning = pct !== null && pct >= 80 && pct < 100;
  const barColor = exceeded ? 'bg-rose-500' : warning ? 'bg-amber-400' : 'bg-indigo-500';

  return (
    <div className="py-3 border-b border-slate-900/60 last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-300">{label}</span>
        <span className={`text-[11px] font-bold ${exceeded ? 'text-rose-400' : warning ? 'text-amber-400' : 'text-slate-400'}`}>
          {disabled ? 'Disabled' : unlimited ? `${used}${unit ? ` ${unit}` : ''} / Unlimited` : `${used} / ${limitValue}${unit ? ` ${unit}` : ''}`}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
        {!disabled && <div className={`h-full rounded-full ${unlimited ? 'bg-emerald-500/60' : barColor}`} style={{ width: unlimited ? '100%' : `${pct ?? 0}%` }} />}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-slate-600">{remaining != null ? `${remaining} remaining` : unlimited ? 'No limit' : disabled ? 'Not available on plan' : ''}</span>
        {pct != null && <span className="text-[10px] text-slate-600">{pct}%</span>}
      </div>
    </div>
  );
}

export default function UsageTab({ orgId }: { orgId: string }) {
  const [detail, setDetail] = useState<OrganizationDetailDTO | null>(null);
  const [trend, setTrend] = useState<UsageTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([featureEngineApi.getOrganizationDetail(orgId), platformOrganizationsApi.getUsageTrend(orgId)])
      .then(([d, t]) => {
        setDetail(d);
        setTrend(t);
      })
      .catch((e) => setErr(handleApiError(e)))
      .finally(() => setLoading(false));
  }, [orgId]);

  if (loading) return <TabLoading />;
  if (err) return <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{err}</div>;
  if (!detail) return <SectionCard><EmptyRow text="No usage data available." /></SectionCard>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <SectionCard title="Current Usage vs Limits" action={<Gauge size={14} className="text-slate-600" />}>
          <div>
            {detail.usage.map((u) => (
              <UsageRow key={u.resourceKey} label={u.label} used={u.used} limitType={u.limitType} limitValue={u.limitValue} unit={u.unit} />
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="space-y-4">
        <SectionCard title="Member Growth" action={trend && <span className={`text-[10px] font-bold ${trend.growthRate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{trend.growthRate >= 0 ? '+' : ''}{trend.growthRate}%</span>}>
          {trend && trend.series.length > 0 ? (
            <>
              <MiniAreaChart points={trend.series.map((s) => s.members)} label="members" color="#6366f1" />
              <div className="flex justify-between mt-1">
                {trend.series.map((s) => <span key={s.key} className="text-[9px] text-slate-600">{s.label}</span>)}
              </div>
            </>
          ) : (
            <EmptyRow text="Not enough history yet." />
          )}
        </SectionCard>

        <SectionCard title="Branch Growth">
          {trend && trend.series.length > 0 ? (
            <>
              <MiniAreaChart points={trend.series.map((s) => s.branches)} label="branches" color="#8b5cf6" height={90} />
              <div className="flex justify-between mt-1">
                {trend.series.map((s) => <span key={s.key} className="text-[9px] text-slate-600">{s.label}</span>)}
              </div>
            </>
          ) : (
            <EmptyRow text="Not enough history yet." />
          )}
        </SectionCard>

        <SectionCard title="Warnings" action={<AlertTriangle size={14} className="text-amber-400" />}>
          {detail.violations.length === 0 ? (
            <EmptyRow text="No usage warnings — all within limits." />
          ) : (
            <div className="space-y-2">
              {detail.violations.map((v, i) => (
                <div key={i} className={`p-3 rounded-xl border ${v.severity === 'exceeded' ? 'bg-rose-500/5 border-rose-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={12} className={v.severity === 'exceeded' ? 'text-rose-400' : 'text-amber-400'} />
                    <span className="text-xs font-bold text-slate-200">{v.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Using {v.used} / {v.limitValue} · {v.action}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {detail.upgradeRecommendation && (
          <SectionCard title="Recommendation" action={<TrendingUp size={14} className="text-emerald-400" />}>
            <p className="text-xs font-bold text-emerald-300">{detail.upgradeRecommendation.recommendedPlan.name}</p>
            <p className="text-[11px] text-slate-500 mt-1">{detail.upgradeRecommendation.reason}</p>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
