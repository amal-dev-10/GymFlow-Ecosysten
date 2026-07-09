'use client';

import { useEffect, useState } from 'react';
import { UserPlus, X, Search, UserMinus } from 'lucide-react';
import { platformRolesApi, platformUsersApi, handleApiError } from '@/lib/api';
import type { RoleDetailDTO } from '@/types/roles';
import type { PlatformUserRowDTO } from '@/types/platformUsers';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import { TemporaryBadge } from '../RoleBadges';
import { Users } from 'lucide-react';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString();
}

function AssignUserModal({ roleId, existingIds, onClose, onAssigned, showToast }: { roleId: string; existingIds: Set<string>; onClose: () => void; onAssigned: () => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [users, setUsers] = useState<PlatformUserRowDTO[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    platformUsersApi.list({ limit: 100 }).then((res) => setUsers(res.data)).catch(() => setUsers([]));
  }, []);

  const filtered = users.filter((u) => !existingIds.has(u.id) && u.fullName.toLowerCase().includes(search.toLowerCase()));

  const assign = async (u: PlatformUserRowDTO) => {
    setBusy(true);
    try {
      await platformRolesApi.assign(roleId, { platformUserId: u.id });
      showToast(`${u.fullName} assigned.`);
      onAssigned();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-md bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold text-white">Assign Users</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none" />
        </div>
        <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin">
          {filtered.map((u) => (
            <button key={u.id} disabled={busy} onClick={() => assign(u)} className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-850 hover:border-indigo-500/30 transition-colors text-left disabled:opacity-40">
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-200 block truncate">{u.fullName}</span>
                <span className="text-[10px] text-slate-500 block truncate">{u.email || u.phone}</span>
              </div>
              <UserPlus size={14} className="text-indigo-400 shrink-0" />
            </button>
          ))}
          {filtered.length === 0 && <p className="text-xs text-slate-500 text-center py-6">No matching users.</p>}
        </div>
      </div>
    </div>
  );
}

export default function RoleUsersTab({ role, canManage, onChanged, showToast }: { role: RoleDetailDTO; canManage: boolean; onChanged: () => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const unassign = async (platformUserId: string, fullName: string) => {
    setBusyId(platformUserId);
    try {
      await platformRolesApi.unassign(role.id, platformUserId);
      showToast(`${fullName} removed from ${role.name}.`);
      onChanged();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">{role.users.length} user{role.users.length === 1 ? '' : 's'} assigned to this role.</p>
        {canManage && (
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors">
            <UserPlus size={14} /> Assign Users
          </button>
        )}
      </div>

      {role.users.length === 0 ? (
        <PlatformEmptyState icon={Users} title="No users assigned" description="Assign platform users to grant them this role's permissions." />
      ) : (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Assigned Date</th>
                <th className="px-4 py-3">Assigned By</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {role.users.map((u) => (
                <tr key={u.assignmentId} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-100">{u.fullName}</span>
                      {u.isTemporary && <TemporaryBadge />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{u.department || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(u.assignedAt)}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{u.assignedByName || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {canManage && (
                      <button disabled={busyId === u.platformUserId} onClick={() => unassign(u.platformUserId, u.fullName)} className="flex items-center gap-1 ml-auto px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-[11px] font-bold transition-colors disabled:opacity-40">
                        <UserMinus size={11} /> Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <AssignUserModal
          roleId={role.id}
          existingIds={new Set(role.users.map((u) => u.platformUserId))}
          onClose={() => setModalOpen(false)}
          onAssigned={() => { setModalOpen(false); onChanged(); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}
