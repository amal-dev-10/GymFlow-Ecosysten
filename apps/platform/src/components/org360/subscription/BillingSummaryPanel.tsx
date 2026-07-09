'use client';

import { useMemo, useState } from 'react';
import { Search, Receipt, RotateCcw, FileText } from 'lucide-react';
import { SectionCard, EmptyRow, fmtDate, fmtMoney } from '../shared';
import type { Org360Invoice } from '@/types/org360';

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';

interface Props {
  invoices: Org360Invoice[];
  currency: string;
  canManage: boolean;
  onGenerateInvoice: () => void;
  onRefund: (paymentId: string, maxAmount: number) => void;
}

export default function BillingSummaryPanel({ invoices, currency, canManage, onGenerateInvoice, onRefund }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return invoices;
    const q = search.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.status.toLowerCase().includes(q) ||
        String(inv.amount).includes(q) ||
        (inv.description || '').toLowerCase().includes(q) ||
        (inv.payments || []).some((p) => p.method.toLowerCase().includes(q) || p.status.toLowerCase().includes(q)),
    );
  }, [invoices, search]);

  const outstanding = invoices.filter((i) => i.status === 'Unpaid').reduce((s, i) => s + i.amount, 0);
  const failedCount = invoices.reduce((s, i) => s + (i.payments || []).filter((p) => p.status === 'Failed').length, 0);
  const refundedTotal = invoices.reduce((s, i) => s + (i.payments || []).reduce((ps, p) => ps + (p.refundedAmount || 0), 0), 0);

  return (
    <SectionCard
      title="Billing"
      action={
        canManage && (
          <button onClick={onGenerateInvoice} className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300">
            <FileText size={11} /> Generate Invoice
          </button>
        )
      }
    >
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-850 text-center">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Outstanding</span>
          <span className={`text-sm font-black block ${outstanding > 0 ? 'text-rose-400' : 'text-slate-200'}`}>{fmtMoney(outstanding, currency)}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-850 text-center">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Failed Attempts</span>
          <span className={`text-sm font-black block ${failedCount > 0 ? 'text-rose-400' : 'text-slate-200'}`}>{failedCount}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-850 text-center">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Refunded</span>
          <span className="text-sm font-black text-slate-200 block">{fmtMoney(refundedTotal, currency)}</span>
        </div>
      </div>

      <div className="relative mb-3">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices, payments, transactions..." className={inputClass} />
      </div>

      {filtered.length === 0 ? (
        <EmptyRow text={search ? 'No matching invoices or payments.' : 'No invoices yet.'} />
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
          {filtered.map((inv) => (
            <div key={inv.id} className="p-3 rounded-xl bg-slate-900/40 border border-slate-850">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt size={13} className="text-slate-600" />
                  <span className="text-xs font-bold text-slate-200">{fmtMoney(inv.amount, currency)}</span>
                  {inv.description && <span className="text-[10px] text-slate-500">· {inv.description}</span>}
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    inv.status === 'Paid' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : inv.status === 'Unpaid' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-slate-400 bg-slate-500/10 border-slate-500/20'
                  }`}
                >
                  {inv.status}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-slate-600">Due {fmtDate(inv.dueDate)}{inv.paidAt ? ` · Paid ${fmtDate(inv.paidAt)}` : ''}</span>
              </div>
              {(inv.payments || []).map((p) => (
                <div key={p.id} className="flex items-center justify-between mt-2 pt-2 border-t border-slate-900/60">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${p.status === 'Success' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : p.status === 'Failed' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-amber-300 bg-amber-500/10 border-amber-500/20'}`}>
                      {p.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-500">{p.method}</span>
                    {p.refundedAmount ? <span className="text-[10px] text-amber-400">refunded {fmtMoney(p.refundedAmount, currency)}</span> : null}
                  </div>
                  {canManage && p.status === 'Success' && !p.refundedAmount && (
                    <button onClick={() => onRefund(p.id, p.amount)} className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-amber-400 transition-colors">
                      <RotateCcw size={10} /> Refund
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
