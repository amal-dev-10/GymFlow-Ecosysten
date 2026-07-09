'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { platformNotificationsApi } from '@/lib/api';
import type { NotificationDTO } from '@/types/notifications';
import { StatusBadge, PriorityBadge, ChannelBadge } from './NotificationBadges';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '-');

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-900/60 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 shrink-0">{label}</span>
      <span className="text-xs text-slate-300 text-right">{children}</span>
    </div>
  );
}

export default function NotificationDetailsDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [n, setN] = useState<NotificationDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformNotificationsApi.getNotification(id).then(setN).catch(() => setN(null)).finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md h-full bg-[#0b101d] border-l border-slate-800 overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between p-5 border-b border-slate-850 sticky top-0 bg-[#0b101d]/95 backdrop-blur-md z-10">
          <span className="text-sm font-black text-white">Notification Details</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-6 bg-slate-900/60 rounded animate-pulse" />)}</div>
        ) : !n ? (
          <div className="p-5 text-xs text-slate-500">Notification not found.</div>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <span className="text-sm font-bold text-slate-100">{n.title}</span>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{n.body}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={n.status} />
              <ChannelBadge channel={n.channel} />
              <PriorityBadge priority={n.priority} />
            </div>
            <div className="pt-2">
              <Row label="Type">{n.notificationType}</Row>
              <Row label="Recipient">{n.recipientName || '-'}</Row>
              <Row label="Recipient Type">{n.recipientType}</Row>
              <Row label="Scheduled">{fmt(n.scheduledFor)}</Row>
              <Row label="Sent">{fmt(n.sentAt)}</Row>
              <Row label="Delivered">{fmt(n.deliveredAt)}</Row>
              <Row label="Read">{fmt(n.readAt)}</Row>
              {n.failureReason && <Row label="Failure Reason"><span className="text-rose-400">{n.failureReason}</span></Row>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
