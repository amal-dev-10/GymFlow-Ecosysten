'use client';

import { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import { platformPermissionGroupsApi, platformPermissionsApi, handleApiError } from '@/lib/api';
import type { PermissionGroupDTO, PermissionTreeCategoryDTO } from '@/types/roles';

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';
const CATEGORY_OPTIONS = ['Organization Management', 'Commercial', 'Platform Operations', 'Security', 'Infrastructure', 'Support', 'Developer', 'Analytics'];

export default function PermissionGroupModal({
  group,
  onClose,
  onSaved,
  showToast,
}: {
  group: PermissionGroupDTO | null;
  onClose: () => void;
  onSaved: () => void;
  showToast: (m: string, t?: 'success' | 'error') => void;
}) {
  const [name, setName] = useState(group?.name || '');
  const [description, setDescription] = useState(group?.description || '');
  const [category, setCategory] = useState(group?.category || CATEGORY_OPTIONS[0]);
  const [tree, setTree] = useState<PermissionTreeCategoryDTO[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(group?.permissions.map((p) => p.key) || []));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    platformPermissionsApi.tree().then(setTree).catch(() => setTree([]));
  }, []);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const payload = { name: name.trim(), description: description || undefined, category, permissionKeys: Array.from(selected) };
      if (group) await platformPermissionGroupsApi.update(group.id, payload);
      else await platformPermissionGroupsApi.create(payload);
      showToast(`Permission group "${name}" saved.`);
      onSaved();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md overflow-y-auto">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-lg bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10 my-8 max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-base font-extrabold text-white">{group ? 'Edit Permission Group' : 'Create Permission Group'}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>

        <div className="space-y-3 overflow-y-auto flex-1 scrollbar-thin pr-1">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Organization Management" className={inputClass} disabled={group?.isSystem} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this group for?" className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputClass} cursor-pointer`}>
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Permissions ({selected.size} selected)</label>
            <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-thin">
              {tree.map((cat) => (
                <div key={cat.key}>
                  <p className="text-[10px] font-bold text-slate-500 mb-1">{cat.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.permissions.map((p) => (
                      <button
                        key={p.key}
                        onClick={() => toggle(p.key)}
                        className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border transition-colors ${
                          selected.has(p.key) ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' : 'text-slate-500 bg-slate-900 border-slate-850 hover:border-slate-700'
                        }`}
                      >
                        {selected.has(p.key) && <Check size={10} />}
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 mt-2 border-t border-slate-850 shrink-0">
          <button onClick={save} disabled={busy || !name.trim()} className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
            {busy ? 'Saving...' : 'Save Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
