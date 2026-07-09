'use client';

import { Activity as ActivityIcon } from 'lucide-react';
import { SectionCard, EmptyRow, fmtDateTime } from '@/components/org360/shared';
import type { PlatformUserTimelineEvent } from '@/types/platformUsers';

export default function ActivityTab({ events }: { events: PlatformUserTimelineEvent[] }) {
  return (
    <SectionCard title="Activity Timeline">
      {events.length === 0 ? (
        <EmptyRow text="No activity recorded yet." />
      ) : (
        <div className="relative pl-2">
          <div className="absolute left-[19px] top-1 bottom-1 w-px bg-slate-800" />
          <div className="space-y-3.5">
            {events.map((e) => (
              <div key={e.id} className="relative flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 z-10 text-indigo-300 bg-indigo-500/10 border-indigo-500/20">
                  <ActivityIcon size={14} />
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-200">{e.action}</span>
                    <span className="text-[10px] text-slate-600 shrink-0">{fmtDateTime(e.createdAt)}</span>
                  </div>
                  {e.details && <p className="text-[11px] text-slate-500 mt-0.5 break-words">{e.details}</p>}
                  <span className="text-[10px] text-slate-600">by {e.user}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
