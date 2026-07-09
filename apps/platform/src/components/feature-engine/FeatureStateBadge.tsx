'use client';

import { CheckCircle2, XCircle, FlaskConical, Gem, EyeOff, Clock } from 'lucide-react';
import type { FeatureState } from '@/types/featureEngine';

export const FEATURE_STATE_CONFIG: Record<FeatureState, { label: string; icon: typeof CheckCircle2; className: string }> = {
  ENABLED: { label: 'Enabled', icon: CheckCircle2, className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  DISABLED: { label: 'Disabled', icon: XCircle, className: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
  BETA: { label: 'Beta', icon: FlaskConical, className: 'text-violet-300 bg-violet-500/10 border-violet-500/20' },
  ENTERPRISE_ONLY: { label: 'Enterprise Only', icon: Gem, className: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  HIDDEN: { label: 'Hidden', icon: EyeOff, className: 'text-slate-600 bg-slate-800/40 border-slate-700/40' },
  COMING_SOON: { label: 'Coming Soon', icon: Clock, className: 'text-sky-300 bg-sky-500/10 border-sky-500/20' },
};

export default function FeatureStateBadge({ state }: { state: FeatureState }) {
  const { label, icon: Icon, className } = FEATURE_STATE_CONFIG[state];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${className}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}
