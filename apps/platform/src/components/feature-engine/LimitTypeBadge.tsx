'use client';

import { Hash, Infinity as InfinityIcon, Ban } from 'lucide-react';
import type { ResourceLimitType } from '@/types/featureEngine';

const CONFIG: Record<ResourceLimitType, { label: string; icon: typeof Hash; className: string }> = {
  LIMITED: { label: 'Number', icon: Hash, className: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' },
  UNLIMITED: { label: 'Unlimited', icon: InfinityIcon, className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  DISABLED: { label: 'Disabled', icon: Ban, className: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
};

export default function LimitTypeBadge({ limitType, limitValue, unit }: { limitType: ResourceLimitType; limitValue?: number | null; unit?: string | null }) {
  const { label, icon: Icon, className } = CONFIG[limitType];
  const display = limitType === 'LIMITED' && limitValue != null ? `${limitValue}${unit ? ` ${unit}` : ''}` : label;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${className}`}>
      <Icon size={11} />
      {display}
    </span>
  );
}
