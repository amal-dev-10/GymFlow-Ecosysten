'use client';

const JOB_STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
  Paused: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
  Disabled: 'bg-slate-800/60 border-slate-700/60 text-slate-500',
};

export function JobStatusBadge({ status }: { status: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${JOB_STATUS_STYLES[status] || JOB_STATUS_STYLES.Disabled}`}>{status}</span>;
}

const RUN_STATUS_STYLES: Record<string, string> = {
  Queued: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300',
  Running: 'bg-sky-500/10 border-sky-500/20 text-sky-300',
  Completed: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
  Failed: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
};

export function RunStatusBadge({ status }: { status: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${RUN_STATUS_STYLES[status] || RUN_STATUS_STYLES.Queued}`}>{status}</span>;
}

const SCHEDULE_LABELS: Record<string, string> = {
  EVERY_MINUTE: 'Every Minute',
  HOURLY: 'Hourly',
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  CUSTOM_CRON: 'Custom Cron',
};

export function ScheduleBadge({ scheduleType }: { scheduleType: string }) {
  return <span className="px-2 py-0.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[10px] font-semibold text-slate-300">{SCHEDULE_LABELS[scheduleType] || scheduleType}</span>;
}

export function CategoryBadge({ category }: { category: string }) {
  return <span className="text-[11px] text-slate-500">{category}</span>;
}
