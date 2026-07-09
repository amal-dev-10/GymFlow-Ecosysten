'use client';

import { useCallback, useEffect, useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { platformGlobalSettingsApi } from '@/lib/api';
import type { SettingsVersionDTO } from '@/types/globalSettings';
import { CATEGORY_LABELS, type SettingsCategory } from '@/types/globalSettings';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const fmt = (iso: string) => new Date(iso).toLocaleString();

export default function VersionHistoryPanel({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [category, setCategory] = useState('');
  const [rows, setRows] = useState<SettingsVersionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    platformGlobalSettingsApi
      .getVersionHistory(category || undefined, 1, 50)
      .then((res) => setRows(res.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  const restore = async (id: string) => {
    setRestoring(true);
    try {
      await platformGlobalSettingsApi.restoreVersion(id);
      showToast('Version restored.');
      setConfirmId(null);
      load();
    } catch {
      showToast('Failed to restore version.', 'error');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-[#0b101d] border border-slate-800/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none cursor-pointer">
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={History} title="No version history yet" description="Every save creates a snapshot here that can be restored." />
      ) : (
        <div className="space-y-2">
          {rows.map((v) => (
            <div key={v.id} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200">{CATEGORY_LABELS[v.category as SettingsCategory] || v.category}</span>
                  <span className="text-[10px] text-slate-600">{fmt(v.createdAt)}</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{v.changeNote || 'Settings updated'} {v.changedByName ? `- ${v.changedByName}` : ''}</p>
              </div>
              {confirmId === v.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button disabled={restoring} onClick={() => restore(v.id)} className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-bold hover:bg-indigo-500/15 disabled:opacity-50">
                    Confirm Restore
                  </button>
                  <button onClick={() => setConfirmId(null)} className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 text-[11px] font-bold hover:border-slate-700">
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmId(v.id)} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-indigo-500/30 text-[11px] font-bold text-slate-300">
                  <RotateCcw size={12} /> Restore
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
