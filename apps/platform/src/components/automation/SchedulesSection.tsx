'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { platformAutomationApi } from '@/lib/api';
import type { AutomationJobDTO } from '@/types/automation';
import { ScheduleBadge } from './JobBadges';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '-');

export default function SchedulesSection({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [rows, setRows] = useState<AutomationJobDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    platformAutomationApi.listSchedules().then(setRows).catch(() => showToast('Failed to load schedules.', 'error')).finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500">Active jobs sorted by next run time. No background scheduler exists in this environment - due jobs are processed automatically the next time this workspace loads.</p>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors shrink-0">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={Clock} title="Nothing scheduled" description="Active jobs will appear here sorted by their next run time." />
      ) : (
        <div className="space-y-2">
          {rows.map((job) => (
            <div key={job.id} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200">{job.name}</span>
                  <ScheduleBadge scheduleType={job.scheduleType} />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{job.category}{job.workflowType ? ` - ${job.workflowType}` : ''}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="block text-[10px] text-slate-600">Next Run</span>
                <span className="text-xs font-semibold text-slate-200">{fmt(job.nextRunAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
