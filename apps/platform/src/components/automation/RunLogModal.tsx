'use client';

import { X, ScrollText } from 'lucide-react';
import type { AutomationJobRunDTO } from '@/types/automation';
import { RunStatusBadge } from './JobBadges';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '-');
const fmtDuration = (ms: number | null) => (ms == null ? '-' : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);

export default function RunLogModal({ run, onClose }: { run: AutomationJobRunDTO; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#0b101d] border border-slate-800 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-850">
          <span className="flex items-center gap-1.5 text-sm font-black text-white"><ScrollText size={15} className="text-indigo-400" /> Run Logs</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <RunStatusBadge status={run.status} />
            <span className="text-xs font-bold text-slate-200">{run.job?.name || run.jobId}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div><span className="block text-slate-600">Started</span><span className="text-slate-300">{fmt(run.startedAt)}</span></div>
            <div><span className="block text-slate-600">Completed</span><span className="text-slate-300">{fmt(run.completedAt)}</span></div>
            <div><span className="block text-slate-600">Duration</span><span className="text-slate-300">{fmtDuration(run.durationMs)}</span></div>
            <div><span className="block text-slate-600">Triggered By</span><span className="text-slate-300">{run.triggeredBy}</span></div>
          </div>
          {run.failureReason && (
            <div className="px-3 py-2 rounded-xl bg-rose-500/5 border border-rose-500/15">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Failure Reason</span>
              <p className="text-xs text-rose-300 mt-1">{run.failureReason}</p>
            </div>
          )}
          <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Log Output</span>
            <p className="text-xs font-mono text-slate-300 mt-1 whitespace-pre-wrap">{run.log || 'No log output recorded.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
