'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Plus, Bell, SlidersHorizontal, X } from 'lucide-react';
import { platformNotificationsApi } from '@/lib/api';
import type { NotificationDTO, NotificationListFilters } from '@/types/notifications';
import { StatusBadge, PriorityBadge, ChannelBadge } from './NotificationBadges';
import NotificationFiltersPanel from './NotificationFiltersPanel';
import ComposeNotificationModal from './ComposeNotificationModal';
import NotificationDetailsDrawer from './NotificationDetailsDrawer';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '-');

export default function NotificationList({ canSend, showToast }: { canSend: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [search, setSearch] = useState('');
  const [advanced, setAdvanced] = useState<NotificationListFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rows, setRows] = useState<NotificationDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const filters: NotificationListFilters = { ...advanced, page, limit: 25, search: search || undefined };
    platformNotificationsApi
      .listNotifications(filters)
      .then((res) => { setRows(res.data); setTotal(res.total); setTotalPages(res.totalPages); })
      .catch(() => showToast('Failed to load notifications.', 'error'))
      .finally(() => setLoading(false));
  }, [page, search, advanced, showToast]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  const cancelRow = async (id: string) => {
    try {
      await platformNotificationsApi.cancelNotification(id);
      showToast('Notification cancelled.');
      load();
    } catch {
      showToast('Failed to cancel notification.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or recipient..." className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none" />
        </div>
        <button onClick={() => setFiltersOpen((v) => !v)} className="flex items-center gap-1.5 px-3 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors">
          <SlidersHorizontal size={13} /> Filters
        </button>
        {canSend && (
          <button onClick={() => setComposeOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 rounded-xl text-xs font-bold text-indigo-300 transition-colors">
            <Plus size={13} /> Compose
          </button>
        )}
      </div>

      {filtersOpen && <NotificationFiltersPanel filters={advanced} onChange={(f) => { setAdvanced(f); setPage(1); setFiltersOpen(false); }} onClose={() => setFiltersOpen(false)} />}

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={Bell} title="No notifications found" description="Try adjusting search or filters, or compose a new notification." />
      ) : (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Scheduled</th>
                <th className="px-4 py-3">Sent</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id} onClick={() => setSelectedId(n.id)} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/30 cursor-pointer transition-colors">
                  <td className="px-4 py-3 text-xs font-semibold text-slate-200 max-w-[200px] truncate">{n.title}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{n.notificationType}</td>
                  <td className="px-4 py-3"><ChannelBadge channel={n.channel} /></td>
                  <td className="px-4 py-3 text-[11px] text-slate-400">{n.recipientName || '-'}</td>
                  <td className="px-4 py-3"><StatusBadge status={n.status} /></td>
                  <td className="px-4 py-3"><PriorityBadge priority={n.priority} /></td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{fmt(n.scheduledFor)}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{fmt(n.sentAt)}</td>
                  <td className="px-4 py-3">
                    {n.status === 'Scheduled' && canSend ? (
                      <button onClick={(e) => { e.stopPropagation(); cancelRow(n.id); }} className="flex items-center gap-1 text-[10px] font-bold text-rose-400 hover:text-rose-300">
                        <X size={11} /> Cancel
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-700">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && <NotificationDetailsDrawer id={selectedId} onClose={() => setSelectedId(null)} />}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>{total} notification(s)</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border border-slate-800 disabled:opacity-30 hover:border-indigo-500/30">Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border border-slate-800 disabled:opacity-30 hover:border-indigo-500/30">Next</button>
          </div>
        </div>
      )}

      {composeOpen && (
        <ComposeNotificationModal
          onClose={() => setComposeOpen(false)}
          onSent={(count) => { setComposeOpen(false); showToast(`Sent to ${count} recipient(s).`); load(); }}
        />
      )}
    </div>
  );
}
