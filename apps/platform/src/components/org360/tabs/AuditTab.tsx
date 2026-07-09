'use client';

import { useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';
import { platformOrganizationsApi, handleApiError } from '@/lib/api';
import type { Org360AuditPage } from '@/types/org360';
import { SectionCard, TabLoading, EmptyRow, fmtDateTime } from '../shared';

const selectClass = 'bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none transition-colors cursor-pointer';

export default function AuditTab({ orgId }: { orgId: string }) {
  const [page, setPage] = useState<Org360AuditPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('');
  const [pageNum, setPageNum] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    platformOrganizationsApi
      .getAudit(orgId, { search: debounced || undefined, category: category || undefined, page: pageNum, limit: 20 })
      .then(setPage)
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, [orgId, debounced, category, pageNum]);

  return (
    <SectionCard title="Audit Logs">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPageNum(1); }}
            placeholder="Search audit events..."
            className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none"
          />
        </div>
        <select className={selectClass} value={category} onChange={(e) => { setCategory(e.target.value); setPageNum(1); }}>
          <option value="">All Categories</option>
          {(page?.categories || []).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <TabLoading />
      ) : !page || page.data.length === 0 ? (
        <EmptyRow text="No audit events match." />
      ) : (
        <>
          <div className="space-y-2">
            {page.data.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-850">
                <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0 mt-0.5"><ScrollText size={13} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-200">{log.action}</span>
                    <span className="text-[10px] text-slate-600 shrink-0">{fmtDateTime(log.createdAt)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 break-words">{log.details}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {log.eventCategory && <span className="text-[9px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded-full">{log.eventCategory}</span>}
                    <span className="text-[10px] text-slate-600">by {log.user}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4">
            <span className="text-[11px] text-slate-500">Page {page.page} / {page.totalPages || 1} · {page.total} events</span>
            <div className="flex gap-2">
              <button onClick={() => setPageNum((p) => Math.max(1, p - 1))} disabled={page.page <= 1} className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-30"><ChevronLeft size={14} /></button>
              <button onClick={() => setPageNum((p) => p + 1)} disabled={page.page >= page.totalPages} className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-30"><ChevronRight size={14} /></button>
            </div>
          </div>
        </>
      )}
    </SectionCard>
  );
}
