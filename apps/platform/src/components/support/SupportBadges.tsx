'use client';

import { Sparkles, CircleDot, Loader2, Clock, ArrowUpCircle, CheckCircle2, XCircle, Ban, ArrowDown, Minus, ArrowUp, Flame } from 'lucide-react';
import type { TicketStatus, TicketPriority, SlaBand } from '@/types/support';
import { PRIORITY_LABELS } from '@/types/support';

const STATUS_CONFIG: Record<TicketStatus, { label: string; icon: typeof Sparkles; className: string }> = {
  NEW: { label: 'New', icon: Sparkles, className: 'text-violet-300 bg-violet-500/10 border-violet-500/20' },
  OPEN: { label: 'Open', icon: CircleDot, className: 'text-sky-300 bg-sky-500/10 border-sky-500/20' },
  IN_PROGRESS: { label: 'In Progress', icon: Loader2, className: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' },
  WAITING_FOR_CUSTOMER: { label: 'Waiting for Customer', icon: Clock, className: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  ESCALATED: { label: 'Escalated', icon: ArrowUpCircle, className: 'text-orange-300 bg-orange-500/10 border-orange-500/20' },
  RESOLVED: { label: 'Resolved', icon: CheckCircle2, className: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
  CLOSED: { label: 'Closed', icon: XCircle, className: 'text-slate-400 bg-slate-800/60 border-slate-700/60' },
  CANCELLED: { label: 'Cancelled', icon: Ban, className: 'text-slate-500 bg-slate-800/40 border-slate-700/40' },
};

const PRIORITY_CONFIG: Record<TicketPriority, { icon: typeof ArrowDown; className: string }> = {
  LOW: { icon: ArrowDown, className: 'text-sky-300 bg-sky-500/10 border-sky-500/20' },
  MEDIUM: { icon: Minus, className: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  HIGH: { icon: ArrowUp, className: 'text-orange-300 bg-orange-500/10 border-orange-500/20' },
  URGENT: { icon: Flame, className: 'text-rose-300 bg-rose-500/10 border-rose-500/20' },
};

const SLA_CONFIG: Record<SlaBand, { label: string; className: string }> = {
  on_track: { label: 'On Track', className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  at_risk: { label: 'At Risk', className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  breached: { label: 'Breached', className: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.OPEN;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${cfg.className}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.MEDIUM;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${cfg.className}`}>
      <Icon size={11} /> {PRIORITY_LABELS[priority]}
    </span>
  );
}

function fmtMinutes(minutes: number): string {
  const abs = Math.abs(minutes);
  if (abs < 60) return `${abs}m`;
  if (abs < 1440) return `${Math.round(abs / 60)}h`;
  return `${Math.round(abs / 1440)}d`;
}

export function SlaBadge({ minutesRemaining, band, isClosed }: { minutesRemaining: number | null; band: SlaBand; isClosed: boolean }) {
  if (isClosed) return <span className="text-[10px] text-slate-600">-</span>;
  const cfg = SLA_CONFIG[band] || SLA_CONFIG.on_track;
  const text = minutesRemaining == null ? cfg.label : minutesRemaining < 0 ? `${fmtMinutes(minutesRemaining)} overdue` : `${fmtMinutes(minutesRemaining)} left`;
  return <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${cfg.className}`}>{text}</span>;
}
