'use client';

import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { PlanChangeImpact } from '@/lib/planChangeImpact';
import { fmtMoney } from '../shared';

function limitLabel(type: string, value: number | null, unit: string | null) {
  if (type === 'UNLIMITED') return 'Unlimited';
  if (type === 'DISABLED') return 'Disabled';
  return `${value ?? 0}${unit ? ` ${unit}` : ''}`;
}

export default function PlanChangeImpactPanel({ impact, currency = 'USD' }: { impact: PlanChangeImpact; currency?: string }) {
  const { isUpgrade, isDowngrade, priceDelta, featuresLost, featuresGained, limitsReduced, limitsIncreased, warnings } = impact;

  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-3 p-4 rounded-2xl border ${isUpgrade ? 'bg-emerald-500/5 border-emerald-500/20' : isDowngrade ? 'bg-rose-500/5 border-rose-500/20' : 'bg-slate-900/50 border-slate-850'}`}>
        {isUpgrade ? <TrendingUp size={20} className="text-emerald-400 shrink-0" /> : isDowngrade ? <TrendingDown size={20} className="text-rose-400 shrink-0" /> : <CheckCircle2 size={20} className="text-slate-400 shrink-0" />}
        <div>
          <span className="text-sm font-bold text-slate-100 block">
            {isUpgrade ? 'This is an upgrade' : isDowngrade ? 'This is a downgrade' : 'Same-tier plan change'}
          </span>
          <span className="text-xs text-slate-400">
            Price change: {priceDelta > 0 ? '+' : ''}{fmtMoney(priceDelta, currency)}
          </span>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-amber-300">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {(featuresLost.length > 0 || featuresGained.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {featuresLost.length > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Feature Loss</span>
              <div className="space-y-1 mt-2">
                {featuresLost.map((f) => (
                  <div key={f.key} className="flex items-center gap-1.5 text-xs text-slate-300">
                    <XCircle size={12} className="text-rose-400 shrink-0" />
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
          )}
          {featuresGained.length > 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">New Features</span>
              <div className="space-y-1 mt-2">
                {featuresGained.map((f) => (
                  <div key={f.key} className="flex items-center gap-1.5 text-xs text-slate-300">
                    <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(limitsReduced.length > 0 || limitsIncreased.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {limitsReduced.length > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Limit Reduction</span>
              <div className="space-y-1.5 mt-2">
                {limitsReduced.map((l) => (
                  <div key={l.key} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{l.label}</span>
                    <span className="text-slate-500">
                      {limitLabel(l.fromType, l.fromValue, l.unit)} <span className="text-rose-400">→</span> {limitLabel(l.toType, l.toValue, l.unit)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {limitsIncreased.length > 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Limit Increase</span>
              <div className="space-y-1.5 mt-2">
                {limitsIncreased.map((l) => (
                  <div key={l.key} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{l.label}</span>
                    <span className="text-slate-500">
                      {limitLabel(l.fromType, l.fromValue, l.unit)} <span className="text-emerald-400">→</span> {limitLabel(l.toType, l.toValue, l.unit)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {featuresLost.length === 0 && featuresGained.length === 0 && limitsReduced.length === 0 && limitsIncreased.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-2">No feature or limit changes between these plans.</p>
      )}
    </div>
  );
}
