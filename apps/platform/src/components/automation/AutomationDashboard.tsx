'use client';

import { useEffect, useState } from 'react';
import { ListChecks, CalendarClock, Loader, CheckCircle2, XCircle, Clock3, Timer } from 'lucide-react';
import { platformAutomationApi } from '@/lib/api';
import type { AutomationDashboardDTO } from '@/types/automation';

function StatTile({ icon: Icon, label, value, tone }: { icon: typeof ListChecks; label: string; value: string; tone?: string }) {
  return (
    <div className="bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between min-h-[100px] transition-colors">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <Icon size={12} className={tone || 'text-indigo-400'} /> {label}
      </span>
      <span className="text-2xl font-black text-slate-100 mt-2">{value}</span>
    </div>
  );
}

const fmtDuration = (ms: number) => (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);

export default function AutomationDashboard() {
  const [dashboard, setDashboard] = useState<AutomationDashboardDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformAutomationApi.getDashboard().then(setDashboard).catch(() => setDashboard(null)).finally(() => setLoading(false));
  }, []);

  if (loading || !dashboard) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(7)].map((_, i) => <div key={i} className="h-[100px] bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatTile icon={ListChecks} label="Active Jobs" value={dashboard.activeJobs.toLocaleString()} />
      <StatTile icon={CalendarClock} label="Scheduled Jobs" value={dashboard.scheduledJobs.toLocaleString()} tone="text-indigo-400" />
      <StatTile icon={Loader} label="Running Jobs" value={dashboard.runningJobs.toLocaleString()} tone="text-sky-400" />
      <StatTile icon={CheckCircle2} label="Completed Jobs" value={dashboard.completedJobs.toLocaleString()} tone="text-emerald-400" />
      <StatTile icon={XCircle} label="Failed Jobs" value={dashboard.failedJobs.toLocaleString()} tone="text-rose-400" />
      <StatTile icon={Clock3} label="Queued Jobs" value={dashboard.queuedJobs.toLocaleString()} tone="text-amber-400" />
      <StatTile icon={Timer} label="Avg. Execution Time" value={fmtDuration(dashboard.avgExecutionTimeMs)} />
    </div>
  );
}
