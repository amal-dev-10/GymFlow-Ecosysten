'use client';

import { useState } from 'react';
import { Pencil, Check, X, ShieldCheck, KeySquare, Boxes } from 'lucide-react';
import { platformRolesApi, handleApiError } from '@/lib/api';
import type { RoleDetailDTO } from '@/types/roles';
import { RoleAvatar, RoleKindBadge, RoleStatusBadge } from '../RoleBadges';

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString();
}

export default function RoleInfoTab({ role, canManage, onChanged, showToast }: { role: RoleDetailDTO; canManage: boolean; onChanged: () => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await platformRolesApi.update(role.id, { name, description });
      showToast('Role information updated.');
      setEditing(false);
      onChanged();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <RoleAvatar name={role.name} colorTag={role.colorTag} size={48} />
            <div>
              {editing ? (
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              ) : (
                <h2 className="text-lg font-bold text-slate-100">{role.name}</h2>
              )}
              <div className="flex items-center gap-1.5 mt-1.5">
                <RoleKindBadge isSystem={role.isSystem} />
                <RoleStatusBadge status={role.status} />
              </div>
            </div>
          </div>
          {canManage && !role.isSystem && (
            editing ? (
              <div className="flex items-center gap-1.5">
                <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"><X size={13} /></button>
                <button onClick={save} disabled={busy} className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/15"><Check size={13} /></button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-colors"><Pencil size={13} /></button>
            )
          )}
        </div>

        {editing ? (
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} placeholder="Description" />
        ) : (
          <p className="text-xs text-slate-400">{role.description || 'No description.'}</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-900/60">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Created By</span>
            <span className="text-xs font-semibold text-slate-300">{role.createdByName || '—'}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Created</span>
            <span className="text-xs font-semibold text-slate-300">{fmtDateTime(role.createdAt)}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Updated</span>
            <span className="text-xs font-semibold text-slate-300">{fmtDateTime(role.updatedAt)}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Effective Permissions</span>
            <span className="text-xs font-semibold text-slate-300">{role.effectivePermissionCount}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400"><KeySquare size={16} /></div>
          <div>
            <span className="text-lg font-black text-slate-100 block">{role.permissions.filter((p) => p.effect === 'ALLOW').length}</span>
            <span className="text-[10px] text-slate-500">Direct Permissions</span>
          </div>
        </div>
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400"><Boxes size={16} /></div>
          <div>
            <span className="text-lg font-black text-slate-100 block">{role.permissionGroups.length}</span>
            <span className="text-[10px] text-slate-500">Permission Groups</span>
          </div>
        </div>
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400"><ShieldCheck size={16} /></div>
          <div>
            <span className="text-lg font-black text-slate-100 block">{role.users.length}</span>
            <span className="text-[10px] text-slate-500">Users Assigned</span>
          </div>
        </div>
      </div>

      {role.permissionGroups.length > 0 && (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Assigned Permission Groups</p>
          <div className="flex flex-wrap gap-1.5">
            {role.permissionGroups.map((g) => (
              <span key={g.id} className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${g.effect === 'DENY' ? 'text-rose-300 bg-rose-500/10 border-rose-500/20' : 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20'}`}>{g.name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
