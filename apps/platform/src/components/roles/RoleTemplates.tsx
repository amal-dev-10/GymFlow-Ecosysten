'use client';

import { useEffect, useState } from 'react';
import { FileStack, Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { platformRoleTemplatesApi, handleApiError } from '@/lib/api';
import type { RoleTemplateDTO } from '@/types/roles';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import RoleTemplateModal from './RoleTemplateModal';

export default function RoleTemplates({ canManage, showToast }: { canManage: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [templates, setTemplates] = useState<RoleTemplateDTO[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RoleTemplateDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleTemplateDTO | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    platformRoleTemplatesApi.list().then(setTemplates).catch(() => setTemplates([]));
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await platformRoleTemplatesApi.remove(deleteTarget.id);
      showToast(`Role template "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!templates) return <div className="h-48 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Reusable starting points for the Role Creation Wizard.</p>
        {canManage && (
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors shrink-0">
            <Plus size={14} /> Create Template
          </button>
        )}
      </div>

      {templates.length === 0 ? (
        <PlatformEmptyState icon={FileStack} title="No role templates yet" description="Create a template to speed up creating similar roles in the future." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {templates.map((t) => (
            <div key={t.id} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-100 truncate">{t.name}</span>
                    {t.isSystem && <ShieldCheck size={12} className="text-amber-400 shrink-0" />}
                  </div>
                  <span className="text-[10px] text-slate-600 block mt-0.5">{t.category}</span>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setEditing(t); setModalOpen(true); }} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-colors">
                      <Pencil size={12} />
                    </button>
                    {!t.isSystem && (
                      <button onClick={() => setDeleteTarget(t)} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              {t.description && <p className="text-[11px] text-slate-500 mt-2">{t.description}</p>}
              <div className="mt-3 pt-3 border-t border-slate-900/60 text-[11px] text-slate-500">
                {t.permissionKeys.length} permission{t.permissionKeys.length === 1 ? '' : 's'}{t.groupIds.length > 0 ? ` · ${t.groupIds.length} group${t.groupIds.length === 1 ? '' : 's'}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <RoleTemplateModal
          template={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
          showToast={showToast}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
          <div className="fixed inset-0" onClick={() => setDeleteTarget(null)} />
          <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
            <h3 className="text-base font-extrabold text-white mb-2">Delete Role Template</h3>
            <p className="text-xs text-slate-400 mb-5">Permanently delete <b className="text-slate-200">{deleteTarget.name}</b>?</p>
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
