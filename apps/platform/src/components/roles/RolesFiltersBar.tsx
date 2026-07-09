'use client';

import { Search, LayoutGrid, List } from 'lucide-react';
import type { RoleListFilters } from '@/types/roles';

export type ViewMode = 'table' | 'card';

interface Props {
  filters: RoleListFilters;
  onChange: (f: RoleListFilters) => void;
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
}

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors';
const selectClass = 'bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none transition-colors cursor-pointer';

export default function RolesFiltersBar({ filters, onChange, viewMode, onViewMode }: Props) {
  const hasFilters = !!(filters.search || filters.status || filters.kind);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value, page: 1 })}
            placeholder="Search roles by name or description..."
            className={inputClass}
          />
        </div>
        <select value={filters.kind || ''} onChange={(e) => onChange({ ...filters, kind: (e.target.value || undefined) as RoleListFilters['kind'], page: 1 })} className={selectClass}>
          <option value="">All Roles</option>
          <option value="system">System Only</option>
          <option value="custom">Custom Only</option>
        </select>
        <select value={filters.status || ''} onChange={(e) => onChange({ ...filters, status: (e.target.value || undefined) as RoleListFilters['status'], page: 1 })} className={selectClass}>
          <option value="">Any Status</option>
          <option value="Active">Active</option>
          <option value="Archived">Archived</option>
        </select>
        <div className="flex items-center gap-0.5 bg-[#0b101d] border border-slate-800/80 rounded-xl p-0.5">
          <button onClick={() => onViewMode('table')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`} title="Table view">
            <List size={14} />
          </button>
          <button onClick={() => onViewMode('card')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'card' ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`} title="Card view">
            <LayoutGrid size={14} />
          </button>
        </div>
        {hasFilters && (
          <button onClick={() => onChange({ page: 1, limit: filters.limit })} className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors px-2">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
