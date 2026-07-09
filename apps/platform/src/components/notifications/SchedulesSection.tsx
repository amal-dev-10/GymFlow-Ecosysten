'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { platformNotificationsApi } from '@/lib/api';
import type { NotificationCampaignDTO } from '@/types/notifications';
import { ChannelBadge } from './NotificationBadges';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '-');

export default function SchedulesSection({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [rows, setRows] = useState<NotificationCampaignDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    platformNotificationsApi.listSchedules().then(setRows).catch(() => showToast('Failed to load schedules.', 'error')).finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500">Scheduled and recurring campaigns not yet sent. No background scheduler exists in this environment - due campaigns are processed automatically the next time this workspace loads.</p>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors shrink-0">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={Clock} title="Nothing scheduled" description="Scheduled and recurring campaigns will appear here until they run." />
      ) : (
        <div className="space-y-2">
          {rows.map((c) => (
            <div key={c.id} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200">{c.name}</span>
                  <ChannelBadge channel={c.channel} />
                  {c.scheduleType === 'RECURRING' && <span className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-bold text-violet-300">{c.recurringFrequency}</span>}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{c.audienceType.replace(/_/g, ' ')}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="block text-[10px] text-slate-600">Next Run</span>
                <span className="text-xs font-semibold text-slate-200">{fmt(c.nextRunAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
