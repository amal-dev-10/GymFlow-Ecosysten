'use client';

import { useEffect, useState } from 'react';
import { Crown, Shield, User, MoreHorizontal, Eye, UserX, KeyRound } from 'lucide-react';
import { platformOrganizationsApi, handleApiError } from '@/lib/api';
import type { Org360User } from '@/types/org360';
import { SectionCard, TabLoading, EmptyRow, fmtRelative, fmtDate } from '../shared';

function RolePill({ user }: { user: Org360User }) {
  if (user.isOwner) {
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-amber-300 bg-amber-500/10 border-amber-500/20"><Crown size={10} /> {user.role}</span>;
  }
  const managerish = /manager|admin/i.test(user.role);
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${managerish ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' : 'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}>
      {managerish ? <Shield size={10} /> : <User size={10} />} {user.role}
    </span>
  );
}

function RowMenu({ onAction }: { onAction: (a: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen((v) => !v)} onBlur={() => setTimeout(() => setOpen(false), 150)} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-colors">
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-30 p-1.5 animate-fade-in">
          <button onMouseDown={() => onAction('view')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"><Eye size={14} className="text-indigo-400" /> View User</button>
          <button onMouseDown={() => onAction('reset')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"><KeyRound size={14} className="text-indigo-400" /> Reset Password</button>
          <button onMouseDown={() => onAction('deactivate')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"><UserX size={14} /> Deactivate</button>
        </div>
      )}
    </div>
  );
}

export default function UsersTab({ orgId, showToast }: { orgId: string; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [users, setUsers] = useState<Org360User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    platformOrganizationsApi.getUsers(orgId).then(setUsers).catch((e) => showToast(handleApiError(e), 'error')).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  if (loading) return <TabLoading />;
  if (users.length === 0) return <SectionCard><EmptyRow text="This organization has no users." /></SectionCard>;

  const handle = (u: Org360User, a: string) => {
    if (a === 'view') showToast(`Opening ${u.name}'s profile requires impersonation.`);
    else if (a === 'reset') showToast(`Password reset link queued for ${u.name}.`);
    else showToast(`Deactivating a tenant user is done inside the workspace.`, 'error');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Users', value: users.length },
          { label: 'Active', value: users.filter((u) => u.isActive).length },
          { label: 'Managers', value: users.filter((u) => /manager|admin/i.test(u.role) && !u.isOwner).length },
        ].map((s) => (
          <div key={s.label} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.label}</span>
            <span className="text-xl font-black text-slate-100 block mt-2">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
        <table className="w-full text-left min-w-[720px]">
          <thead>
            <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last Login</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.membershipId} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-xs font-bold text-slate-100">{u.name}</span>
                  <span className="block text-[10px] text-slate-600">{u.email || u.phone}</span>
                </td>
                <td className="px-4 py-3"><RolePill user={u} /></td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${u.isActive ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-slate-500 bg-slate-500/10 border-slate-500/20'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">{fmtRelative(u.lastLogin)}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(u.createdAt)}</td>
                <td className="px-4 py-3 text-right"><RowMenu onAction={(a) => handle(u, a)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
