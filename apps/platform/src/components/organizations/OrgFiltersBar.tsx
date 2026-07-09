'use client';

import { Search, SlidersHorizontal, X, Table2, LayoutGrid, Rows3 } from 'lucide-react';
import type { OrganizationListFilters } from '@/types/organizations';
import type { PlanDTO } from '@/types/plans';
import OrgSavedViews from './OrgSavedViews';

export type ViewMode = 'table' | 'card' | 'compact';

const selectClass =
  'bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none transition-colors cursor-pointer';

interface Props {
  filters: OrganizationListFilters;
  onChange: (next: OrganizationListFilters) => void;
  plans: PlanDTO[];
  countries: string[];
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
  advancedCount: number;
}

const STATUS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'TRIAL', label: 'Trial' },
  { value: 'GRACE_PERIOD', label: 'Grace Period' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const EXPERIENCE = [
  { value: '', label: 'All Experiences' },
  { value: 'ESSENTIAL', label: 'Essential' },
  { value: 'PROFESSIONAL', label: 'Professional' },
  { value: 'EXPERT', label: 'Expert' },
];

const HEALTH = [
  { value: '', label: 'All Health' },
  { value: 'EXCELLENT', label: 'Excellent' },
  { value: 'GOOD', label: 'Good' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'CRITICAL', label: 'Critical' },
];

export default function OrgFiltersBar({ filters, onChange, plans, countries, viewMode, onViewMode, advancedOpen, onToggleAdvanced, advancedCount }: Props) {
  const set = (patch: Partial<OrganizationListFilters>) => onChange({ ...filters, ...patch, page: 1 });

  const hasBasic = !!(filters.search || filters.derivedStatus || filters.planId || filters.experience || filters.country || filters.health || filters.trial || filters.enterprise);

  const viewBtn = (mode: ViewMode, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => onViewMode(mode)}
      title={label}
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
            placeholder="Search by name, code, owner, email, phone, branch, country..."
            className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <OrgSavedViews filters={filters} onApply={(f) => onChange({ ...f, page: 1 })} />
          <div className="flex items-center gap-0.5 bg-[#0b101d] border border-slate-800/80 rounded-xl p-0.5">
            {viewBtn('table', <Table2 size={14} />, 'Table view')}
            {viewBtn('card', <LayoutGrid size={14} />, 'Card view')}
            {viewBtn('compact', <Rows3 size={14} />, 'Compact view')}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select className={selectClass} value={filters.derivedStatus || ''} onChange={(e) => set({ derivedStatus: e.target.value || undefined })}>
          {STATUS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select className={selectClass} value={filters.planId || ''} onChange={(e) => set({ planId: e.target.value || undefined })}>
          <option value="">All Subscriptions</option>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select className={selectClass} value={filters.experience || ''} onChange={(e) => set({ experience: e.target.value || undefined })}>
          {EXPERIENCE.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select className={selectClass} value={filters.country || ''} onChange={(e) => set({ country: e.target.value || undefined })}>
          <option value="">All Countries</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select className={selectClass} value={filters.health || ''} onChange={(e) => set({ health: e.target.value || undefined })}>
          {HEALTH.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <button
          onClick={() => set({ trial: filters.trial === 'true' ? undefined : 'true' })}
          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${filters.trial === 'true' ? 'bg-sky-500/10 border-sky-500/20 text-sky-300' : 'bg-[#0b101d] border-slate-800/80 text-slate-400 hover:text-slate-300'}`}
        >
          Trial
        </button>

        <button
          onClick={() => set({ enterprise: filters.enterprise === 'true' ? undefined : 'true' })}
          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${filters.enterprise === 'true' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-[#0b101d] border-slate-800/80 text-slate-400 hover:text-slate-300'}`}
        >
          Enterprise
        </button>

        <button
          onClick={onToggleAdvanced}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${advancedOpen || advancedCount > 0 ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-[#0b101d] border-slate-800/80 text-slate-400 hover:text-slate-300'}`}
        >
          <SlidersHorizontal size={13} />
          Advanced{advancedCount > 0 ? ` (${advancedCount})` : ''}
        </button>

        {(hasBasic || advancedCount > 0) && (
          <button
            onClick={() => onChange({ page: 1, limit: filters.limit })}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
