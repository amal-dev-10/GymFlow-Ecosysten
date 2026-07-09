'use client';

import type { PlanDTO, PlanResourceLimitDTO } from '@/types/plans';
import PlanStatusBadge from './PlanStatusBadge';
import PlanVisibilityBadge from './PlanVisibilityBadge';
import { BILLING_CYCLE_LABEL, formatPriceWithCycle } from '@/lib/planFormat';

function limitLabel(limit: PlanResourceLimitDTO | undefined) {
  if (!limit) return '—';
  if (limit.limitType === 'UNLIMITED') return 'Unlimited';
  if (limit.limitType === 'DISABLED') return 'Disabled';
  return `${limit.limitValue}${limit.resource.unit ? ` ${limit.resource.unit}` : ''}`;
}

const FEATURE_STATE_LABEL: Record<string, string> = {
  ENABLED: 'Enabled',
  DISABLED: '—',
  BETA: 'Beta',
  ENTERPRISE_ONLY: 'Enterprise Only',
};

export default function PlanComparisonTable({ plans }: { plans: PlanDTO[] }) {
  const resourceKeys = Array.from(
    new Set(plans.flatMap((p) => (p.resourceLimits || []).map((r) => r.resourceKey))),
  );
  const resourceLabels = new Map<string, string>();
  plans.forEach((p) => (p.resourceLimits || []).forEach((r) => resourceLabels.set(r.resourceKey, r.resource.label)));

  const featureKeys = Array.from(
    new Set(plans.flatMap((p) => (p.featureAccess || []).map((f) => f.featureKey))),
  );
  const featureLabels = new Map<string, string>();
  plans.forEach((p) => (p.featureAccess || []).forEach((f) => featureLabels.set(f.featureKey, f.feature.label)));

  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
      <table className="w-full text-left min-w-[640px]">
        <thead>
          <tr className="border-b border-slate-800/60">
            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 sticky left-0 bg-[#0b101d]">Plan</th>
            {plans.map((plan) => (
              <th key={plan.id} className="px-4 py-3">
                <span className="text-xs font-black text-slate-100 block">{plan.name}</span>
                <span className="text-[10px] text-slate-500">{formatPriceWithCycle(plan.price, plan.currency, plan.billingCycle)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-900/60 bg-slate-950/40">
            <td className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 sticky left-0 bg-[#0b101d]" colSpan={plans.length + 1}>Pricing</td>
          </tr>
          <tr className="border-b border-slate-900/60">
            <td className="px-4 py-2.5 text-xs text-slate-400 sticky left-0 bg-[#0b101d]">Billing Cycle</td>
            {plans.map((p) => <td key={p.id} className="px-4 py-2.5 text-xs text-slate-300">{BILLING_CYCLE_LABEL[p.billingCycle]}</td>)}
          </tr>
          <tr className="border-b border-slate-900/60">
            <td className="px-4 py-2.5 text-xs text-slate-400 sticky left-0 bg-[#0b101d]">Trial Days</td>
            {plans.map((p) => <td key={p.id} className="px-4 py-2.5 text-xs text-slate-300">{p.trialDays || '—'}</td>)}
          </tr>
          <tr className="border-b border-slate-900/60">
            <td className="px-4 py-2.5 text-xs text-slate-400 sticky left-0 bg-[#0b101d]">Setup Fee</td>
            {plans.map((p) => <td key={p.id} className="px-4 py-2.5 text-xs text-slate-300">{p.setupFee ? formatPriceWithCycle(p.setupFee, p.currency, 'FREE') : '—'}</td>)}
          </tr>

          <tr className="border-b border-slate-900/60 bg-slate-950/40">
            <td className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 sticky left-0 bg-[#0b101d]" colSpan={plans.length + 1}>Visibility & Status</td>
          </tr>
          <tr className="border-b border-slate-900/60">
            <td className="px-4 py-2.5 text-xs text-slate-400 sticky left-0 bg-[#0b101d]">Status</td>
            {plans.map((p) => <td key={p.id} className="px-4 py-2.5"><PlanStatusBadge status={p.status} /></td>)}
          </tr>
          <tr className="border-b border-slate-900/60">
            <td className="px-4 py-2.5 text-xs text-slate-400 sticky left-0 bg-[#0b101d]">Visibility</td>
            {plans.map((p) => <td key={p.id} className="px-4 py-2.5"><PlanVisibilityBadge visibility={p.visibility} /></td>)}
          </tr>

          <tr className="border-b border-slate-900/60 bg-slate-950/40">
            <td className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 sticky left-0 bg-[#0b101d]" colSpan={plans.length + 1}>Limits</td>
          </tr>
          {resourceKeys.map((key) => (
            <tr key={key} className="border-b border-slate-900/60">
              <td className="px-4 py-2.5 text-xs text-slate-400 sticky left-0 bg-[#0b101d]">{resourceLabels.get(key)}</td>
              {plans.map((p) => (
                <td key={p.id} className="px-4 py-2.5 text-xs text-slate-300">
                  {limitLabel((p.resourceLimits || []).find((r) => r.resourceKey === key))}
                </td>
              ))}
            </tr>
          ))}

          <tr className="border-b border-slate-900/60 bg-slate-950/40">
            <td className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 sticky left-0 bg-[#0b101d]" colSpan={plans.length + 1}>Features</td>
          </tr>
          {featureKeys.map((key) => (
            <tr key={key} className="border-b border-slate-900/60 last:border-0">
              <td className="px-4 py-2.5 text-xs text-slate-400 sticky left-0 bg-[#0b101d]">{featureLabels.get(key)}</td>
              {plans.map((p) => {
                const access = (p.featureAccess || []).find((f) => f.featureKey === key);
                return (
                  <td key={p.id} className="px-4 py-2.5 text-xs text-slate-300">
                    {access ? FEATURE_STATE_LABEL[access.state] : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
