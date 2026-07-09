'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, SlidersHorizontal, List, GitBranch as TimelineIcon, Download, ChevronDown, ScrollText } from 'lucide-react';
import { platformAuditApi, handleApiError } from '@/lib/api';
import type { AuditEventRowDTO, AuditListFilters, AuditListResponse } from '@/types/audit';
import AuditFiltersPanel from './AuditFiltersPanel';
import AuditLogsTable from './AuditLogsTable';
import AuditLogCardGrid from './AuditLogCardGrid';
import AuditTimelineView, { TimelineGroupBy } from './AuditTimelineView';
import SavedSearchesBar from './SavedSearchesBar';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import { exportAuditLogsCsv, exportAuditLogsExcel, exportAuditLogsJson, exportAuditLogsPdf } from '@/lib/auditExport';

type ViewMode = 'table' | 'timeline';
const PAGE_SIZES = [25, 50, 100];

export default function AuditLogsExplorer({ onSelectEvent, showToast }: { onSelectEvent: (row: AuditEventRowDTO) => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [filters, setFilters] = useState<AuditListFilters>({ page: 1, limit: 25 });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [list, setList] = useState<AuditListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [groupBy, setGroupBy] = useState<TimelineGroupBy>('category');
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search || ''), 350);
    return () => clearTimeout(t);
  }, [filters.search]);

  const load = useCallback(() => {
    setLoading(true);
    setErrorMsg('');
    platformAuditApi
      .list({ ...filters, search: debouncedSearch || undefined })
      .then(setList)
      .catch((err) => setErrorMsg(handleApiError(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.page, filters.limit, filters.category, filters.severity, filters.userId, filters.organizationId, filters.eventType, filters.status, filters.country, filters.browser, filters.os, filters.startDate, filters.endDate, filters.correlationId]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = list?.data ?? [];
  const page = list?.page ?? 1;
  const totalPages = list?.totalPages ?? 1;
  const total = list?.total ?? 0;
  const limit = filters.limit ?? 25;
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(total, page * limit);
  const hasAnyFilter = !!(filters.search || filters.category || filters.severity || filters.userId || filters.organizationId || filters.eventType || filters.status || filters.country || filters.browser || filters.os || filters.startDate || filters.endDate || filters.correlationId);

  const runExport = async (format: 'CSV' | 'EXCEL' | 'PDF' | 'JSON') => {
    setExportOpen(false);
    if (rows.length === 0) {
      showToast('Nothing to export.', 'error');
      return;
    }
    if (format === 'CSV') exportAuditLogsCsv(rows);
    else if (format === 'EXCEL') exportAuditLogsExcel(rows);
    else if (format === 'JSON') exportAuditLogsJson(rows);
    else exportAuditLogsPdf(rows);
    try {
      await platformAuditApi.recordExport({ format, filters, rowCount: rows.length });
      showToast(`Exported ${rows.length} event(s) as ${format}.`);
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };

  return (
    <div className="space-y-4">
      <SavedSearchesBar currentFilters={filters} onApply={(f) => setFilters((prev) => ({ ...prev, ...f, page: 1 }))} showToast={showToast} />

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={filters.search || ''}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
            placeholder="Search by user, organization, email, action, event, resource, IP, or request ID..."
            className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors"
          />
        </div>
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-bold transition-colors ${filtersOpen ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-[#0b101d] border-slate-800/80 text-slate-300 hover:border-indigo-500/30'}`}
        >
          <SlidersHorizontal size={14} /> Filters
        </button>
        <div className="flex items-center gap-0.5 bg-[#0b101d] border border-slate-800/80 rounded-xl p-0.5">
          <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`} title="Table view">
            <List size={14} />
          </button>
          <button onClick={() => setViewMode('timeline')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'timeline' ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`} title="Timeline view">
            <TimelineIcon size={14} />
          </button>
        </div>
        <div className="relative">
          <button onClick={() => setExportOpen((v) => !v)} className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-300 text-xs font-bold rounded-xl transition-colors">
            <Download size={14} /> Export <ChevronDown size={12} />
          </button>
          {exportOpen && (
            <div className="absolute right-0 mt-2 w-36 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-30 p-1.5 animate-fade-in">
              {(['CSV', 'EXCEL', 'PDF', 'JSON'] as const).map((f) => (
                <button key={f} onClick={() => runExport(f)} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition-colors">
                  Export {f}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {filtersOpen && <AuditFiltersPanel filters={filters} onChange={(f) => { setFilters(f); setFiltersOpen(false); }} onClose={() => setFiltersOpen(false)} />}

      {viewMode === 'timeline' && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Group By</span>
          {(['category', 'user', 'organization', 'none'] as const).map((g) => (
            <button key={g} onClick={() => setGroupBy(g)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${groupBy === g ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}>
              {g === 'none' ? 'None' : g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
      )}

      {errorMsg && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{errorMsg}</div>}

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={hasAnyFilter ? Search : ScrollText} title={hasAnyFilter ? 'No events match your filters' : 'No audit events yet'} description={hasAnyFilter ? 'Try adjusting or clearing your search and filters.' : 'Platform activity will appear here as it happens.'} />
      ) : viewMode === 'timeline' ? (
        <AuditTimelineView rows={rows} groupBy={groupBy} onSelect={onSelectEvent} />
      ) : (
        <>
          <AuditLogsTable rows={rows} onSelect={onSelectEvent} />
          <AuditLogCardGrid rows={rows} onSelect={onSelectEvent} />
          <AuditLogCardGrid rows={rows} onSelect={onSelectEvent} mobile />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-500">
                Showing <b className="text-slate-300">{rangeStart}–{rangeEnd}</b> of <b className="text-slate-300">{total}</b>
              </span>
              <select value={limit} onChange={(e) => setFilters((f) => ({ ...f, limit: Number(e.target.value), page: 1 }))} className="bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-400 outline-none cursor-pointer">
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, (f.page || 1) - 1) }))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-xs font-bold text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-30">
                Prev
              </button>
              <span className="text-[11px] font-bold text-slate-400 px-2">Page {page} / {totalPages}</span>
              <button onClick={() => setFilters((f) => ({ ...f, page: Math.min(totalPages, (f.page || 1) + 1) }))} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-xs font-bold text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-30">
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
