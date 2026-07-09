'use client';

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { NOTIFICATION_STATUSES, NOTIFICATION_TYPES, PRIORITIES } from '@/types/notifications';
import type { NotificationListFilters } from '@/types/notifications';

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';
const selectClass = inputClass + ' cursor-pointer';

const CHANNEL_OPTIONS = [{ value: '', label: 'Any Channel' }, { value: 'in_app', label: 'In-App' }, { value: 'push', label: 'Push' }, { value: 'email', label: 'Email' }, { value: 'sms', label: 'SMS' }, { value: 'whatsapp', label: 'WhatsApp' }];

export default function NotificationFiltersPanel({ filters, onChange, onClose }: { filters: NotificationListFilters; onChange: (f: NotificationListFilters) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<NotificationListFilters>(filters);

  const set = (key: keyof NotificationListFilters, value: string | undefined) => setDraft((d) => ({ ...d, [key]: value || undefined }));
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
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Status</label>
          <select value={draft.status || ''} onChange={(e) => set('status', e.target.value)} className={selectClass}>
            <option value="">Any Status</option>
            {NOTIFICATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Channel</label>
          <select value={draft.channel || ''} onChange={(e) => set('channel', e.target.value)} className={selectClass}>
            {CHANNEL_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Type</label>
          <select value={draft.notificationType || ''} onChange={(e) => set('notificationType', e.target.value)} className={selectClass}>
            <option value="">Any Type</option>
            {NOTIFICATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Priority</label>
          <select value={draft.priority || ''} onChange={(e) => set('priority', e.target.value)} className={selectClass}>
            <option value="">Any Priority</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
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
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-slate-900/60">
        <button onClick={apply} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors">Apply Filters</button>
        <button onClick={clear} className="px-4 py-2 bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-xl transition-colors">Clear All</button>
      </div>
    </div>
  );
}
