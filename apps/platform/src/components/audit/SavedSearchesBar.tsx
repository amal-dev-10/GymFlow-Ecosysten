'use client';

import { useEffect, useState } from 'react';
import { Bookmark, Plus, X, Trash2 } from 'lucide-react';
import { platformAuditApi, handleApiError } from '@/lib/api';
import type { AuditSavedSearchDTO, AuditListFilters } from '@/types/audit';

function SaveSearchModal({ filters, onClose, onSaved, showToast }: { filters: AuditListFilters; onClose: () => void; onSaved: () => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { page, limit, ...rest } = filters;
      await platformAuditApi.createSavedSearch({ name: name.trim(), filters: rest });
      showToast(`Saved search "${name}" created.`);
      onSaved();
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
          <h3 className="text-base font-extrabold text-white">Save Current Search</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekly Compliance Review" className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none mb-5" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
          <button onClick={save} disabled={busy || !name.trim()} className="flex-1 py-3 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">{busy ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

export default function SavedSearchesBar({ currentFilters, onApply, showToast }: { currentFilters: AuditListFilters; onApply: (filters: AuditListFilters) => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [searches, setSearches] = useState<AuditSavedSearchDTO[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const load = () => {
    platformAuditApi.listSavedSearches().then(setSearches).catch(() => setSearches([]));
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string, name: string) => {
    try {
      await platformAuditApi.removeSavedSearch(id);
      showToast(`Removed "${name}".`);
      load();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">
        <Bookmark size={11} /> Saved Searches
      </span>
      {searches.map((s) => (
        <span key={s.id} className="group inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-900 border border-slate-850 hover:border-indigo-500/30 hover:text-indigo-300 px-2.5 py-1 rounded-full transition-colors">
          <button onClick={() => onApply(s.filters)}>{s.name}</button>
          {!s.isSystem && (
            <button onClick={() => remove(s.id, s.name)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-rose-400">
              <Trash2 size={10} />
            </button>
          )}
        </span>
      ))}
      <button onClick={() => setModalOpen(true)} className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 px-2 py-1 transition-colors">
        <Plus size={11} /> Save Current
      </button>

      {modalOpen && (
        <SaveSearchModal filters={currentFilters} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load(); }} showToast={showToast} />
      )}
    </div>
  );
}
