'use client';

import { useCallback, useEffect, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { platformRevenueApi } from '@/lib/api';
import type { RefundRowDTO } from '@/types/revenue';
import { PaymentStatusBadge } from './InvoiceBadges';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const fmtCurrency = (n: number | null) => (n == null ? '-' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n));
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleString() : '-');
const GATEWAY_LABEL: Record<string, string> = { stripe: 'Stripe', razorpay: 'Razorpay', paddle: 'Paddle', lemon_squeezy: 'Lemon Squeezy', manual: 'Manual' };

export default function RefundCenter() {
  const [rows, setRows] = useState<RefundRowDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    platformRevenueApi.listRefunds({ page, limit: 25 }).then((res) => { setRows(res.data); setTotal(res.total); setTotalPages(res.totalPages); }).finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={Undo2} title="No refunds issued" description="Refunds issued from the Payments tab will appear here." />
      ) : (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Refund Amount</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Processed By</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Gateway</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/30 transition-colors">
                  <td className="px-4 py-3 text-xs font-semibold text-slate-200">{r.organizationName}</td>
                  <td className="px-4 py-3 text-xs font-bold text-rose-300">{fmtCurrency(r.refundAmount)}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500 max-w-[220px] truncate">{r.reason || '-'}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-400">{r.processedBy || '-'}</td>
                  <td className="px-4 py-3"><PaymentStatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{GATEWAY_LABEL[r.gateway] || r.gateway}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{fmtDate(r.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>{total} refund(s)</span>
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
