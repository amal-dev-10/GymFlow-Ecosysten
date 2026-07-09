'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface WelcomeSectionProps {
  userName: string;
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
  summary: string;
  onRefresh: () => void;
  refreshing: boolean;
}

function getGreeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const STATUS_CONFIG = {
  operational: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'All systems operational' },
  degraded: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Degraded performance' },
  outage: { icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', label: 'Service outage' },
  unknown: { icon: AlertTriangle, color: 'text-slate-500', bg: 'bg-slate-800/40 border-slate-700/40', label: 'Status unknown' },
};

export default function WelcomeSection({ userName, status, summary, onRefresh, refreshing }: WelcomeSectionProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const cfg = STATUS_CONFIG[status];
  const StatusIcon = cfg.icon;

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800/60">
      <div>
        <h1 className="text-xl font-bold text-slate-50 tracking-tight">
          {now ? getGreeting(now.getHours()) : 'Welcome'}{userName ? `, ${userName.split(' ')[0]}` : ''}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {now ? now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
        </p>
        <p className="text-xs text-slate-400 mt-2 max-w-xl">{summary}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-bold ${cfg.bg} ${cfg.color}`}>
          <StatusIcon size={13} />
          {cfg.label}
        </span>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-xl text-[11px] font-bold text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
    </div>
  );
}
