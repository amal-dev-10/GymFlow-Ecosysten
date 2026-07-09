'use client';

import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { platformGlobalSettingsApi } from '@/lib/api';

export default function ImportExportPanel({ showToast, canImport }: { showToast: (m: string, t?: 'success' | 'error') => void; canImport: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    try {
      const settings = await platformGlobalSettingsApi.exportAll();
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gymflow-global-settings-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Settings exported.');
    } catch {
      showToast('Failed to export settings.', 'error');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        throw new Error('File must contain a JSON object keyed by settings category.');
      }
      const result = await platformGlobalSettingsApi.importAll(parsed);
      const applied = result.results.filter((r) => r.applied).length;
      const skipped = result.results.filter((r) => !r.applied);
      showToast(`Imported ${applied} of ${result.results.length} categorie(s).${skipped.length ? ` Skipped: ${skipped.map((s) => s.category).join(', ')}.` : ''}`, skipped.length ? 'error' : 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to import settings.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors">
        <Download size={13} /> Export Settings
      </button>
      {canImport && (
        <>
          <button
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50"
          >
            <Upload size={13} /> {busy ? 'Importing...' : 'Import Settings'}
          </button>
          <input ref={inputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
        </>
      )}
    </div>
  );
}
