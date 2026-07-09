'use client';

import { PlusCircle, Pencil, DollarSign, ToggleLeft, Gauge, Archive, RotateCcw } from 'lucide-react';
import type { PlanVersionHistoryDTO, PlanChangeType } from '@/types/plans';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const ICONS: Record<PlanChangeType, typeof PlusCircle> = {
  CREATED: PlusCircle,
  UPDATED: Pencil,
  PRICING_CHANGED: DollarSign,
  FEATURE_CHANGED: ToggleLeft,
  LIMIT_CHANGED: Gauge,
  ARCHIVED: Archive,
  RESTORED: RotateCcw,
};

export default function PlanVersionHistoryList({ history }: { history: PlanVersionHistoryDTO[] }) {
  if (history.length === 0) {
    return <PlatformEmptyState title="No version history yet" description="Changes to this plan will appear here." />;
  }

  return (
    <div className="space-y-2">
      {history.map((entry) => {
        const Icon = ICONS[entry.changeType] || Pencil;
        return (
          <div key={entry.id} className="flex items-start gap-3 bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
              <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-200">v{entry.version}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">{entry.changeType.replace('_', ' ')}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{entry.summary}</p>
            </div>
            <span className="text-[10px] text-slate-600 shrink-0">{new Date(entry.createdAt).toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}
