'use client';

import { Globe2, Lock, EyeOff } from 'lucide-react';
import type { PlanVisibility } from '@/types/plans';

const CONFIG: Record<PlanVisibility, { label: string; icon: typeof Globe2; className: string }> = {
  PUBLIC: { label: 'Public', icon: Globe2, className: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' },
  PRIVATE: { label: 'Private', icon: Lock, className: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  INTERNAL: { label: 'Internal', icon: EyeOff, className: 'text-rose-300 bg-rose-500/10 border-rose-500/20' },
};

export default function PlanVisibilityBadge({ visibility }: { visibility: PlanVisibility }) {
  const { label, icon: Icon, className } = CONFIG[visibility];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${className}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}
