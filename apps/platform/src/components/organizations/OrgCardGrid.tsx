'use client';

import { Mail, Phone } from 'lucide-react';
import type { OrganizationRowDTO } from '@/types/organizations';
import { OrgStatusBadge, ExperienceBadge, HealthBadge, HealthDial, OrgLogo, countryFlag, PaymentDot } from './OrgBadges';
import UsageSummary from './UsageSummary';
import OrgRowActions, { OrgActionGates } from './OrgRowActions';

interface Props {
  orgs: OrganizationRowDTO[];
  gates: OrgActionGates;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onRowClick: (org: OrganizationRowDTO) => void;
  compact?: boolean;
  /** Force single-column on mobile regardless of the compact setting. */
  mobile?: boolean;
  actions: Omit<React.ComponentProps<typeof OrgRowActions>, 'org' | 'gates'>;
}

export default function OrgCardGrid({ orgs, gates, selected, onToggleSelect, onRowClick, compact = false, mobile = false, actions }: Props) {
  const gridCols = mobile
    ? 'grid-cols-1'
    : compact
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3';

  return (
    <div className={`grid ${gridCols} gap-3 ${mobile ? 'lg:hidden' : ''}`}>
      {orgs.map((org) => (
        <div
          key={org.id}
          onClick={() => onRowClick(org)}
          className="group bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 transition-colors cursor-pointer relative"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                <input type="checkbox" checked={selected.has(org.id)} onChange={() => onToggleSelect(org.id)} className="accent-indigo-500 mt-0.5" />
              </div>
              <OrgLogo name={org.name} logoUrl={org.logoUrl} size={compact ? 32 : 40} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-100 truncate">{org.name}</span>
                  {org.isEnterprise && <span className="text-[8px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full shrink-0">ENT</span>}
                </div>
                <span className="text-[10px] text-slate-600 font-mono block truncate">{org.slug}</span>
              </div>
            </div>
            <div onClick={(e) => e.stopPropagation()} className="shrink-0">
              <OrgRowActions org={org} gates={gates} {...actions} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <OrgStatusBadge status={org.derivedStatus} />
            <ExperienceBadge experience={org.workspaceExperience} />
            {!compact && <HealthBadge band={org.health.band} score={org.health.score} />}
            <PaymentDot status={org.paymentStatus} />
          </div>

          {!compact && (
            <>
              <div className="flex items-center justify-between mt-3 text-[11px]">
                <span className="text-slate-400">{org.plan?.name || 'No plan'}</span>
                <span className="text-slate-500 whitespace-nowrap">{countryFlag(org.country)} {org.country || '—'}</span>
              </div>

              {org.owner && (
                <div className="mt-3 pt-3 border-t border-slate-900/60 space-y-1">
                  <span className="text-xs font-semibold text-slate-300 block truncate">{org.owner.name}</span>
                  <div className="flex items-center gap-3 text-[10px] text-slate-600">
                    {org.owner.email && <span className="flex items-center gap-1 truncate"><Mail size={10} /> {org.owner.email}</span>}
                    {org.owner.phone && <span className="flex items-center gap-1"><Phone size={10} /> {org.owner.phone}</span>}
                  </div>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-slate-900/60">
                <UsageSummary members={org.usage.members} storage={org.usage.storage} branches={org.usage.branches} users={org.usage.users} />
              </div>
            </>
          )}

          {compact && (
            <div className="flex items-center justify-between mt-3 text-[11px]">
              <span className="text-slate-500 truncate">{org.plan?.name || 'No plan'}</span>
              <HealthDial band={org.health.band} score={org.health.score} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
