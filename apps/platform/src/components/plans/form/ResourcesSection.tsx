'use client';

import type { ResourceDefinitionDTO, ResourceLimitType } from '@/types/plans';
import type { SectionProps } from './types';
import { sectionTitleClass } from './formStyles';

interface Props extends SectionProps {
  catalog: ResourceDefinitionDTO[];
}

const LIMIT_TYPES: ResourceLimitType[] = ['LIMITED', 'UNLIMITED', 'DISABLED'];

export default function ResourcesSection({ state, update, catalog }: Props) {
  const setLimitType = (key: string, limitType: ResourceLimitType) => {
    update('resourceLimits', {
      ...state.resourceLimits,
      [key]: { limitType, limitValue: limitType === 'LIMITED' ? state.resourceLimits[key]?.limitValue || '' : '' },
    });
  };

  const setLimitValue = (key: string, limitValue: string) => {
    update('resourceLimits', {
      ...state.resourceLimits,
      [key]: { limitType: state.resourceLimits[key]?.limitType || 'LIMITED', limitValue },
    });
  };

  const grouped = catalog.reduce<Record<string, ResourceDefinitionDTO[]>>((acc, r) => {
    (acc[r.category] ||= []).push(r);
    return acc;
  }, {});

  return (
    <div>
      <h3 className={sectionTitleClass}>Plan Resources</h3>
      <p className="text-xs text-slate-500 mb-4">Configure limits for every resource in the catalog. Each resource can be limited to a number, unlimited, or disabled entirely.</p>

      <div className="space-y-5">
        {Object.entries(grouped).map(([category, resources]) => (
          <div key={category}>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 block mb-2">{category}</span>
            <div className="space-y-2">
              {resources.map((resource) => {
                const current = state.resourceLimits[resource.key] || { limitType: 'DISABLED' as ResourceLimitType, limitValue: '' };
                return (
                  <div key={resource.key} className="flex items-center gap-3 bg-slate-950 border border-slate-800/85 rounded-xl p-3">
                    <span className="text-xs font-semibold text-slate-200 flex-1 min-w-[120px]">{resource.label}</span>
                    <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5">
                      {LIMIT_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setLimitType(resource.key, type)}
                          className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-colors ${
                            current.limitType === type ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {type === 'LIMITED' ? 'Limited' : type === 'UNLIMITED' ? 'Unlimited' : 'Disabled'}
                        </button>
                      ))}
                    </div>
                    {current.limitType === 'LIMITED' && (
                      <input
                        type="number"
                        min={0}
                        value={current.limitValue}
                        onChange={(e) => setLimitValue(resource.key, e.target.value)}
                        placeholder={resource.unit || 'Value'}
                        className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-indigo-500"
                      />
                    )}
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
