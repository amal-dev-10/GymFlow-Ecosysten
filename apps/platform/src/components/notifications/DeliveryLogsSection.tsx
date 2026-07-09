'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, ScrollText, SlidersHorizontal } from 'lucide-react';
import { platformNotificationsApi } from '@/lib/api';
import type { NotificationDTO, NotificationListFilters } from '@/types/notifications';
import { StatusBadge, ChannelBadge } from './NotificationBadges';
import NotificationFiltersPanel from './NotificationFiltersPanel';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '-');

// Recipient-centric view over the same Notification table used by the
// Notification List tab - different default filters/columns, not a
// duplicated log (see Notification model's doc comment in schema.prisma).
export default function DeliveryLogsSection({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [search, setSearch] = useState('');
  const [advanced, setAdvanced] = useState<NotificationListFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rows, setRows] = useState<NotificationDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const filters: NotificationListFilters = { ...advanced, page, limit: 25, search: search || undefined };
    platformNotificationsApi
      .listNotifications(filters)
      .then((res) => { setRows(res.data); setTotal(res.total); setTotalPages(res.totalPages); })
      .catch(() => showToast('Failed to load delivery logs.', 'error'))
      .finally(() => setLoading(false));
  }, [page, search, advanced, showToast]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search recipient or title..." className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none" />
        </div>
        <button onClick={() => setFiltersOpen((v) => !v)} className="flex items-center gap-1.5 px-3 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors">
          <SlidersHorizontal size={13} /> Filters
        </button>
      </div>

      {filtersOpen && <NotificationFiltersPanel filters={advanced} onChange={(f) => { setAdvanced(f); setPage(1); setFiltersOpen(false); }} onClose={() => setFiltersOpen(false)} />}

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={ScrollText} title="No delivery records found" description="Try adjusting search or filters." />
      ) : (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Delivered At</th>
                <th className="px-4 py-3">Read At</th>
                <th className="px-4 py-3">Failure Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/30 transition-colors">
                  <td className="px-4 py-3 text-xs font-semibold text-slate-200">{n.recipientName || '-'}</td>
                  <td className="px-4 py-3"><ChannelBadge channel={n.channel} /></td>
                  <td className="px-4 py-3"><StatusBadge status={n.status} /></td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{fmt(n.deliveredAt)}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{fmt(n.readAt)}</td>
                  <td className="px-4 py-3 text-[11px] text-rose-400">{n.failureReason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>{total} record(s)</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border border-slate-800 disabled:opacity-30 hover:border-indigo-500/30">Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border border-slate-800 disabled:opacity-30 hover:border-indigo-500/30">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
