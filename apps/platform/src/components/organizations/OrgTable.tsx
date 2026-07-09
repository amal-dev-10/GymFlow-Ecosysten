'use client';

import { ArrowUp, ArrowDown } from 'lucide-react';
import type { OrganizationRowDTO } from '@/types/organizations';
import { OrgStatusBadge, ExperienceBadge, HealthDial, OrgLogo, countryFlag, PaymentDot } from './OrgBadges';
import UsageSummary from './UsageSummary';
import OrgRowActions, { OrgActionGates } from './OrgRowActions';

interface Props {
  orgs: OrganizationRowDTO[];
  gates: OrgActionGates;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  sortBy: string;
  sortDir: string;
  onSort: (field: string) => void;
  onRowClick: (org: OrganizationRowDTO) => void;
  actions: Omit<React.ComponentProps<typeof OrgRowActions>, 'org' | 'gates'>;
}

function SortHeader({ label, field, sortBy, sortDir, onSort }: { label: string; field: string; sortBy: string; sortDir: string; onSort: (f: string) => void }) {
  const active = sortBy === field;
  return (
    <button onClick={() => onSort(field)} className={`flex items-center gap-1 hover:text-slate-300 transition-colors ${active ? 'text-indigo-300' : ''}`}>
      {label}
      {active && (sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
    </button>
  );
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString() : '—';
}

function fmtRelative(d: string | null) {
  if (!d) return 'Never';
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function OrgTable({ orgs, gates, selected, onToggleSelect, onToggleSelectAll, sortBy, sortDir, onSort, onRowClick, actions }: Props) {
  const allSelected = orgs.length > 0 && orgs.every((o) => selected.has(o.id));

  return (
    <div className="hidden lg:block bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
      <table className="w-full text-left min-w-[1180px]">
        <thead>
          <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3 w-10">
              <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} className="accent-indigo-500" />
            </th>
            <th className="px-4 py-3"><SortHeader label="Organization" field="name" sortBy={sortBy} sortDir={sortDir} onSort={onSort} /></th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Experience</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3"><SortHeader label="Health" field="health" sortBy={sortBy} sortDir={sortDir} onSort={onSort} /></th>
            <th className="px-4 py-3">Usage</th>
            <th className="px-4 py-3"><SortHeader label="Last Active" field="lastActiveAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} /></th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((org) => (
            <tr
              key={org.id}
              onClick={() => onRowClick(org)}
              className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/30 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={selected.has(org.id)} onChange={() => onToggleSelect(org.id)} className="accent-indigo-500" />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <OrgLogo name={org.name} logoUrl={org.logoUrl} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-100 truncate">{org.name}</span>
                      {org.isEnterprise && <span className="text-[8px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">ENT</span>}
                    </div>
                    <span className="text-[10px] text-slate-600 font-mono">{org.slug}</span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs font-semibold text-slate-300">{org.plan?.name || '—'}</span>
                <div className="mt-0.5"><PaymentDot status={org.paymentStatus} /></div>
              </td>
              <td className="px-4 py-3"><OrgStatusBadge status={org.derivedStatus} /></td>
              <td className="px-4 py-3"><ExperienceBadge experience={org.workspaceExperience} /></td>
              <td className="px-4 py-3">
                {org.owner ? (
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-300 block truncate max-w-[160px]">{org.owner.name}</span>
                    <span className="text-[10px] text-slate-600 block truncate max-w-[160px]">{org.owner.email || org.owner.phone}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-600">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {countryFlag(org.country)} {org.country || '—'}
                </span>
                <span className="block text-[10px] text-slate-600 truncate max-w-[130px]">{org.timezone || ''}</span>
              </td>
              <td className="px-4 py-3"><HealthDial band={org.health.band} score={org.health.score} /></td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <UsageSummary members={org.usage.members} storage={org.usage.storage} branches={org.usage.branches} users={org.usage.users} />
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-slate-400 whitespace-nowrap">{fmtRelative(org.lastActiveAt)}</span>
                <span className="block text-[10px] text-slate-600">Joined {fmtDate(org.createdAt)}</span>
              </td>
              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end">
                  <OrgRowActions org={org} gates={gates} {...actions} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
