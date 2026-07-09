'use client';

import { RotateCw } from 'lucide-react';
import { ToggleMapField, InfoNote } from './SettingsFieldKit';
import { PLATFORM_VERSION } from '@/app/(app)/layout';
import type { CategoryValues } from '@/types/globalSettings';

export default function SystemSettingsFields({ values, setValue, canEdit }: { values: CategoryValues; setValue: (k: string, v: any) => void; canEdit: boolean }) {
  const environment = process.env.NODE_ENV === 'production' ? 'Production' : 'Development';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="px-3 py-2.5 rounded-xl bg-slate-900/40 border border-slate-850">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Environment</span>
          <span className="text-sm font-bold text-slate-200">{environment}</span>
        </div>
        <div className="px-3 py-2.5 rounded-xl bg-slate-900/40 border border-slate-850">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Platform Version</span>
          <span className="text-sm font-bold text-slate-200">{PLATFORM_VERSION}</span>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-900/40 border border-slate-850">
        <div>
          <span className="block text-xs font-semibold text-slate-200">Cache</span>
          <span className="text-[10px] text-slate-600">
            {values.cacheLastClearedAt ? `Last marked cleared: ${new Date(values.cacheLastClearedAt).toLocaleString()}` : 'Never marked cleared.'}
          </span>
        </div>
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => setValue('cacheLastClearedAt', new Date().toISOString())}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-indigo-500/30 text-[11px] font-bold text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCw size={12} /> Mark Cache Cleared
        </button>
      </div>
      <InfoNote>No in-memory or Redis caching layer exists in this codebase - this records when an operator last invoked the action, for audit purposes only.</InfoNote>

      <ToggleMapField label="Feature Toggle Defaults" hint="Default state applied to new feature flags of these keys - does not change existing flags already set in the Feature Flags module." value={values.featureToggleDefaults} onChange={(v) => setValue('featureToggleDefaults', v)} disabled={!canEdit} />
    </div>
  );
}
