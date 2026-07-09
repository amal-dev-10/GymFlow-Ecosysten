'use client';

import { CheckCircle2, FileEdit, Archive } from 'lucide-react';
import type { PlanStatus } from '@/types/plans';

const CONFIG: Record<PlanStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  ACTIVE: { label: 'Active', icon: CheckCircle2, className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  DRAFT: { label: 'Draft', icon: FileEdit, className: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  ARCHIVED: { label: 'Archived', icon: Archive, className: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
};

export default function PlanStatusBadge({ status }: { status: PlanStatus }) {
  const { label, icon: Icon, className } = CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${className}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}
