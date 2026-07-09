'use client';

import type { OrganizationListFilters } from '@/types/organizations';

const inputClass =
  'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors';
const selectClass = inputClass + ' cursor-pointer';

const PLATFORM_VERSION = 'v0.1.0';

interface Props {
  filters: OrganizationListFilters;
  onChange: (next: OrganizationListFilters) => void;
}

// Advanced filters cover the numeric / operational cuts (member & branch
// counts, subscription state) that don't belong in the always-visible bar.
export default function OrgAdvancedFilters({ filters, onChange }: Props) {
  const set = (patch: Partial<OrganizationListFilters>) => onChange({ ...filters, ...patch, page: 1 });

  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Min Member Count</label>
        <input
          type="number"
          min={0}
          value={filters.minMembers ?? ''}
          onChange={(e) => set({ minMembers: e.target.value === '' ? undefined : Number(e.target.value) })}
          placeholder="Any"
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Min Branch Count</label>
        <input
          type="number"
          min={0}
          value={filters.minBranches ?? ''}
          onChange={(e) => set({ minBranches: e.target.value === '' ? undefined : Number(e.target.value) })}
          placeholder="Any"
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Subscription State</label>
        <select className={selectClass} value={filters.subscriptionStatus || ''} onChange={(e) => set({ subscriptionStatus: e.target.value || undefined })}>
          <option value="">Any</option>
          <option value="Active">Active</option>
          <option value="Trialing">Trialing</option>
          <option value="Past_Due">Past Due</option>
          <option value="Canceled">Canceled</option>
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Platform Version</label>
        <select className={selectClass} defaultValue={PLATFORM_VERSION} disabled>
          <option value={PLATFORM_VERSION}>{PLATFORM_VERSION} (all orgs)</option>
        </select>
      </div>
    </div>
  );
}
