'use client';

import { useEffect, useState } from 'react';
import { Bell, Send, Clock3, XCircle, CalendarClock, MailOpen } from 'lucide-react';
import { platformNotificationsApi } from '@/lib/api';
import type { NotificationsDashboardDTO } from '@/types/notifications';

function StatTile({ icon: Icon, label, value, tone }: { icon: typeof Bell; label: string; value: number; tone?: string }) {
  return (
    <div className="bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between min-h-[100px] transition-colors">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <Icon size={12} className={tone || 'text-indigo-400'} /> {label}
      </span>
      <span className="text-2xl font-black text-slate-100 mt-2">{value.toLocaleString()}</span>
    </div>
  );
}

export default function NotificationsDashboard() {
  const [dashboard, setDashboard] = useState<NotificationsDashboardDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformNotificationsApi.getDashboard().then(setDashboard).catch(() => setDashboard(null)).finally(() => setLoading(false));
  }, []);

  if (loading || !dashboard) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-[100px] bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatTile icon={Bell} label="Total Notifications" value={dashboard.total} />
      <StatTile icon={Send} label="Sent Today" value={dashboard.sentToday} tone="text-emerald-400" />
      <StatTile icon={Clock3} label="Pending" value={dashboard.pending} tone="text-sky-400" />
      <StatTile icon={XCircle} label="Failed" value={dashboard.failed} tone="text-rose-400" />
      <StatTile icon={CalendarClock} label="Scheduled" value={dashboard.scheduled} tone="text-indigo-400" />
      <StatTile icon={MailOpen} label="Unread" value={dashboard.unread} tone="text-amber-400" />
    </div>
  );
}
