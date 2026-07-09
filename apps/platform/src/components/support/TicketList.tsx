'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, Plus, X, UserCog, CheckCircle2, Trash2, Download, Inbox } from 'lucide-react';
import { platformSupportApi } from '@/lib/api';
import type { TicketListFilters, TicketRowDTO } from '@/types/support';
import { StatusBadge, PriorityBadge, SlaBadge } from './SupportBadges';
import TicketFiltersPanel from './TicketFiltersPanel';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TicketList({ canManage, showToast, onCreateTicket }: { canManage: boolean; showToast: (m: string, t?: 'success' | 'error') => void; onCreateTicket: () => void }) {
  const router = useRouter();
  const [filters, setFilters] = useState<TicketListFilters>({ page: 1, limit: 25 });
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rows, setRows] = useState<TicketRowDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    platformSupportApi
      .listTickets({ ...filters, search: search || undefined })
      .then((res) => {
        setRows(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch(() => showToast('Failed to load tickets.', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, search]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  };

  const runBulk = async (action: 'close' | 'delete' | 'export') => {
    if (action === 'export') {
      const header = 'Ticket,Subject,Organization,Priority,Status,Category,Created';
      const csvRows = rows.filter((r) => selected.has(r.id)).map((r) => [`#${r.ticketNumber}`, r.subject, r.organization?.name || '', r.priorityLabel, r.status, r.category || '', r.createdAt].join(','));
      const blob = new Blob([[header, ...csvRows].join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'support-tickets.csv';
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    setBusy(true);
    try {
      await platformSupportApi.bulkAction({ ticketIds: Array.from(selected), action });
      showToast(`${selected.size} ticket(s) ${action === 'close' ? 'closed' : 'deleted'}.`);
      setSelected(new Set());
      load();
    } catch {
      showToast('Bulk action failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const btn = 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors disabled:opacity-40';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tickets, organizations, ticket #..." className={inputClass} />
        </div>
        <button onClick={() => setFiltersOpen((v) => !v)} className="flex items-center gap-1.5 px-3 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors">
          <SlidersHorizontal size={13} /> Filters
        </button>
        {canManage && (
          <button onClick={onCreateTicket} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 rounded-xl text-xs font-bold text-indigo-300 transition-colors">
            <Plus size={13} /> New Ticket
          </button>
        )}
      </div>

      {filtersOpen && <TicketFiltersPanel filters={filters} onChange={(f) => { setFilters(f); setFiltersOpen(false); }} onClose={() => setFiltersOpen(false)} />}

      {selected.size > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 bg-[#0b101d]/95 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-3 shadow-2xl">
          <span className="flex items-center gap-2 text-xs font-bold text-indigo-300 pl-1">
            <span className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-[10px]">{selected.size}</span>
            selected
          </span>
          <div className="h-5 w-px bg-slate-800 mx-1" />
          {canManage && (
            <button disabled={busy} onClick={() => runBulk('close')} className={`${btn} bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/15`}>
              <CheckCircle2 size={13} /> Close
            </button>
          )}
          <button disabled={busy} onClick={() => runBulk('export')} className={`${btn} bg-slate-900 border-slate-800 text-slate-300 hover:border-indigo-500/30`}>
            <Download size={13} /> Export
          </button>
          {canManage && (
            <button disabled={busy} onClick={() => runBulk('delete')} className={`${btn} bg-slate-900 border-slate-800 text-slate-400 hover:text-rose-300 hover:border-rose-500/30`}>
              <Trash2 size={13} /> Delete
            </button>
          )}
          <button onClick={() => setSelected(new Set())} className="ml-auto flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors">
            <X size={12} /> Clear
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={Inbox} title="No tickets match your filters" description="Try adjusting search or filters, or create a new ticket." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 w-8"><input type="checkbox" checked={selected.size === rows.length} onChange={toggleSelectAll} className="accent-indigo-500" /></th>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">SLA Remaining</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} onClick={() => router.push(`/operations/support/tickets/${t.id}`)} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/30 cursor-pointer transition-colors">
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} className="accent-indigo-500" /></td>
                    <td className="px-4 py-3">
                      <span className="block text-[10px] font-bold text-slate-500">#{t.ticketNumber}</span>
                      <span className="block text-xs font-bold text-slate-200 truncate max-w-[220px]">{t.subject}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{t.organization?.name || '-'}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">{t.category || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{t.assignedEngineerName || <span className="text-slate-600">Unassigned</span>}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">{fmtDate(t.createdAt)}</td>
                    <td className="px-4 py-3"><SlaBadge minutesRemaining={t.sla.minutesRemaining} band={t.sla.band} isClosed={t.sla.isClosed} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tablet/mobile cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-3">
            {rows.map((t) => (
              <div key={t.id} onClick={() => router.push(`/operations/support/tickets/${t.id}`)} className="bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold text-slate-500">#{t.ticketNumber} · {t.organization?.name}</span>
                    <span className="block text-xs font-bold text-slate-200 truncate">{t.subject}</span>
                  </div>
                  <UserCog size={14} className="text-slate-600 shrink-0" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  <StatusBadge status={t.status} />
                  <PriorityBadge priority={t.priority} />
                  <SlaBadge minutesRemaining={t.sla.minutesRemaining} band={t.sla.band} isClosed={t.sla.isClosed} />
                </div>
                <div className="mt-3 pt-3 border-t border-slate-900/60 flex items-center justify-between text-[10px] text-slate-500">
                  <span>{t.assignedEngineerName || 'Unassigned'}</span>
                  <span>{fmtDate(t.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>{total} ticket(s)</span>
          <div className="flex items-center gap-2">
            <button disabled={(filters.page || 1) <= 1} onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))} className="px-3 py-1.5 rounded-lg border border-slate-800 disabled:opacity-30 hover:border-indigo-500/30">Prev</button>
            <span>Page {filters.page || 1} of {totalPages}</span>
            <button disabled={(filters.page || 1) >= totalPages} onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))} className="px-3 py-1.5 rounded-lg border border-slate-800 disabled:opacity-30 hover:border-indigo-500/30">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
