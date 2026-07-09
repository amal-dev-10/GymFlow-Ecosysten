'use client';

import type { RoleListItemDTO } from '@/types/roles';
import { RoleAvatar, RoleKindBadge, RoleStatusBadge } from './RoleBadges';
import RoleRowActions, { RoleRowActionGates } from './RoleRowActions';

interface Props {
  roles: RoleListItemDTO[];
  gates: RoleRowActionGates;
  onRowClick: (role: RoleListItemDTO) => void;
  actions: Omit<React.ComponentProps<typeof RoleRowActions>, 'role' | 'gates'>;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString();
}

export default function RolesTable({ roles, gates, onRowClick, actions }: Props) {
  return (
    <div className="hidden lg:block bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
      <table className="w-full text-left min-w-[1000px]">
        <thead>
          <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3">Users Assigned</th>
            <th className="px-4 py-3">Permissions</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Created By</th>
            <th className="px-4 py-3">Updated At</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((r) => (
            <tr key={r.id} onClick={() => onRowClick(r)} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/30 cursor-pointer transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <RoleAvatar name={r.name} colorTag={r.colorTag} size={32} />
                  <span className="text-xs font-bold text-slate-100 block truncate max-w-[180px]">{r.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-slate-400 max-w-[240px] truncate">{r.description || '—'}</td>
              <td className="px-4 py-3 text-xs font-semibold text-slate-300">{r.usersAssigned}</td>
              <td className="px-4 py-3 text-xs font-semibold text-slate-300">{r.permissionCount}</td>
              <td className="px-4 py-3"><RoleKindBadge isSystem={r.isSystem} /></td>
              <td className="px-4 py-3"><RoleStatusBadge status={r.status} /></td>
              <td className="px-4 py-3 text-xs text-slate-400">{r.createdByName || '—'}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(r.updatedAt)}</td>
              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end">
                  <RoleRowActions role={r} gates={gates} {...actions} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
