'use client';

import { useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';
import { platformRolesApi } from '@/lib/api';
import type { AuditLogListResponse } from '@/types/roles';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString();
}

const EVENT_TYPES = [
  { value: 'PLATFORM_ROLE_CREATED', label: 'Role Created' },
  { value: 'PLATFORM_ROLE_UPDATED', label: 'Role Updated' },
  { value: 'PLATFORM_ROLE_PERMISSIONS_CHANGED', label: 'Permission Changed' },
  { value: 'PLATFORM_ROLE_ASSIGNED', label: 'Role Assigned' },
  { value: 'PLATFORM_ROLE_UNASSIGNED', label: 'Role Removed' },
  { value: 'PLATFORM_ROLE_DELETED', label: 'Role Deleted' },
  { value: 'PLATFORM_TEMP_ACCESS_GRANTED', label: 'Temporary Access Granted' },
  { value: 'PLATFORM_TEMP_ACCESS_EXPIRED', label: 'Temporary Access Expired' },
  { value: 'PLATFORM_TEMP_ACCESS_REVOKED', label: 'Temporary Access Revoked' },
];

export default function RolesAuditHistory() {
  const [page, setPage] = useState<AuditLogListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [eventType, setEventType] = useState('');
  const [pageNum, setPageNum] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    platformRolesApi
      .getAuditHistory({ search: debounced || undefined, eventType: eventType || undefined, page: pageNum, limit: 20 })
      .then(setPage)
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, [debounced, eventType, pageNum]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPageNum(1); }}
            placeholder="Search audit events..."
            className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none"
          />
        </div>
        <select value={eventType} onChange={(e) => { setEventType(e.target.value); setPageNum(1); }} className="bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none cursor-pointer">
          <option value="">All Event Types</option>
          {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : !page || page.data.length === 0 ? (
        <PlatformEmptyState icon={ScrollText} title="No audit events" description="Role, permission and access changes will appear here as they happen." />
      ) : (
        <>
          <div className="space-y-2">
            {page.data.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-[#0b101d] border border-slate-800/80">
                <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0 mt-0.5"><ScrollText size={13} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-200">{log.action}</span>
                    <span className="text-[10px] text-slate-600 shrink-0">{fmtDateTime(log.createdAt)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 break-words">{log.details}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {log.eventType && <span className="text-[9px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded-full">{log.eventType}</span>}
                    <span className="text-[10px] text-slate-600">by {log.user}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Page {page.page} / {page.totalPages || 1} · {page.total} events</span>
            <div className="flex gap-2">
              <button onClick={() => setPageNum((p) => Math.max(1, p - 1))} disabled={page.page <= 1} className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-30"><ChevronLeft size={14} /></button>
              <button onClick={() => setPageNum((p) => p + 1)} disabled={page.page >= page.totalPages} className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-30"><ChevronRight size={14} /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
