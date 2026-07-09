'use client';

import { useEffect, useState } from 'react';
import { Boxes, Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { platformPermissionGroupsApi, handleApiError } from '@/lib/api';
import type { PermissionGroupDTO } from '@/types/roles';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import PermissionGroupModal from './PermissionGroupModal';

export default function PermissionGroups({ canManage, showToast }: { canManage: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [groups, setGroups] = useState<PermissionGroupDTO[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PermissionGroupDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PermissionGroupDTO | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    platformPermissionGroupsApi.list().then(setGroups).catch(() => setGroups([]));
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await platformPermissionGroupsApi.remove(deleteTarget.id);
      showToast(`Permission group "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!groups) return <div className="h-48 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Bundle related permissions so they can be assigned to a role in one step.</p>
        {canManage && (
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors shrink-0">
            <Plus size={14} /> Create Group
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <PlatformEmptyState icon={Boxes} title="No permission groups yet" description="Create your first group to bundle permissions for reuse across roles." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {groups.map((g) => (
            <div key={g.id} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-100 truncate">{g.name}</span>
                    {g.isSystem && <ShieldCheck size={12} className="text-amber-400 shrink-0" />}
                  </div>
                  <span className="text-[10px] text-slate-600 block mt-0.5">{g.category}</span>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setEditing(g); setModalOpen(true); }} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-colors">
                      <Pencil size={12} />
                    </button>
                    {!g.isSystem && (
                      <button onClick={() => setDeleteTarget(g)} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              {g.description && <p className="text-[11px] text-slate-500 mt-2">{g.description}</p>}
              <div className="mt-3 pt-3 border-t border-slate-900/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>{g.permissionCount} permission{g.permissionCount === 1 ? '' : 's'}</span>
                <span>{g.rolesUsingGroup} role{g.rolesUsingGroup === 1 ? '' : 's'} using</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <PermissionGroupModal
          group={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
          showToast={showToast}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
          <div className="fixed inset-0" onClick={() => setDeleteTarget(null)} />
          <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
            <h3 className="text-base font-extrabold text-white mb-2">Delete Permission Group</h3>
            <p className="text-xs text-slate-400 mb-5">Permanently delete <b className="text-slate-200">{deleteTarget.name}</b>? Roles using this group will lose the bundled permissions.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
              <button onClick={remove} disabled={busy} className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">{busy ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
