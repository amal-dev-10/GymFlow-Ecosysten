'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, CreditCard, RefreshCw, Undo2, Loader2 } from 'lucide-react';
import { platformRevenueApi } from '@/lib/api';
import type { PaymentRowDTO, RevenueListFilters } from '@/types/revenue';
import { PaymentStatusBadge } from './InvoiceBadges';
import IssueRefundModal from './IssueRefundModal';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const fmtCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleString();
const GATEWAY_LABEL: Record<string, string> = { stripe: 'Stripe', razorpay: 'Razorpay', paddle: 'Paddle', lemon_squeezy: 'Lemon Squeezy', manual: 'Manual' };

export default function PaymentTable({ canManage, showToast }: { canManage: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [gateway, setGateway] = useState('');
  const [rows, setRows] = useState<PaymentRowDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [refunding, setRefunding] = useState<PaymentRowDTO | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const filters: RevenueListFilters = { page, limit: 25, search: search || undefined, status: status || undefined, gateway: gateway || undefined };
    platformRevenueApi
      .listPayments(filters)
      .then((res) => { setRows(res.data); setTotal(res.total); setTotalPages(res.totalPages); })
      .catch(() => showToast('Failed to load payments.', 'error'))
      .finally(() => setLoading(false));
  }, [page, search, status, gateway, showToast]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  const retry = async (p: PaymentRowDTO) => {
    setRetryingId(p.id);
    try {
      await platformRevenueApi.retryPayment(p.id, p.organizationId);
      showToast('Payment retried successfully.');
      load();
    } catch {
      showToast('Retry failed.', 'error');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search payment ID, transaction ID, organization..." className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-[#0b101d] border border-slate-800/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none cursor-pointer">
          <option value="">All Statuses</option>
          {['Success', 'Failed', 'Refunded', 'Disputed'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={gateway} onChange={(e) => setGateway(e.target.value)} className="bg-[#0b101d] border border-slate-800/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none cursor-pointer">
          <option value="">All Gateways</option>
          {Object.entries(GATEWAY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={CreditCard} title="No payments found" description="Try adjusting search or filters." />
      ) : (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Gateway</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Transaction ID</th>
                <th className="px-4 py-3">Created</th>
                {canManage && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/30 transition-colors">
                  <td className="px-4 py-3 text-[11px] font-mono text-slate-500">#{p.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-200">{p.organizationName}</td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-200">{fmtCurrency(p.amount)}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{GATEWAY_LABEL[p.gateway] || p.gateway}</td>
                  <td className="px-4 py-3"><PaymentStatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-[11px] font-mono text-slate-600 truncate max-w-[160px]">{p.transactionId || '-'}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{fmtDate(p.createdAt)}</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.status === 'Failed' && (
                          <button disabled={retryingId === p.id} onClick={() => retry(p)} className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 hover:text-indigo-200">
                            {retryingId === p.id ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Retry
                          </button>
                        )}
                        {p.status === 'Success' && (
                          <button onClick={() => setRefunding(p)} className="flex items-center gap-1 text-[10px] font-bold text-rose-300 hover:text-rose-200">
                            <Undo2 size={11} /> Refund
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>{total} payment(s)</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border border-slate-800 disabled:opacity-30 hover:border-indigo-500/30">Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border border-slate-800 disabled:opacity-30 hover:border-indigo-500/30">Next</button>
          </div>
        </div>
      )}

      {refunding && (
        <IssueRefundModal
          paymentId={refunding.id}
          organizationId={refunding.organizationId}
          organizationName={refunding.organizationName}
          maxAmount={refunding.amount}
          onClose={() => setRefunding(null)}
          onDone={() => { setRefunding(null); showToast('Refund issued.'); load(); }}
        />
      )}
    </div>
  );
}
