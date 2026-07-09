'use client';

import { useEffect, useState } from 'react';
import { Download, Plus, X, FileDown } from 'lucide-react';
import { platformAuditApi, handleApiError } from '@/lib/api';
import type { AuditExportJobDTO } from '@/types/audit';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import { exportAuditLogsCsv, exportAuditLogsExcel, exportAuditLogsJson, exportAuditLogsPdf } from '@/lib/auditExport';

const FORMAT_ICON_TONE: Record<string, string> = {
  CSV: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  EXCEL: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  PDF: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
  JSON: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
};

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString();
}

function NewExportModal({ onClose, onExported, showToast }: { onClose: () => void; onExported: () => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [format, setFormat] = useState<'CSV' | 'EXCEL' | 'PDF' | 'JSON'>('CSV');
  const [scope, setScope] = useState(100);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const res = await platformAuditApi.list({ limit: scope, sortDir: 'desc' });
      if (res.data.length === 0) {
        showToast('No events to export.', 'error');
        return;
      }
      if (format === 'CSV') exportAuditLogsCsv(res.data);
      else if (format === 'EXCEL') exportAuditLogsExcel(res.data);
      else if (format === 'JSON') exportAuditLogsJson(res.data);
      else exportAuditLogsPdf(res.data);
      await platformAuditApi.recordExport({ format, rowCount: res.data.length });
      showToast(`Exported ${res.data.length} event(s) as ${format}.`);
      onExported();
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
          <h3 className="text-base font-extrabold text-white">New Export</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>

        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Format</label>
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {(['CSV', 'EXCEL', 'PDF', 'JSON'] as const).map((f) => (
            <button key={f} onClick={() => setFormat(f)} className={`py-2 rounded-xl text-[11px] font-bold border transition-colors ${format === f ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-slate-900/40 border-slate-850 text-slate-400 hover:border-slate-700'}`}>
              {f}
            </button>
          ))}
        </div>

        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Scope</label>
        <select value={scope} onChange={(e) => setScope(Number(e.target.value))} className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none cursor-pointer mb-5">
          <option value={100}>Most recent 100 events</option>
          <option value={500}>Most recent 500 events</option>
          <option value={1000}>Most recent 1,000 events</option>
        </select>

        <button onClick={run} disabled={busy} className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
          <FileDown size={14} /> {busy ? 'Exporting...' : 'Export'}
        </button>
      </div>
    </div>
  );
}

export default function ExportsSection({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [jobs, setJobs] = useState<AuditExportJobDTO[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = () => {
    platformAuditApi.listExportJobs().then(setJobs).catch(() => setJobs([]));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Every export is itself recorded as an audited action.</p>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors">
          <Plus size={14} /> New Export
        </button>
      </div>

      {!jobs ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : jobs.length === 0 ? (
        <PlatformEmptyState icon={Download} title="No exports yet" description="Exports you generate from the Audit Log Explorer or here will be listed for reference." />
      ) : (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3">Rows</th>
                <th className="px-4 py-3">Requested By</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/20">
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${FORMAT_ICON_TONE[j.format]}`}>{j.format}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-300">{j.rowCount}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{j.requestedByName || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDateTime(j.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && <NewExportModal onClose={() => setModalOpen(false)} onExported={() => { setModalOpen(false); load(); }} showToast={showToast} />}
    </div>
  );
}
