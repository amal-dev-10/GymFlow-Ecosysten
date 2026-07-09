'use client';

import { Flag } from 'lucide-react';
import type { FeatureSnapshotDTO } from '@/types/support';

const STATE_TONE: Record<string, string> = { ENABLED: 'text-emerald-400', DISABLED: 'text-slate-500', BETA: 'text-violet-400', ENTERPRISE_ONLY: 'text-amber-400', HIDDEN: 'text-slate-600', COMING_SOON: 'text-sky-400' };

export default function FeatureAccessSnapshot({ features }: { features: FeatureSnapshotDTO }) {
  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 space-y-2">
      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200"><Flag size={13} className="text-violet-400" /> Feature Access</span>
      {features.violations.length > 0 && (
        <p className="text-[10px] text-rose-400 font-semibold">{features.violations.length} limit violation(s) on this plan.</p>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        {features.featureAccess.slice(0, 8).map((f) => (
          <div key={f.featureKey} className="flex items-center justify-between gap-1 text-[10px]">
            <span className="text-slate-400 truncate">{f.label}</span>
            <span className={`font-bold shrink-0 ${STATE_TONE[f.state] || 'text-slate-400'}`}>{f.state}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
