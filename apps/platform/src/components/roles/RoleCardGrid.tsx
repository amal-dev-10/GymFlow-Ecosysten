'use client';

import { Users, KeySquare, User } from 'lucide-react';
import type { RoleListItemDTO } from '@/types/roles';
import { RoleAvatar, RoleKindBadge, RoleStatusBadge } from './RoleBadges';
import RoleRowActions, { RoleRowActionGates } from './RoleRowActions';

interface Props {
  roles: RoleListItemDTO[];
  gates: RoleRowActionGates;
  onRowClick: (role: RoleListItemDTO) => void;
  /** Force single-column, read-only (no row menu) - used on mobile per the "Mobile: Read Only" spec. */
  readOnly?: boolean;
  mobile?: boolean;
  actions: Omit<React.ComponentProps<typeof RoleRowActions>, 'role' | 'gates'>;
}

export default function RoleCardGrid({ roles, gates, onRowClick, readOnly = false, mobile = false, actions }: Props) {
  return (
    <div className={`grid ${mobile ? 'grid-cols-1 lg:hidden' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'} gap-3`}>
      {roles.map((r) => (
        <div key={r.id} onClick={() => onRowClick(r)} className="bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 transition-colors cursor-pointer">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <RoleAvatar name={r.name} colorTag={r.colorTag} />
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-100 block truncate">{r.name}</span>
                {r.description && <span className="text-[10px] text-slate-600 block truncate max-w-[160px]">{r.description}</span>}
              </div>
            </div>
            {!readOnly && (
              <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                <RoleRowActions role={r} gates={gates} {...actions} />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <RoleKindBadge isSystem={r.isSystem} />
            <RoleStatusBadge status={r.status} />
          </div>

          <div className="mt-3 pt-3 border-t border-slate-900/60 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500"><Users size={11} /> {r.usersAssigned} user{r.usersAssigned === 1 ? '' : 's'} assigned</div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500"><KeySquare size={11} /> {r.permissionCount} permission{r.permissionCount === 1 ? '' : 's'}</div>
            {r.createdByName && <div className="flex items-center gap-1.5 text-[11px] text-slate-500"><User size={11} /> {r.createdByName}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
