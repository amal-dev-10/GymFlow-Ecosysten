'use client';

import { Search, X, Table2, LayoutGrid } from 'lucide-react';
import type { PlatformUserListFilters } from '@/types/platformUsers';
import type { PlatformDepartmentDTO } from '@/types/platformUsers';
import { ROLE_OPTIONS } from './PlatformUserBadges';

export type ViewMode = 'table' | 'card';

const selectClass = 'bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none transition-colors cursor-pointer';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING_INVITATION', label: 'Pending Invitation' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'LOCKED', label: 'Locked' },
  { value: 'ARCHIVED', label: 'Archived' },
];

interface Props {
  filters: PlatformUserListFilters;
  onChange: (next: PlatformUserListFilters) => void;
  departments: PlatformDepartmentDTO[];
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
}

export default function PlatformUserFiltersBar({ filters, onChange, departments, viewMode, onViewMode }: Props) {
  const set = (patch: Partial<PlatformUserListFilters>) => onChange({ ...filters, ...patch, page: 1 });
  const hasActive = !!(filters.search || filters.department || filters.role || filters.status || filters.mfaEnabled || filters.online);

  const viewBtn = (mode: ViewMode, icon: React.ReactNode) => (
    <button
      onClick={() => onViewMode(mode)}
      className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${viewMode === mode ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
    >
      {icon}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={filters.search || ''}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search by name, email, phone, department, role..."
            className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-0.5 bg-[#0b101d] border border-slate-800/80 rounded-xl p-0.5">
          {viewBtn('table', <Table2 size={14} />)}
          {viewBtn('card', <LayoutGrid size={14} />)}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select className={selectClass} value={filters.department || ''} onChange={(e) => set({ department: e.target.value || undefined })}>
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>

        <select className={selectClass} value={filters.role || ''} onChange={(e) => set({ role: e.target.value || undefined })}>
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>

        <select className={selectClass} value={filters.status || ''} onChange={(e) => set({ status: e.target.value || undefined })}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <button
          onClick={() => set({ mfaEnabled: filters.mfaEnabled === 'true' ? undefined : 'true' })}
          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${filters.mfaEnabled === 'true' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-[#0b101d] border-slate-800/80 text-slate-400 hover:text-slate-300'}`}
        >
          MFA Enabled
        </button>

        <button
          onClick={() => set({ online: filters.online === 'true' ? undefined : 'true' })}
          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${filters.online === 'true' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-[#0b101d] border-slate-800/80 text-slate-400 hover:text-slate-300'}`}
        >
          Online Now
        </button>

        {hasActive && (
          <button onClick={() => onChange({ page: 1, limit: filters.limit })} className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors">
            <X size={12} /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
