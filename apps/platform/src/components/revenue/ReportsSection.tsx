'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, FileBarChart } from 'lucide-react';
import { platformRevenueApi } from '@/lib/api';
import { exportRevenueCsv, exportRevenueExcel, exportRevenuePdf, type ExportColumn } from '@/lib/revenueExport';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const REPORT_TYPES = [
  { id: 'by-month', label: 'Revenue by Month' },
  { id: 'by-country', label: 'Revenue by Country' },
  { id: 'by-plan', label: 'Revenue by Plan' },
  { id: 'by-sales-channel', label: 'Revenue by Sales Channel' },
  { id: 'gateway-summary', label: 'Payment Gateway Summary' },
  { id: 'outstanding-invoices', label: 'Outstanding Invoices' },
] as const;

const fmtCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

function columnsFor(reportType: string): ExportColumn<any>[] {
  switch (reportType) {
    case 'by-month': return [{ header: 'Month', get: (r) => r.month }, { header: 'Revenue', get: (r) => r.value }];
    case 'by-country': return [{ header: 'Country', get: (r) => r.country }, { header: 'Revenue', get: (r) => r.value }];
    case 'by-plan': return [{ header: 'Plan', get: (r) => r.plan }, { header: 'Revenue', get: (r) => r.value }];
    case 'by-sales-channel': return [{ header: 'Channel', get: (r) => r.channel }, { header: 'MRR', get: (r) => r.value }];
    case 'gateway-summary': return [{ header: 'Gateway', get: (r) => r.gateway }, { header: 'Revenue', get: (r) => r.value }];
    case 'outstanding-invoices': return [{ header: 'Organization', get: (r) => r.organizationName }, { header: 'Amount', get: (r) => r.amount }, { header: 'Due Date', get: (r) => new Date(r.dueDate).toLocaleDateString() }, { header: 'Overdue', get: (r) => (r.overdue ? `${r.daysOverdue}d` : 'No') }];
    default: return [];
  }
}

export default function ReportsSection({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [reportType, setReportType] = useState<(typeof REPORT_TYPES)[number]['id']>('by-month');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    platformRevenueApi.getReport(reportType).then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  }, [reportType]);

  useEffect(() => { load(); }, [load]);

  const columns = columnsFor(reportType);
  const label = REPORT_TYPES.find((r) => r.id === reportType)?.label || reportType;

  const doExport = async (format: 'CSV' | 'EXCEL' | 'PDF') => {
    if (format === 'CSV') exportRevenueCsv(reportType, columns, rows);
    if (format === 'EXCEL') exportRevenueExcel(reportType, columns, rows);
    if (format === 'PDF') exportRevenuePdf(label, columns, rows);
    try {
      await platformRevenueApi.recordExport({ format, rowCount: rows.length });
      showToast(`${label} exported as ${format}.`);
    } catch {
      showToast('Export recorded locally, but the server export log failed.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {REPORT_TYPES.map((r) => (
          <button
            key={r.id}
            onClick={() => setReportType(r.id)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${reportType === r.id ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200'}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => doExport('CSV')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-400 hover:text-indigo-300 border border-slate-850 hover:border-indigo-500/30 transition-colors"><Download size={11} /> CSV</button>
        <button onClick={() => doExport('EXCEL')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-400 hover:text-indigo-300 border border-slate-850 hover:border-indigo-500/30 transition-colors"><Download size={11} /> Excel</button>
        <button onClick={() => doExport('PDF')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-400 hover:text-indigo-300 border border-slate-850 hover:border-indigo-500/30 transition-colors"><Download size={11} /> PDF</button>
      </div>

      {loading ? (
        <div className="h-64 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={FileBarChart} title="No data for this report" />
      ) : (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {columns.map((c) => <th key={c.header} className="px-4 py-3">{c.header}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-900/60 last:border-0">
                  {columns.map((c) => (
                    <td key={c.header} className="px-4 py-3 text-xs text-slate-300">
                      {typeof c.get(r) === 'number' && c.header.toLowerCase().includes('revenue') ? fmtCurrency(c.get(r) as number) : c.get(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
