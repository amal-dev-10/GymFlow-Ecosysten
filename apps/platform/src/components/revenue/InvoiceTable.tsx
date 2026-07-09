'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, FileText, SlidersHorizontal } from 'lucide-react';
import { platformRevenueApi } from '@/lib/api';
import type { InvoiceRowDTO, RevenueListFilters } from '@/types/revenue';
import { InvoiceStatusBadge } from './InvoiceBadges';
import GenerateInvoiceModal from './GenerateInvoiceModal';
import RevenueFiltersPanel from './RevenueFiltersPanel';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const fmtCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '-');

export default function InvoiceTable({ canManage, showToast }: { canManage: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [advanced, setAdvanced] = useState<RevenueListFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rows, setRows] = useState<InvoiceRowDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const filters: RevenueListFilters = { page, limit: 25, search: search || undefined, status: status || undefined, overdueOnly: overdueOnly ? 'true' : undefined, startDate: advanced.startDate, endDate: advanced.endDate, planId: advanced.planId };
    platformRevenueApi
      .listInvoices(filters)
      .then((res) => { setRows(res.data); setTotal(res.total); setTotalPages(res.totalPages); })
      .catch(() => showToast('Failed to load invoices.', 'error'))
      .finally(() => setLoading(false));
  }, [page, search, status, overdueOnly, advanced, showToast]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice ID or organization..." className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-[#0b101d] border border-slate-800/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none cursor-pointer">
          <option value="">All Statuses</option>
          {['Draft', 'Unpaid', 'Paid', 'Void', 'Refunded'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => setOverdueOnly((v) => !v)} className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${overdueOnly ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200'}`}>
          Overdue Only
        </button>
        <button onClick={() => setFiltersOpen((v) => !v)} className="flex items-center gap-1.5 px-3 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors">
          <SlidersHorizontal size={13} /> Filters
        </button>
        {canManage && (
          <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 rounded-xl text-xs font-bold text-indigo-300 transition-colors">
            <Plus size={13} /> Generate Invoice
          </button>
        )}
      </div>

      {filtersOpen && <RevenueFiltersPanel filters={advanced} onChange={(f) => { setAdvanced(f); setPage(1); setFiltersOpen(false); }} onClose={() => setFiltersOpen(false)} />}

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={FileText} title="No invoices found" description="Try adjusting search or filters." />
      ) : (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Tax</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Paid Date</th>
                <th className="px-4 py-3">Method</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => (
                <tr key={inv.id} onClick={() => router.push(`/organizations/${inv.organizationId}?tab=billing`)} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/30 cursor-pointer transition-colors">
                  <td className="px-4 py-3 text-[11px] font-mono text-slate-500">#{inv.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-200">{inv.organizationName}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{inv.planName}</td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-200">{fmtCurrency(inv.amount)}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{inv.taxAmount != null ? fmtCurrency(inv.taxAmount) : '-'}</td>
                  <td className="px-4 py-3"><InvoiceStatusBadge status={inv.derivedStatus} /></td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{fmtDate(inv.dueDate)}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{fmtDate(inv.paidAt)}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500 capitalize">{inv.paymentMethod || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>{total} invoice(s)</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border border-slate-800 disabled:opacity-30 hover:border-indigo-500/30">Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border border-slate-800 disabled:opacity-30 hover:border-indigo-500/30">Next</button>
          </div>
        </div>
      )}

      {createOpen && (
        <GenerateInvoiceModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); showToast('Invoice generated.'); load(); }}
        />
      )}
    </div>
  );
}
