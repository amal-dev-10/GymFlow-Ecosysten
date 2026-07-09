'use client';

import type { PlatformUserRowDTO } from '@/types/platformUsers';
import { PlatformUserStatusBadge, PlatformRoleBadge, MfaBadge, OnlineDot, PlatformUserAvatar } from './PlatformUserBadges';
import PlatformUserRowActions, { RowActionGates } from './PlatformUserRowActions';

interface Props {
  users: PlatformUserRowDTO[];
  gates: RowActionGates;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onRowClick: (user: PlatformUserRowDTO) => void;
  actions: Omit<React.ComponentProps<typeof PlatformUserRowActions>, 'user' | 'gates'>;
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString() : '—';
}

function fmtRelative(d: string | null) {
  if (!d) return 'Never';
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days <= 0) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours <= 0) return 'Just now';
    return `${hours}h ago`;
  }
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function PlatformUserTable({ users, gates, selected, onToggleSelect, onToggleSelectAll, onRowClick, actions }: Props) {
  const allSelected = users.length > 0 && users.every((u) => selected.has(u.id));

  return (
    <div className="hidden lg:block bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
      <table className="w-full text-left min-w-[1100px]">
        <thead>
          <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3 w-10">
              <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} className="accent-indigo-500" />
            </th>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">MFA</th>
            <th className="px-4 py-3">Last Login</th>
            <th className="px-4 py-3">Last Activity</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} onClick={() => onRowClick(u)} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/30 cursor-pointer transition-colors">
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={selected.has(u.id)} onChange={() => onToggleSelect(u.id)} className="accent-indigo-500" />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <PlatformUserAvatar name={u.fullName} size={32} />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-100 block truncate max-w-[160px]">{u.fullName}</span>
                    <span className="text-[10px] text-slate-600 block truncate max-w-[160px]">{u.email || u.phone}</span>
                    <OnlineDot online={u.online} />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-slate-400">{u.department || '—'}</td>
              <td className="px-4 py-3"><PlatformRoleBadge role={u.role} /></td>
              <td className="px-4 py-3"><PlatformUserStatusBadge status={u.status} /></td>
              <td className="px-4 py-3"><MfaBadge enabled={u.mfaEnabled} /></td>
              <td className="px-4 py-3 text-xs text-slate-400">{fmtRelative(u.lastLoginAt)}</td>
              <td className="px-4 py-3 text-xs text-slate-400">{fmtRelative(u.lastActivityAt)}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(u.createdAt)}</td>
              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end">
                  <PlatformUserRowActions user={u} gates={gates} {...actions} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
