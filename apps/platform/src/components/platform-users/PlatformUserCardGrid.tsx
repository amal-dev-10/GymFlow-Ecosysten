'use client';

import { Mail, Phone, Building2 } from 'lucide-react';
import type { PlatformUserRowDTO } from '@/types/platformUsers';
import { PlatformUserStatusBadge, PlatformRoleBadge, MfaBadge, OnlineDot, PlatformUserAvatar } from './PlatformUserBadges';
import PlatformUserRowActions, { RowActionGates } from './PlatformUserRowActions';

interface Props {
  users: PlatformUserRowDTO[];
  gates: RowActionGates;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onRowClick: (user: PlatformUserRowDTO) => void;
  /** Force single-column, read-only (no row menu) — used on mobile per the "Mobile: Read Only" spec. */
  readOnly?: boolean;
  mobile?: boolean;
  actions: Omit<React.ComponentProps<typeof PlatformUserRowActions>, 'user' | 'gates'>;
}

export default function PlatformUserCardGrid({ users, gates, selected, onToggleSelect, onRowClick, readOnly = false, mobile = false, actions }: Props) {
  return (
    <div className={`grid ${mobile ? 'grid-cols-1 lg:hidden' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'} gap-3`}>
      {users.map((u) => (
        <div key={u.id} onClick={() => onRowClick(u)} className="bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 transition-colors cursor-pointer">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {!readOnly && (
                <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                  <input type="checkbox" checked={selected.has(u.id)} onChange={() => onToggleSelect(u.id)} className="accent-indigo-500 mt-0.5" />
                </div>
              )}
              <PlatformUserAvatar name={u.fullName} />
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-100 block truncate">{u.fullName}</span>
                <OnlineDot online={u.online} />
              </div>
            </div>
            {!readOnly && (
              <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                <PlatformUserRowActions user={u} gates={gates} {...actions} />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <PlatformUserStatusBadge status={u.status} />
            <PlatformRoleBadge role={u.role} />
            <MfaBadge enabled={u.mfaEnabled} />
          </div>

          <div className="mt-3 pt-3 border-t border-slate-900/60 space-y-1.5">
            {u.email && <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate"><Mail size={11} /> {u.email}</div>}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500"><Phone size={11} /> {u.phone}</div>
            {u.department && <div className="flex items-center gap-1.5 text-[11px] text-slate-500"><Building2 size={11} /> {u.department}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
