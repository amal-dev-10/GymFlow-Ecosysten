'use client';

import { useEffect, useState } from 'react';
import { DollarSign, AlertCircle, RefreshCw, FileText, Receipt } from 'lucide-react';
import { platformOrganizationsApi, handleApiError } from '@/lib/api';
import type { Org360Billing } from '@/types/org360';
import { SectionCard, TabLoading, EmptyRow, fmtDate, fmtDateTime, fmtMoney } from '../shared';

export default function BillingTab({ orgId, currency = 'USD' }: { orgId: string; currency?: string }) {
  const [data, setData] = useState<Org360Billing | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    setLoading(true);
    platformOrganizationsApi.getBilling(orgId).then(setData).catch((e) => setErr(handleApiError(e))).finally(() => setLoading(false));
  }, [orgId]);

  if (loading) return <TabLoading />;
  if (err) return <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{err}</div>;
  if (!data) return null;

  const s = data.summary;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Paid', value: fmtMoney(s.totalPaid, currency), icon: DollarSign, tone: 'text-emerald-400' },
          { label: 'Outstanding', value: fmtMoney(s.outstanding, currency), icon: AlertCircle, tone: s.outstanding > 0 ? 'text-rose-400' : 'text-slate-400' },
          { label: 'Invoices', value: String(s.invoiceCount), icon: FileText, tone: 'text-indigo-400' },
          { label: 'Failed Payments', value: String(s.failedPayments), icon: RefreshCw, tone: s.failedPayments > 0 ? 'text-rose-400' : 'text-slate-400' },
        ].map((c) => (
          <div key={c.label} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{c.label}</span>
              <c.icon size={14} className={c.tone} />
            </div>
            <span className="text-lg font-black text-slate-100 block mt-2">{c.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SectionCard title="Invoices" action={<Receipt size={14} className="text-slate-600" />}>
            {data.invoices.length === 0 ? (
              <EmptyRow text="No invoices on record." />
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-left min-w-[520px]">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-900/60">
                      <th className="px-1 py-2">Plan</th>
                      <th className="px-1 py-2">Amount</th>
                      <th className="px-1 py-2">Status</th>
                      <th className="px-1 py-2">Due</th>
                      <th className="px-1 py-2">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-slate-900/50 last:border-0">
                        <td className="px-1 py-2.5 text-xs text-slate-300">{inv.planName || '—'}</td>
                        <td className="px-1 py-2.5 text-xs font-bold text-slate-200">{fmtMoney(inv.amount, currency)}</td>
                        <td className="px-1 py-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${inv.status === 'Paid' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : inv.status === 'Unpaid' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}>{inv.status}</span>
                        </td>
                        <td className="px-1 py-2.5 text-[11px] text-slate-500">{fmtDate(inv.dueDate)}</td>
                        <td className="px-1 py-2.5 text-[11px] text-slate-500">{inv.paidAt ? fmtDate(inv.paidAt) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Billing Settings">
            <InfoLine label="Auto Renew" value={s.autoRenew ? 'Enabled' : 'Disabled'} />
            <InfoLine label="Tax Region" value={s.taxRegion} />
            <InfoLine label="Refunds" value={fmtMoney(s.refunds, currency)} />
          </SectionCard>

          <SectionCard title="Transaction History">
            {data.payments.length === 0 ? (
              <EmptyRow text="No transactions yet." />
            ) : (
              <div className="space-y-2">
                {data.payments.slice(0, 8).map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-300">{fmtMoney(p.amount, currency)}</span>
                      <span className="block text-[10px] text-slate-600">{p.method} · {fmtDateTime(p.createdAt)}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.status === 'Success' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'}`}>{p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-900/60 last:border-0">
      <span className="text-[11px] font-semibold text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-slate-200">{value}</span>
    </div>
  );
}
