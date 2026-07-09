'use client';

import { Sparkles, CreditCard, Receipt, Activity as ActivityIcon, Clock } from 'lucide-react';
import { SectionCard, EmptyRow, fmtDateTime } from '../shared';
import type { SubscriptionTimelineEvent } from '@/types/org360';

const ICONS: Record<string, typeof ActivityIcon> = {
  sparkles: Sparkles,
  'credit-card': CreditCard,
  receipt: Receipt,
  clock: Clock,
  activity: ActivityIcon,
};

export default function SubscriptionTimelinePanel({ events }: { events: SubscriptionTimelineEvent[] }) {
  return (
    <SectionCard title="Subscription Timeline">
      {events.length === 0 ? (
        <EmptyRow text="No subscription events recorded yet." />
      ) : (
        <div className="relative pl-2 max-h-[420px] overflow-y-auto scrollbar-thin">
          <div className="absolute left-[19px] top-1 bottom-1 w-px bg-slate-800" />
          <div className="space-y-3.5">
            {events.map((e) => {
              const Icon = ICONS[e.icon] || ActivityIcon;
              return (
                <div key={e.id} className="relative flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 z-10 text-indigo-300 bg-indigo-500/10 border-indigo-500/20">
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-200">{e.title}</span>
                      <span className="text-[10px] text-slate-600 shrink-0">{fmtDateTime(e.at)}</span>
                    </div>
                    {e.detail && <p className="text-[11px] text-slate-500 mt-0.5 break-words">{e.detail}</p>}
                    {e.user && <span className="text-[10px] text-slate-600">by {e.user}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
