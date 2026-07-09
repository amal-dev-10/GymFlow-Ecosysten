'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Plus, ListChecks, SlidersHorizontal, Play, Pause, Ban, Pencil } from 'lucide-react';
import { platformAutomationApi } from '@/lib/api';
import type { AutomationJobDTO, AutomationQueueDTO, ListJobsFilters } from '@/types/automation';
import { JobStatusBadge, ScheduleBadge } from './JobBadges';
import JobFiltersPanel from './JobFiltersPanel';
import JobEditorModal from './JobEditorModal';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '-');
const fmtDuration = (ms: number | null) => (ms == null ? '-' : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);

export default function JobList({ mode = 'all', canManage, canRun, showToast }: { mode?: 'all' | 'workflows'; canManage: boolean; canRun: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [search, setSearch] = useState('');
  const [advanced, setAdvanced] = useState<ListJobsFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rows, setRows] = useState<AutomationJobDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [queues, setQueues] = useState<AutomationQueueDTO[]>([]);
  const [editing, setEditing] = useState<AutomationJobDTO | null | undefined>(undefined);

  useEffect(() => {
    platformAutomationApi.listQueues().then(setQueues).catch(() => setQueues([]));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const filters: ListJobsFilters = { ...advanced, page, limit: 25, search: search || undefined };
    const call = mode === 'workflows' ? platformAutomationApi.listWorkflows() : platformAutomationApi.listJobs(filters);
    call
      .then((res) => { setRows(res.data); setTotal(res.total); setTotalPages(res.totalPages); })
      .catch(() => showToast('Failed to load jobs.', 'error'))
      .finally(() => setLoading(false));
  }, [mode, page, search, advanced, showToast]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  const runAction = async (action: () => Promise<any>, successMsg: string) => {
    try {
      await action();
      showToast(successMsg);
      load();
    } catch {
      showToast('Action failed.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={mode === 'workflows' ? 'Search workflows...' : 'Search jobs...'} className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none" />
        </div>
        {mode === 'all' && (
          <button onClick={() => setFiltersOpen((v) => !v)} className="flex items-center gap-1.5 px-3 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors">
            <SlidersHorizontal size={13} /> Filters
          </button>
        )}
        {canManage && (
          <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 rounded-xl text-xs font-bold text-indigo-300 transition-colors">
            <Plus size={13} /> {mode === 'workflows' ? 'Create Workflow' : 'Create Job'}
          </button>
        )}
      </div>

      {filtersOpen && mode === 'all' && <JobFiltersPanel filters={advanced} onChange={(f) => { setAdvanced(f); setPage(1); setFiltersOpen(false); }} onClose={() => setFiltersOpen(false)} />}

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={ListChecks} title={mode === 'workflows' ? 'No workflows found' : 'No jobs found'} description="Try adjusting search or filters, or create a new one." />
      ) : (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Job Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Run</th>
                <th className="px-4 py-3">Next Run</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((job) => (
                <tr key={job.id} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-slate-200">{job.name}</span>
                    {job.workflowType && <span className="block text-[10px] text-indigo-400 mt-0.5">{job.workflowType}</span>}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{job.category}</td>
                  <td className="px-4 py-3"><ScheduleBadge scheduleType={job.scheduleType} /></td>
                  <td className="px-4 py-3"><JobStatusBadge status={job.status} /></td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">
                    {fmt(job.lastRunAt)}
                    {job.lastRunStatus && <span className={`block text-[10px] mt-0.5 ${job.lastRunStatus === 'Failed' ? 'text-rose-400' : 'text-emerald-400'}`}>{job.lastRunStatus}</span>}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{fmt(job.nextRunAt)}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{fmtDuration(job.lastRunDurationMs)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {canRun && (
                        <button title="Run Now" onClick={() => runAction(() => platformAutomationApi.runJobNow(job.id), `Ran "${job.name}".`)} className="text-slate-500 hover:text-indigo-300">
                          <Play size={13} />
                        </button>
                      )}
                      {canManage && job.status !== 'Disabled' && (
                        job.status === 'Active' ? (
                          <button title="Pause" onClick={() => runAction(() => platformAutomationApi.pauseJob(job.id), `Paused "${job.name}".`)} className="text-slate-500 hover:text-amber-300">
                            <Pause size={13} />
                          </button>
                        ) : (
                          <button title="Resume" onClick={() => runAction(() => platformAutomationApi.resumeJob(job.id), `Resumed "${job.name}".`)} className="text-slate-500 hover:text-emerald-300">
                            <Play size={13} />
                          </button>
                        )
                      )}
                      {canManage && job.status !== 'Disabled' && (
                        <button title="Disable" onClick={() => runAction(() => platformAutomationApi.disableJob(job.id), `Disabled "${job.name}".`)} className="text-slate-500 hover:text-rose-400">
                          <Ban size={13} />
                        </button>
                      )}
                      {canManage && (
                        <button title="Edit" onClick={() => setEditing(job)} className="text-slate-500 hover:text-slate-200">
                          <Pencil size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && mode === 'all' && (
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>{total} job(s)</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border border-slate-800 disabled:opacity-30 hover:border-indigo-500/30">Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border border-slate-800 disabled:opacity-30 hover:border-indigo-500/30">Next</button>
          </div>
        </div>
      )}

      {editing !== undefined && (
        <JobEditorModal
          job={editing}
          queues={queues}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); showToast(editing ? 'Job updated.' : 'Job created.'); load(); }}
        />
      )}
    </div>
  );
}
