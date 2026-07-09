'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RotateCcw, EyeOff, FileText } from 'lucide-react';
import { platformAutomationApi } from '@/lib/api';
import type { AutomationJobRunDTO } from '@/types/automation';
import RunLogModal from './RunLogModal';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '-');

export default function FailedJobsSection({ canManage, showToast }: { canManage: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [rows, setRows] = useState<AutomationJobRunDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<AutomationJobRunDTO | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    platformAutomationApi.listFailedJobs({ limit: 50 }).then((res) => setRows(res.data)).catch(() => showToast('Failed to load failed jobs.', 'error')).finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // listFailedJobs returns all Failed runs; ones already acknowledged
  // (ignoredAt set) are hidden here but stay visible in Execution History.
  const visible = rows.filter((r) => !r.ignoredAt);

  const retry = async (id: string) => {
    try {
      const result = await platformAutomationApi.retryRun(id);
      showToast(`Retry ${result.status === 'Completed' ? 'succeeded' : 'failed again'}.`, result.status === 'Completed' ? 'success' : 'error');
      load();
    } catch {
      showToast('Failed to retry run.', 'error');
    }
  };

  const ignore = async (id: string) => {
    try {
      await platformAutomationApi.ignoreRun(id);
      showToast('Failure ignored.');
      load();
    } catch {
      showToast('Failed to ignore run.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : visible.length === 0 ? (
        <PlatformEmptyState icon={AlertTriangle} title="No failed jobs" description="Failures needing attention will appear here." />
      ) : (
        <div className="space-y-2">
          {visible.map((run) => (
            <div key={run.id} className="bg-[#0b101d] border border-rose-500/15 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-200">{run.job?.name || run.jobId}</span>
                <p className="text-[11px] text-rose-400 mt-1 truncate">{run.failureReason || 'Unknown failure'}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Failed {fmt(run.completedAt)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setViewing(run)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 text-[11px] font-bold hover:border-slate-700">
                  <FileText size={11} /> View Logs
                </button>
                {canManage && (
                  <>
                    <button onClick={() => retry(run.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-bold hover:bg-indigo-500/15">
                      <RotateCcw size={11} /> Retry
                    </button>
                    <button onClick={() => ignore(run.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 text-[11px] font-bold hover:border-slate-700">
                      <EyeOff size={11} /> Ignore
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewing && <RunLogModal run={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
