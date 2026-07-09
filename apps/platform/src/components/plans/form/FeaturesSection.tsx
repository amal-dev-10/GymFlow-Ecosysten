'use client';

import type { FeatureDefinitionDTO, FeatureState } from '@/types/plans';
import type { SectionProps } from './types';
import { sectionTitleClass } from './formStyles';

interface Props extends SectionProps {
  catalog: FeatureDefinitionDTO[];
}

const FEATURE_STATES: { value: FeatureState; label: string }[] = [
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'ENABLED', label: 'Enabled' },
  { value: 'BETA', label: 'Beta' },
  { value: 'ENTERPRISE_ONLY', label: 'Enterprise Only' },
];

export default function FeaturesSection({ state, update, catalog }: Props) {
  const setState = (key: string, value: FeatureState) => {
    update('featureAccess', { ...state.featureAccess, [key]: value });
  };

  const grouped = catalog.reduce<Record<string, FeatureDefinitionDTO[]>>((acc, f) => {
    (acc[f.category] ||= []).push(f);
    return acc;
  }, {});

  return (
    <div>
      <h3 className={sectionTitleClass}>Feature Access</h3>
      <p className="text-xs text-slate-500 mb-4">Enable or disable every feature in the catalog for this plan.</p>

      <div className="space-y-5">
        {Object.entries(grouped).map(([category, features]) => (
          <div key={category}>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 block mb-2">{category}</span>
            <div className="space-y-2">
              {features.map((feature) => {
                const current = state.featureAccess[feature.key] || 'DISABLED';
                return (
                  <div key={feature.key} className="flex items-center gap-3 bg-slate-950 border border-slate-800/85 rounded-xl p-3">
                    <span className="text-xs font-semibold text-slate-200 flex-1 min-w-[140px]">{feature.label}</span>
                    <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 flex-wrap">
                      {FEATURE_STATES.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setState(feature.key, opt.value)}
                          className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-colors ${
                            current === opt.value ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
