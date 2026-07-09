'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, ScrollText, FileText } from 'lucide-react';
import { platformAutomationApi } from '@/lib/api';
import type { AutomationJobRunDTO, ListRunsFilters } from '@/types/automation';
import { RunStatusBadge } from './JobBadges';
import RunLogModal from './RunLogModal';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '-');
const fmtDuration = (ms: number | null) => (ms == null ? '-' : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);

export default function ExecutionHistorySection({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<AutomationJobRunDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<AutomationJobRunDTO | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const filters: ListRunsFilters = { page, limit: 25, search: search || undefined, status: status || undefined };
    platformAutomationApi
      .listExecutionHistory(filters)
      .then((res) => { setRows(res.data); setTotal(res.total); setTotalPages(res.totalPages); })
      .catch(() => showToast('Failed to load execution history.', 'error'))
      .finally(() => setLoading(false));
  }, [page, search, status, showToast]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by job name..." className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-[#0b101d] border border-slate-800/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none cursor-pointer">
          <option value="">All Statuses</option>
          {['Queued', 'Running', 'Completed', 'Failed'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={ScrollText} title="No execution history found" description="Try adjusting search or filters." />
      ) : (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Logs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((run) => (
                <tr key={run.id} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-slate-200">{run.job?.name || '-'}</span>
                    <span className="block text-[10px] text-slate-600 mt-0.5">{run.triggeredBy}</span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{fmt(run.startedAt)}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{fmt(run.completedAt)}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{fmtDuration(run.durationMs)}</td>
                  <td className="px-4 py-3"><RunStatusBadge status={run.status} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => setViewing(run)} className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 hover:text-indigo-200">
                      <FileText size={11} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>{total} run(s)</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border border-slate-800 disabled:opacity-30 hover:border-indigo-500/30">Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border border-slate-800 disabled:opacity-30 hover:border-indigo-500/30">Next</button>
          </div>
        </div>
      )}

      {viewing && <RunLogModal run={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
