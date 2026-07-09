'use client';

import { useEffect, useState } from 'react';
import { GitBranch, Plus, X, Minus } from 'lucide-react';
import { platformRolesApi, handleApiError } from '@/lib/api';
import type { RoleDetailDTO, RoleListItemDTO } from '@/types/roles';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

function AddInheritanceModal({ role, onClose, onAdded, showToast }: { role: RoleDetailDTO; onClose: () => void; onAdded: () => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [roles, setRoles] = useState<RoleListItemDTO[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    platformRolesApi.list({ limit: 100 }).then((res) => setRoles(res.data)).catch(() => setRoles([]));
  }, []);

  const existingIds = new Set(role.inheritsFrom.map((r) => r.id));
  const candidates = roles.filter((r) => r.id !== role.id && !existingIds.has(r.id));

  const add = async (parentId: string) => {
    setBusy(true);
    try {
      await platformRolesApi.addInheritance(role.id, parentId);
      showToast('Inheritance added.');
      onAdded();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold text-white">Inherit From Role</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
        <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin">
          {candidates.map((r) => (
            <button key={r.id} disabled={busy} onClick={() => add(r.id)} className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-850 hover:border-indigo-500/30 transition-colors text-left disabled:opacity-40">
              <span className="text-xs font-bold text-slate-200">{r.name}</span>
              <Plus size={14} className="text-indigo-400 shrink-0" />
            </button>
          ))}
          {candidates.length === 0 && <p className="text-xs text-slate-500 text-center py-6">No other roles available.</p>}
        </div>
      </div>
    </div>
  );
}

export default function RoleInheritedTab({ role, canManage, onChanged, showToast }: { role: RoleDetailDTO; canManage: boolean; onChanged: () => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const remove = async (parentId: string) => {
    setBusyId(parentId);
    try {
      await platformRolesApi.removeInheritance(role.id, parentId);
      showToast('Inheritance removed.');
      onChanged();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Inherits Permissions From</p>
          {canManage && (
            <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-[11px] font-bold rounded-xl transition-colors">
              <Plus size={12} /> Add Inherited Role
            </button>
          )}
        </div>
        {role.inheritsFrom.length === 0 ? (
          <PlatformEmptyState icon={GitBranch} title="No inherited roles" description="This role does not inherit permissions from any other role." />
        ) : (
          <div className="space-y-2">
            {role.inheritsFrom.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0b101d] border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <GitBranch size={14} className="text-indigo-400" />
                  <span className="text-xs font-bold text-slate-200">{r.name}</span>
                </div>
                {canManage && (
                  <button disabled={busyId === r.id} onClick={() => remove(r.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-[11px] font-bold transition-colors disabled:opacity-40">
                    <Minus size={11} /> Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Inherited By (child roles)</p>
        {role.inheritedBy.length === 0 ? (
          <p className="text-xs text-slate-500">No other roles inherit from this one.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {role.inheritedBy.map((r) => (
              <span key={r.id} className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-900 border border-slate-850 px-2.5 py-1 rounded-full">
                <GitBranch size={11} /> {r.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {modalOpen && <AddInheritanceModal role={role} onClose={() => setModalOpen(false)} onAdded={() => { setModalOpen(false); onChanged(); }} showToast={showToast} />}
    </div>
  );
}
