'use client';

import { useEffect, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { platformAuditApi } from '@/lib/api';
import type { AuditCategoryDTO, AuditListFilters, Severity } from '@/types/audit';

const SEVERITIES: Severity[] = ['Information', 'Low', 'Medium', 'High', 'Critical'];
const BROWSERS = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
const OS_LIST = ['Windows', 'macOS', 'Android', 'iOS', 'Linux', 'Unknown'];
const COUNTRIES = ['United States', 'United Kingdom', 'India', 'Canada', 'Germany', 'Australia', 'Singapore', 'United Arab Emirates', 'Brazil', 'Netherlands', 'Japan', 'South Africa'];

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';
const selectClass = inputClass + ' cursor-pointer';

interface Props {
  filters: AuditListFilters;
  onChange: (f: AuditListFilters) => void;
  onClose: () => void;
}

export default function AuditFiltersPanel({ filters, onChange, onClose }: Props) {
  const [categories, setCategories] = useState<AuditCategoryDTO[]>([]);
  const [draft, setDraft] = useState<AuditListFilters>(filters);

  useEffect(() => {
    platformAuditApi.listCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const set = (key: keyof AuditListFilters, value: string | undefined) => setDraft((d) => ({ ...d, [key]: value || undefined }));

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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Start Date</label>
          <input type="date" value={draft.startDate || ''} onChange={(e) => set('startDate', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">End Date</label>
          <input type="date" value={draft.endDate || ''} onChange={(e) => set('endDate', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Category / Module</label>
          <select value={draft.category || ''} onChange={(e) => set('category', e.target.value)} className={selectClass}>
            <option value="">Any</option>
            {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Severity</label>
          <select value={draft.severity || ''} onChange={(e) => set('severity', e.target.value)} className={selectClass}>
            <option value="">Any</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Event Type</label>
          <input value={draft.eventType || ''} onChange={(e) => set('eventType', e.target.value)} placeholder="e.g. LOGIN_FAILED" className={inputClass} />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Outcome</label>
          <select value={draft.status || ''} onChange={(e) => set('status', e.target.value)} className={selectClass}>
            <option value="">Any</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Country</label>
          <select value={draft.country || ''} onChange={(e) => set('country', e.target.value)} className={selectClass}>
            <option value="">Any</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Browser</label>
          <select value={draft.browser || ''} onChange={(e) => set('browser', e.target.value)} className={selectClass}>
            <option value="">Any</option>
            {BROWSERS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Operating System</label>
          <select value={draft.os || ''} onChange={(e) => set('os', e.target.value)} className={selectClass}>
            <option value="">Any</option>
            {OS_LIST.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Organization ID</label>
          <input value={draft.organizationId || ''} onChange={(e) => set('organizationId', e.target.value)} placeholder="Paste an organization ID" className={inputClass} />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Correlation ID</label>
          <input value={draft.correlationId || ''} onChange={(e) => set('correlationId', e.target.value)} placeholder="Trace a business operation" className={inputClass} />
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
