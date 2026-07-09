'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Building2 } from 'lucide-react';
import { platformUsersApi, handleApiError } from '@/lib/api';
import type { PlatformDepartmentDTO, DepartmentBreakdown } from '@/types/platformUsers';

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';

export default function DepartmentManagementModal({
  departments,
  breakdown,
  canManage,
  onClose,
  onChanged,
  showToast,
}: {
  departments: PlatformDepartmentDTO[];
  breakdown: DepartmentBreakdown[];
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
  showToast: (m: string, t?: 'success' | 'error') => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const countFor = (deptName: string) => breakdown.find((b) => b.department === deptName)?.count ?? 0;

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await platformUsersApi.createDepartment(name.trim(), description || undefined);
      showToast(`Department "${name}" created.`);
      setName('');
      setDescription('');
      onChanged();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (dept: PlatformDepartmentDTO) => {
    try {
      await platformUsersApi.deleteDepartment(dept.id);
      showToast(`Department "${dept.name}" deleted.`);
      onChanged();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md overflow-y-auto">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-lg bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10 my-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2"><Building2 size={18} className="text-indigo-400" /> Manage Departments</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>

        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto scrollbar-thin">
          {departments.map((d) => (
            <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-850">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-200">{d.name}</span>
                  {d.isSystem && <span className="text-[9px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded-full">DEFAULT</span>}
                  <span className="text-[10px] text-slate-600">{countFor(d.name)} user(s)</span>
                </div>
                {d.description && <p className="text-[10px] text-slate-500 mt-0.5">{d.description}</p>}
              </div>
              {canManage && !d.isSystem && countFor(d.name) === 0 && (
                <button onClick={() => remove(d)} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>

        {canManage && (
          <div className="pt-4 border-t border-slate-850 space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Add Custom Department</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Data Science" className={inputClass} />
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className={inputClass} />
            <button onClick={create} disabled={busy || !name.trim()} className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
              <Plus size={14} /> Add Department
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
