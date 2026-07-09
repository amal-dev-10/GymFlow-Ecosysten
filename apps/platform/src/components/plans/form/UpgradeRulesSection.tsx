'use client';

import type { PlanDTO } from '@/types/plans';
import type { SectionProps } from './types';
import { labelClass, inputClass, sectionTitleClass } from './formStyles';

interface Props extends SectionProps {
  otherPlans: PlanDTO[];
}

export default function UpgradeRulesSection({ state, update, otherPlans }: Props) {
  const toggleUpgradeTarget = (planId: string) => {
    const set = new Set(state.upgradeableToPlanIds);
    if (set.has(planId)) set.delete(planId);
    else set.add(planId);
    update('upgradeableToPlanIds', Array.from(set));
  };

  return (
    <div>
      <h3 className={sectionTitleClass}>Upgrade Rules</h3>

      <div className="mb-5">
        <label className={labelClass}>Upgradeable To</label>
        {otherPlans.length === 0 ? (
          <p className="text-xs text-slate-600">No other plans exist yet to link as an upgrade path.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {otherPlans.map((plan) => {
              const selected = state.upgradeableToPlanIds.includes(plan.id);
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => toggleUpgradeTarget(plan.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    selected ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300' : 'border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {plan.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={state.downgradeAllowed} onChange={(e) => update('downgradeAllowed', e.target.checked)} className="accent-indigo-500 w-4 h-4" />
          <span className="text-xs text-slate-300">Downgrade Allowed</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={state.autoUpgrade} onChange={(e) => update('autoUpgrade', e.target.checked)} className="accent-indigo-500 w-4 h-4" />
          <span className="text-xs text-slate-300">Auto Upgrade on limit breach</span>
        </label>

        <div>
          <label className={labelClass}>Grace Period (days)</label>
          <input
            type="number"
            min={0}
            value={state.gracePeriodDays}
            onChange={(e) => update('gracePeriodDays', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
