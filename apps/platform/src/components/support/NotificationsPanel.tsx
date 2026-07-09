'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Flame, ArrowUpCircle, Clock, Bell } from 'lucide-react';
import { platformSupportApi } from '@/lib/api';
import type { SupportNotificationsDTO } from '@/types/support';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString();
}

export default function NotificationsPanel() {
  const router = useRouter();
  const [data, setData] = useState<SupportNotificationsDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformSupportApi.getNotifications().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-40 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />;

  const total = data ? data.newTickets.length + data.criticalTickets.length + data.escalations.length + data.slaWarnings.length : 0;

  if (!data || total === 0) {
    return <PlatformEmptyState icon={Bell} title="No alerts right now" description="New tickets, critical priority, escalations and SLA warnings from the last 24h will show up here." />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {data.newTickets.length > 0 && (
        <NotificationGroup icon={Sparkles} label="New Tickets" tone="text-violet-400">
          {data.newTickets.map((t) => (
            <NotificationRow key={t.id} onClick={() => router.push(`/operations/support/tickets/${t.id}`)} title={`#${t.ticketNumber} ${t.subject}`} sub={`${t.organizationName} · ${fmtDateTime(t.createdAt)}`} />
          ))}
        </NotificationGroup>
      )}
      {data.criticalTickets.length > 0 && (
        <NotificationGroup icon={Flame} label="Critical Tickets" tone="text-rose-400">
          {data.criticalTickets.map((t) => (
            <NotificationRow key={t.id} onClick={() => router.push(`/operations/support/tickets/${t.id}`)} title={`#${t.ticketNumber} ${t.subject}`} sub={`${t.organizationName} · ${fmtDateTime(t.createdAt)}`} />
          ))}
        </NotificationGroup>
      )}
      {data.escalations.length > 0 && (
        <NotificationGroup icon={ArrowUpCircle} label="Escalations" tone="text-orange-400">
          {data.escalations.map((e) => (
            <NotificationRow key={e.id} onClick={() => router.push(`/operations/support/tickets/${e.ticketId}`)} title={`#${e.ticketNumber} → ${e.toLevel}`} sub={`${e.organizationName} · ${fmtDateTime(e.createdAt)}`} />
          ))}
        </NotificationGroup>
      )}
      {data.slaWarnings.length > 0 && (
        <NotificationGroup icon={Clock} label="SLA Warnings" tone="text-amber-400">
          {data.slaWarnings.map((s) => (
            <NotificationRow key={s.id} onClick={() => router.push(`/operations/support/tickets/${s.id}`)} title={`#${s.ticketNumber} ${s.subject}`} sub={s.band === 'breached' ? 'SLA breached' : `${s.minutesRemaining}m remaining`} />
          ))}
        </NotificationGroup>
      )}
    </div>
  );
}

function NotificationGroup({ icon: Icon, label, tone, children }: { icon: typeof Sparkles; label: string; tone: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 space-y-1.5">
      <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${tone}`}><Icon size={12} /> {label}</span>
      {children}
    </div>
  );
}

function NotificationRow({ onClick, title, sub }: { onClick: () => void; title: string; sub: string }) {
  return (
    <button onClick={onClick} className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-900/60 transition-colors">
      <span className="block text-[11px] font-semibold text-slate-300 truncate">{title}</span>
      <span className="block text-[10px] text-slate-600 truncate">{sub}</span>
    </button>
  );
}
