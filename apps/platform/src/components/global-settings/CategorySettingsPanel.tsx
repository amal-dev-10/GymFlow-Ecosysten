'use client';

import { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Save, AlertTriangle } from 'lucide-react';
import { platformGlobalSettingsApi } from '@/lib/api';
import type { CategoryValues, SettingsCategory } from '@/types/globalSettings';
import { CATEGORY_LABELS } from '@/types/globalSettings';

interface Props {
  category: SettingsCategory;
  canEdit: boolean;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onSaved?: () => void;
  children: (values: CategoryValues, setValue: (key: string, value: any) => void, canEdit: boolean) => React.ReactNode;
}

// Shared load/dirty-tracking/save/reset shell for every one of the 10
// settings category forms - each form only supplies its field layout via
// `children`, this component owns fetching, the unsaved-changes bar, Save,
// and Reset to Defaults so that logic exists exactly once.
export default function CategorySettingsPanel({ category, canEdit, showToast, onSaved, children }: Props) {
  const [original, setOriginal] = useState<CategoryValues | null>(null);
  const [draft, setDraft] = useState<CategoryValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    platformGlobalSettingsApi
      .getCategory(category)
      .then((values) => {
        setOriginal(values);
        setDraft(values);
      })
      .catch(() => showToast('Failed to load settings.', 'error'))
      .finally(() => setLoading(false));
  }, [category, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = original && draft && JSON.stringify(original) !== JSON.stringify(draft);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const setValue = (key: string, value: any) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  const discard = () => setDraft(original);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const changedKeys = Object.keys(draft).filter((k) => JSON.stringify(draft[k]) !== JSON.stringify(original?.[k]));
      // Only send the fields that actually changed, not the whole draft -
      // keeps the backend's own "Changed N setting(s)" audit message honest
      // rather than counting every known key in the category.
      const changedValues = Object.fromEntries(changedKeys.map((k) => [k, draft[k]]));
      const result = await platformGlobalSettingsApi.updateCategory(category, changedValues, `Updated ${changedKeys.length} field(s)`);
      setOriginal(result);
      setDraft(result);
      showToast(`${CATEGORY_LABELS[category]} settings saved.`);
      onSaved?.();
    } catch {
      showToast('Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const restoreDefaults = async () => {
    setSaving(true);
    try {
      const result = await platformGlobalSettingsApi.restoreDefaults(category);
      setOriginal(result);
      setDraft(result);
      setConfirmReset(false);
      showToast(`${CATEGORY_LABELS[category]} settings reset to defaults.`);
      onSaved?.();
    } catch {
      showToast('Failed to reset settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !draft) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-16">
      <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-5 space-y-4">
        {!canEdit && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-500">
            <AlertTriangle size={12} /> You have read-only access to {CATEGORY_LABELS[category]} settings.
          </div>
        )}
        {children(draft, setValue, canEdit)}
      </div>

      {canEdit && (
        <div className="flex items-center justify-between">
          {confirmReset ? (
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Reset all {CATEGORY_LABELS[category]} settings to their defaults?</span>
              <button onClick={restoreDefaults} disabled={saving} className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 font-bold hover:bg-rose-500/15 disabled:opacity-50">
                Confirm Reset
              </button>
              <button onClick={() => setConfirmReset(false)} className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:border-slate-700">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmReset(true)} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-300">
              <RotateCcw size={12} /> Restore Defaults
            </button>
          )}
        </div>
      )}

      {dirty && canEdit && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none px-4 pb-4">
          <div className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-[#0b101d] border border-indigo-500/30 rounded-2xl shadow-2xl">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-200">You have unsaved changes in {CATEGORY_LABELS[category]}.</span>
            <button onClick={discard} disabled={saving} className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 text-xs font-bold hover:border-slate-700 disabled:opacity-50">
              Discard
            </button>
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold hover:bg-indigo-500/25 disabled:opacity-50">
              <Save size={12} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
