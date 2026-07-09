'use client';

import { FileEdit, Clock, CheckCircle2, AlertTriangle, XCircle, Undo2, CircleDollarSign } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; icon: typeof FileEdit; className: string }> = {
  Draft: { label: 'Draft', icon: FileEdit, className: 'text-slate-400 bg-slate-800/60 border-slate-700/60' },
  Unpaid: { label: 'Pending', icon: Clock, className: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  Pending: { label: 'Pending', icon: Clock, className: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  Paid: { label: 'Paid', icon: CheckCircle2, className: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
  'Partially Paid': { label: 'Partially Paid', icon: CircleDollarSign, className: 'text-sky-300 bg-sky-500/10 border-sky-500/20' },
  Overdue: { label: 'Overdue', icon: AlertTriangle, className: 'text-rose-300 bg-rose-500/10 border-rose-500/20' },
  Void: { label: 'Cancelled', icon: XCircle, className: 'text-slate-500 bg-slate-800/40 border-slate-700/40' },
  Cancelled: { label: 'Cancelled', icon: XCircle, className: 'text-slate-500 bg-slate-800/40 border-slate-700/40' },
  Refunded: { label: 'Refunded', icon: Undo2, className: 'text-orange-300 bg-orange-500/10 border-orange-500/20' },
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Unpaid;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${cfg.className}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; icon: typeof FileEdit; className: string }> = {
  Success: { label: 'Successful', icon: CheckCircle2, className: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
  Pending: { label: 'Pending', icon: Clock, className: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  Failed: { label: 'Failed', icon: XCircle, className: 'text-rose-300 bg-rose-500/10 border-rose-500/20' },
  Refunded: { label: 'Refunded', icon: Undo2, className: 'text-orange-300 bg-orange-500/10 border-orange-500/20' },
  Partially_Refunded: { label: 'Partially Refunded', icon: Undo2, className: 'text-orange-300 bg-orange-500/10 border-orange-500/20' },
  Disputed: { label: 'Disputed', icon: AlertTriangle, className: 'text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/20' },
  Cancelled: { label: 'Cancelled', icon: XCircle, className: 'text-slate-500 bg-slate-800/40 border-slate-700/40' },
};

export function PaymentStatusBadge({ status }: { status: string }) {
  const cfg = PAYMENT_STATUS_CONFIG[status] || PAYMENT_STATUS_CONFIG.Pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${cfg.className}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}
