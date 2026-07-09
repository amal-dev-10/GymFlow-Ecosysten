'use client';

import { CheckCircle2, Clock, AlertTriangle, PauseCircle, HourglassIcon, Ban, XCircle, Gem, AlertOctagon } from 'lucide-react';

const CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  Active: { label: 'Active', icon: CheckCircle2, className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  Trialing: { label: 'Trial', icon: Clock, className: 'text-sky-300 bg-sky-500/10 border-sky-500/20' },
  Grace_Period: { label: 'Grace Period', icon: AlertTriangle, className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  Paused: { label: 'Paused', icon: PauseCircle, className: 'text-slate-300 bg-slate-500/10 border-slate-500/20' },
  Pending_Payment: { label: 'Pending Payment', icon: HourglassIcon, className: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  Past_Due: { label: 'Past Due', icon: AlertOctagon, className: 'text-rose-300 bg-rose-500/10 border-rose-500/20' },
  Canceled: { label: 'Cancelled', icon: Ban, className: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  Expired: { label: 'Expired', icon: XCircle, className: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
  None: { label: 'No Subscription', icon: XCircle, className: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
};

// Enterprise is an overlay flag rather than a literal status - it's shown
// instead of the raw status when isEnterpriseCustom is true and the
// subscription is otherwise healthy (Active/Trialing).
export function deriveSubscriptionStatusLabel(status: string, renewalDate: string | null, isEnterpriseCustom: boolean): string {
  if (isEnterpriseCustom && ['Active', 'Trialing'].includes(status)) return 'Enterprise';
  if (['Active', 'Trialing', 'Past_Due'].includes(status) && renewalDate && new Date(renewalDate) < new Date()) return 'Expired';
  return status;
}

export default function SubscriptionStatusBadge({ status, renewalDate, isEnterpriseCustom = false }: { status: string; renewalDate?: string | null; isEnterpriseCustom?: boolean }) {
  const effective = deriveSubscriptionStatusLabel(status, renewalDate ?? null, isEnterpriseCustom);
  if (effective === 'Enterprise') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap text-amber-300 bg-amber-500/10 border-amber-500/20">
        <Gem size={11} />
        Enterprise
      </span>
    );
  }
  const cfg = CONFIG[effective] || CONFIG.Active;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${cfg.className}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}
