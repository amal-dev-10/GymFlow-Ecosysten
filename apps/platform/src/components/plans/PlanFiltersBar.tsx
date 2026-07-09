'use client';

import { Search, X } from 'lucide-react';
import type { PlanListFilters } from '@/lib/api';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const BILLING_CYCLE_OPTIONS = [
  { value: '', label: 'All Billing Cycles' },
  { value: 'FREE', label: 'Free' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'HALF_YEARLY', label: 'Half-Yearly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
  { value: 'CUSTOM', label: 'Custom' },
];

const VISIBILITY_OPTIONS = [
  { value: '', label: 'All Visibility' },
  { value: 'PUBLIC', label: 'Public' },
  { value: 'PRIVATE', label: 'Private' },
  { value: 'INTERNAL', label: 'Internal' },
];

const selectClass =
  'bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none transition-colors cursor-pointer';

interface Props {
  filters: PlanListFilters;
  onChange: (filters: PlanListFilters) => void;
}

export default function PlanFiltersBar({ filters, onChange }: Props) {
  const hasActiveFilters = !!(filters.status || filters.visibility || filters.billingCycle || filters.search);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        <input
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search plans by name or code..."
          className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors"
        />
      </div>

      <select className={selectClass} value={filters.status || ''} onChange={(e) => onChange({ ...filters, status: e.target.value || undefined })}>
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        className={selectClass}
        value={filters.billingCycle || ''}
        onChange={(e) => onChange({ ...filters, billingCycle: e.target.value || undefined })}
      >
        {BILLING_CYCLE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        className={selectClass}
        value={filters.visibility || ''}
        onChange={(e) => onChange({ ...filters, visibility: e.target.value || undefined })}
      >
        {VISIBILITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {hasActiveFilters && (
        <button
          onClick={() => onChange({})}
          className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={12} />
          Clear
        </button>
      )}
    </div>
  );
}
