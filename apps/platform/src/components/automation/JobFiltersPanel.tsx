'use client';

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { JOB_CATEGORIES, JOB_STATUSES, SCHEDULE_TYPES } from '@/types/automation';
import type { ListJobsFilters } from '@/types/automation';

const selectClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none cursor-pointer';

export default function JobFiltersPanel({ filters, onChange, onClose }: { filters: ListJobsFilters; onChange: (f: ListJobsFilters) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<ListJobsFilters>(filters);

  const set = (key: keyof ListJobsFilters, value: string | undefined) => setDraft((d) => ({ ...d, [key]: value || undefined }));
  const apply = () => onChange({ ...draft, page: 1 });
  const clear = () => { const cleared = { page: 1, limit: filters.limit }; setDraft(cleared); onChange(cleared); };

  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200"><SlidersHorizontal size={13} className="text-indigo-400" /> Advanced Filters</span>
        <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={15} /></button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Category</label>
          <select value={draft.category || ''} onChange={(e) => set('category', e.target.value)} className={selectClass}>
            <option value="">Any Category</option>
            {JOB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Status</label>
          <select value={draft.status || ''} onChange={(e) => set('status', e.target.value)} className={selectClass}>
            <option value="">Any Status</option>
            {JOB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Schedule</label>
          <select value={draft.scheduleType || ''} onChange={(e) => set('scheduleType', e.target.value)} className={selectClass}>
            <option value="">Any Schedule</option>
            {SCHEDULE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-slate-900/60">
        <button onClick={apply} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors">Apply Filters</button>
        <button onClick={clear} className="px-4 py-2 bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-xl transition-colors">Clear All</button>
      </div>
    </div>
  );
}
