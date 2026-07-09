'use client';

import { useEffect, useState } from 'react';
import { Landmark, Download } from 'lucide-react';
import { platformRevenueApi } from '@/lib/api';
import type { TaxSummaryDTO } from '@/types/revenue';
import { exportRevenueCsv } from '@/lib/revenueExport';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const fmtCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export default function TaxesSection({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [data, setData] = useState<TaxSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformRevenueApi.getTaxSummary().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  const exportByCountry = () => {
    if (!data) return;
    exportRevenueCsv('tax-by-country', [{ header: 'Country', get: (r: { country: string; taxCollected: number }) => r.country }, { header: 'Tax Collected', get: (r) => r.taxCollected }], data.byCountry);
    platformRevenueApi.recordExport({ format: 'CSV', rowCount: data.byCountry.length }).catch(() => undefined);
    showToast('Tax report exported.');
  };

  if (loading || !data) return <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>;

  if (data.byType.length === 0) {
    return <PlatformEmptyState icon={Landmark} title="No tax data yet" description="Tax is collected on invoices with a country-derived rate (India → GST, EU → VAT, US/Canada → Sales Tax)." />;
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Tax Collected</span>
        <span className="block text-2xl font-black text-slate-100 mt-1">{fmtCurrency(data.totalTaxCollected)}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {data.byType.map((t) => (
          <div key={t.type} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t.type}</span>
            <span className="block text-lg font-black text-slate-100 mt-1">{fmtCurrency(t.taxCollected)}</span>
            <span className="text-[10px] text-slate-600">{t.invoiceCount} invoice(s)</span>
          </div>
        ))}
      </div>

      <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-850 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200">Tax by Country</span>
          <button onClick={exportByCountry} className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 hover:text-indigo-200"><Download size={11} /> Export CSV</button>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Tax Collected</th>
            </tr>
          </thead>
          <tbody>
            {data.byCountry.map((c) => (
              <tr key={c.country} className="border-b border-slate-900/60 last:border-0">
                <td className="px-4 py-3 text-xs text-slate-300">{c.country}</td>
                <td className="px-4 py-3 text-xs font-bold text-slate-200">{fmtCurrency(c.taxCollected)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
