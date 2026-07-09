'use client';

import { useEffect, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { platformPlansApi } from '@/lib/api';
import type { RevenueListFilters } from '@/types/revenue';

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';
const selectClass = inputClass + ' cursor-pointer';

interface Props {
  filters: RevenueListFilters;
  onChange: (f: RevenueListFilters) => void;
  onClose: () => void;
}

export default function RevenueFiltersPanel({ filters, onChange, onClose }: Props) {
  const [plans, setPlans] = useState<{ id: string; name: string }[]>([]);
  const [draft, setDraft] = useState<RevenueListFilters>(filters);

  useEffect(() => {
    platformPlansApi.list().then((res) => setPlans(res.map((p) => ({ id: p.id, name: p.name })))).catch(() => setPlans([]));
  }, []);

  const set = (key: keyof RevenueListFilters, value: string | undefined) => setDraft((d) => ({ ...d, [key]: (value || undefined) as any }));

  const apply = () => onChange({ ...draft, page: 1 });
  const clear = () => {
    const cleared = { page: 1, limit: filters.limit };
    setDraft(cleared);
    onChange(cleared);
  };

  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
          <SlidersHorizontal size={13} className="text-indigo-400" /> Advanced Filters
        </span>
        <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={15} /></button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Start Date</label>
          <input type="date" value={draft.startDate || ''} onChange={(e) => set('startDate', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">End Date</label>
          <input type="date" value={draft.endDate || ''} onChange={(e) => set('endDate', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Plan</label>
          <select value={draft.planId || ''} onChange={(e) => set('planId', e.target.value)} className={selectClass}>
            <option value="">Any</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-slate-900/60">
        <button onClick={apply} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors">
          Apply Filters
        </button>
        <button onClick={clear} className="px-4 py-2 bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-xl transition-colors">
          Clear All
        </button>
      </div>
    </div>
  );
}
