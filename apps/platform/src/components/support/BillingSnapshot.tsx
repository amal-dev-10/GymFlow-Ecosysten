'use client';

import { Receipt } from 'lucide-react';
import type { BillingSnapshotDTO } from '@/types/support';

const STATUS_TONE: Record<string, string> = { Paid: 'text-emerald-400', Unpaid: 'text-rose-400', Void: 'text-slate-500' };

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString();
}

export default function BillingSnapshot({ billing }: { billing: BillingSnapshotDTO }) {
  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 space-y-2">
      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200"><Receipt size={13} className="text-amber-400" /> Billing</span>
      {billing.invoices.length === 0 ? (
        <p className="text-[11px] text-slate-600">No invoices found.</p>
      ) : (
        <div className="space-y-1.5">
          {billing.invoices.slice(0, 4).map((inv) => (
            <div key={inv.id} className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{fmtDate(inv.dueDate)}</span>
              <span className="text-slate-300">${inv.amount.toFixed(2)}</span>
              <span className={`font-bold ${STATUS_TONE[inv.status] || 'text-slate-400'}`}>{inv.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
