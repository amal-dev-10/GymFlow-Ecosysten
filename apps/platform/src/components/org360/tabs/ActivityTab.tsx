'use client';

import { useEffect, useState } from 'react';
import { Sparkles, CreditCard, UserPlus, Building, Activity as ActivityIcon, Bell, ShieldAlert } from 'lucide-react';
import { platformOrganizationsApi, handleApiError } from '@/lib/api';
import type { TimelineEvent } from '@/types/org360';
import { SectionCard, TabLoading, EmptyRow, fmtDateTime } from '../shared';

const ICONS: Record<string, typeof ActivityIcon> = {
  sparkles: Sparkles,
  'credit-card': CreditCard,
  'user-plus': UserPlus,
  building: Building,
  activity: ActivityIcon,
  bell: Bell,
  shield: ShieldAlert,
};

const TYPE_TONE: Record<string, string> = {
  created: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
  subscription: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  user: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
  branch: 'text-violet-300 bg-violet-500/10 border-violet-500/20',
  audit: 'text-slate-400 bg-slate-800/60 border-slate-700/60',
};

export default function ActivityTab({ orgId, showToast }: { orgId: string; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    platformOrganizationsApi.getActivity(orgId).then(setEvents).catch((e) => showToast(handleApiError(e), 'error')).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  if (loading) return <TabLoading />;

  return (
    <SectionCard title="Activity Timeline">
      {events.length === 0 ? (
        <EmptyRow text="No activity recorded yet." />
      ) : (
        <div className="relative pl-2">
          <div className="absolute left-[19px] top-1 bottom-1 w-px bg-slate-800" />
          <div className="space-y-4">
            {events.map((e) => {
              const Icon = ICONS[e.icon] || ActivityIcon;
              const tone = TYPE_TONE[e.type] || TYPE_TONE.audit;
              return (
                <div key={e.id} className="relative flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 z-10 ${tone}`}>
                    <Icon size={15} />
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
