'use client';

import type { SectionProps } from './types';
import { labelClass, inputClass, selectClass, sectionTitleClass } from './formStyles';

export default function GeneralSection({ state, update }: SectionProps) {
  return (
    <div>
      <h3 className={sectionTitleClass}>General</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Plan Name</label>
          <input
            value={state.name}
            onChange={(e) => update('name', e.target.value)}
            className={inputClass}
            placeholder="Growth"
          />
        </div>
        <div>
          <label className={labelClass}>Internal Code</label>
          <input
            value={state.internalCode}
            onChange={(e) => update('internalCode', e.target.value.trim().toLowerCase().replace(/\s+/g, '-'))}
            className={inputClass}
            placeholder="growth"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Description</label>
          <textarea
            value={state.description}
            onChange={(e) => update('description', e.target.value)}
            className={`${inputClass} min-h-[80px] resize-none`}
            placeholder="Who is this plan for, and what does it unlock?"
          />
        </div>

        <div>
          <label className={labelClass}>Badge</label>
          <input
            value={state.badge}
            onChange={(e) => update('badge', e.target.value)}
            className={inputClass}
            placeholder="Most Popular"
          />
        </div>
        <div>
          <label className={labelClass}>Display Order</label>
          <input
            type="number"
            value={state.displayOrder}
            onChange={(e) => update('displayOrder', Number(e.target.value))}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <select value={state.status} onChange={(e) => update('status', e.target.value as any)} className={selectClass}>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Visibility</label>
          <select value={state.visibility} onChange={(e) => update('visibility', e.target.value as any)} className={selectClass}>
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private</option>
            <option value="INTERNAL">Internal</option>
          </select>
        </div>

        <label className="sm:col-span-2 flex items-center gap-2.5 cursor-pointer mt-1">
          <input type="checkbox" checked={state.isDefault} onChange={(e) => update('isDefault', e.target.checked)} className="accent-indigo-500 w-4 h-4" />
          <span className="text-xs text-slate-300">Set as the default plan automatically assigned to new organizations</span>
        </label>
      </div>
    </div>
  );
}
