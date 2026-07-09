'use client';

import { Clock, Infinity as InfinityIcon, Siren, CheckCircle2, XCircle, History } from 'lucide-react';
import type { OverrideType, OverrideStatus } from '@/types/featureEngine';

const TYPE_CONFIG: Record<OverrideType, { label: string; icon: typeof Clock; className: string }> = {
  TEMPORARY: { label: 'Temporary', icon: Clock, className: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' },
  PERMANENT: { label: 'Permanent', icon: InfinityIcon, className: 'text-violet-300 bg-violet-500/10 border-violet-500/20' },
  EMERGENCY: { label: 'Emergency', icon: Siren, className: 'text-rose-300 bg-rose-500/10 border-rose-500/20' },
};

const STATUS_CONFIG: Record<OverrideStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  ACTIVE: { label: 'Active', icon: CheckCircle2, className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  EXPIRED: { label: 'Expired', icon: History, className: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
  REVOKED: { label: 'Revoked', icon: XCircle, className: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
};

export function OverrideTypeBadge({ type }: { type: OverrideType }) {
  const { label, icon: Icon, className } = TYPE_CONFIG[type];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${className}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}

export function OverrideStatusBadge({ status }: { status: OverrideStatus }) {
  const { label, icon: Icon, className } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${className}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}
