'use client';

import { useEffect, useState } from 'react';
import { platformRolesApi, platformUsersApi } from '@/lib/api';
import type { RoleListItemDTO, EffectivePermissionDTO } from '@/types/roles';
import type { PlatformUserRowDTO } from '@/types/platformUsers';

const selectClass = 'bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none cursor-pointer';

export default function RoleEvaluationPanel({ onEvaluate }: { onEvaluate: (permissions: EffectivePermissionDTO[], subject: string) => void }) {
  const [mode, setMode] = useState<'role' | 'user'>('role');
  const [roles, setRoles] = useState<RoleListItemDTO[]>([]);
  const [users, setUsers] = useState<PlatformUserRowDTO[]>([]);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    platformRolesApi.list({ limit: 100 }).then((res) => setRoles(res.data)).catch(() => setRoles([]));
    platformUsersApi.list({ limit: 100 }).then((res) => setUsers(res.data)).catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    setSelectedId('');
  }, [mode]);

  useEffect(() => {
    if (!selectedId) {
      onEvaluate([], '');
      return;
    }
    const run = mode === 'role' ? platformRolesApi.getEffectivePermissions(selectedId) : platformRolesApi.getUserEffectivePermissions(selectedId);
    const subject = mode === 'role' ? roles.find((r) => r.id === selectedId)?.name || '' : users.find((u) => u.id === selectedId)?.fullName || '';
    run.then((perms) => onEvaluate(perms, subject)).catch(() => onEvaluate([], subject));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, mode]);

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="flex items-center gap-0.5 bg-[#0b101d] border border-slate-800/80 rounded-xl p-0.5 w-fit">
        <button onClick={() => setMode('role')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${mode === 'role' ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}>By Role</button>
        <button onClick={() => setMode('user')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${mode === 'user' ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}>By User</button>
      </div>
      <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className={selectClass}>
        <option value="">{mode === 'role' ? 'Select a role...' : 'Select a user...'}</option>
        {mode === 'role' ? roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>) : users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
      </select>
    </div>
  );
}
