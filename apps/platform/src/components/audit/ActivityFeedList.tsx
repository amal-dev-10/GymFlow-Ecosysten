'use client';

import { Radio } from 'lucide-react';
import { useAuditLiveFeed } from '@/hooks/useAuditLiveFeed';
import type { AuditEventRowDTO } from '@/types/audit';
import { getCategoryIcon, SeverityBadge } from './AuditBadges';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const SEVERITY_TONE: Record<string, string> = {
  Information: 'text-slate-400 bg-slate-800/60 border-slate-700/60',
  Low: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
  Medium: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  High: 'text-orange-300 bg-orange-500/10 border-orange-500/20',
  Critical: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
};

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString();
}

export default function ActivityFeedList({ onSelect }: { onSelect: (event: AuditEventRowDTO) => void }) {
  const { events, loading, newIds } = useAuditLiveFeed();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live - refreshes automatically every few seconds
      </div>

      {loading && events.length === 0 ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : events.length === 0 ? (
        <PlatformEmptyState icon={Radio} title="No recent activity" description="New platform events will appear here as they happen." />
      ) : (
        <div className="relative pl-2">
          <div className="absolute left-[19px] top-1 bottom-1 w-px bg-slate-800" />
          <div className="space-y-3">
            {events.map((e) => {
              const Icon = getCategoryIcon(e.eventCategory);
              const tone = SEVERITY_TONE[e.severity] || SEVERITY_TONE.Information;
              const isNew = newIds.has(e.id);
              return (
                <div
                  key={e.id}
                  onClick={() => onSelect(e)}
                  className={`relative flex items-start gap-3 cursor-pointer rounded-xl transition-colors -mx-2 px-2 py-1 hover:bg-slate-900/40 ${isNew ? 'animate-fade-in bg-indigo-500/5' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 z-10 ${tone}`}>
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-200 truncate">{e.action}</span>
                      <span className="text-[10px] text-slate-600 shrink-0">{fmtDateTime(e.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 break-words">{e.details}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-600">by {e.user}</span>
                      <SeverityBadge severity={e.severity} />
                      {e.organization?.name && <span className="text-[10px] text-slate-600">· {e.organization.name}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
