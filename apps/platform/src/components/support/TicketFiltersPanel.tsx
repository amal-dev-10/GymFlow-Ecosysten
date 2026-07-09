'use client';

import { useEffect, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { platformUsersApi } from '@/lib/api';
import type { TicketListFilters, TicketStatus, TicketPriority } from '@/types/support';
import { PRIORITY_LABELS } from '@/types/support';

export const TICKET_CATEGORIES = [
  'Billing', 'Subscription', 'Members', 'Attendance', 'Training Studio', 'Nutrition', 'Reports',
  'Authentication', 'API', 'Performance', 'Bug Report', 'Feature Request', 'General',
];

const STATUSES: TicketStatus[] = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED', 'CANCELLED'];
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';
const selectClass = inputClass + ' cursor-pointer';

interface Props {
  filters: TicketListFilters;
  onChange: (f: TicketListFilters) => void;
  onClose: () => void;
}

export default function TicketFiltersPanel({ filters, onChange, onClose }: Props) {
  const [engineers, setEngineers] = useState<{ id: string; fullName: string }[]>([]);
  const [draft, setDraft] = useState<TicketListFilters>(filters);

  useEffect(() => {
    platformUsersApi.list({ limit: 100 } as any).then((res: any) => setEngineers(res.data || [])).catch(() => setEngineers([]));
  }, []);

  const set = (key: keyof TicketListFilters, value: string | undefined) => setDraft((d) => ({ ...d, [key]: (value || undefined) as any }));

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
          <SlidersHorizontal size={13} className="text-indigo-400" /> Filters
        </span>
        <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={15} /></button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Status</label>
          <select value={draft.status || ''} onChange={(e) => set('status', e.target.value)} className={selectClass}>
            <option value="">Any</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Priority</label>
          <select value={draft.priority || ''} onChange={(e) => set('priority', e.target.value)} className={selectClass}>
            <option value="">Any</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Category</label>
          <select value={draft.category || ''} onChange={(e) => set('category', e.target.value)} className={selectClass}>
            <option value="">Any</option>
            {TICKET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Assigned To</label>
          <select value={draft.assignedEngineerId || ''} onChange={(e) => set('assignedEngineerId', e.target.value)} className={selectClass}>
            <option value="">Anyone</option>
            {engineers.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">SLA</label>
          <select value={draft.sla || ''} onChange={(e) => set('sla', e.target.value)} className={selectClass}>
            <option value="">Any</option>
            <option value="on_track">On Track</option>
            <option value="at_risk">At Risk</option>
            <option value="breached">Breached</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Start Date</label>
          <input type="date" value={draft.startDate || ''} onChange={(e) => set('startDate', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">End Date</label>
          <input type="date" value={draft.endDate || ''} onChange={(e) => set('endDate', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Organization ID</label>
          <input value={draft.organizationId || ''} onChange={(e) => set('organizationId', e.target.value)} placeholder="Paste an organization ID" className={inputClass} />
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
