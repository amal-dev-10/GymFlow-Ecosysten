'use client';

import { useEffect, useState } from 'react';
import { ScrollText, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { platformAuditApi } from '@/lib/api';
import type { AuditEventRowDTO } from '@/types/audit';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const fmt = (iso: string) => new Date(iso).toLocaleString();

// Reuses the Audit Center's own AuditLog query rather than a second audit
// trail - every settings save/reset/import writes eventCategory:
// 'Configuration' via AuditLogsService.logEvent(), the same choke point
// every other module in this codebase writes through.
export default function SettingsAuditHistoryPanel() {
  const router = useRouter();
  const [rows, setRows] = useState<AuditEventRowDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 'Configuration' is shared with pre-existing, unrelated per-organization
    // config edits (e.g. facility/location updates) that already wrote this
    // free-form category before PLT-015 existed - narrow to this module's
    // own eventType prefix so this tab only shows Global Settings actions.
    platformAuditApi
      .list({ category: 'Configuration', limit: 100, sortDir: 'desc' })
      .then((res) => setRows(res.data.filter((r) => r.eventType?.startsWith('GLOBAL_SETTINGS'))))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500">Every settings change, reset and import - sourced live from the Audit Center.</p>
        <button onClick={() => router.push('/operations/audit-logs?section=logs')} className="flex items-center gap-1 text-[11px] font-bold text-indigo-300 hover:text-indigo-200">
          Open in Audit Center <ExternalLink size={11} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={ScrollText} title="No settings changes yet" description="Actions taken in Global Settings will appear here." />
      ) : (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">By</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/30 transition-colors">
                  <td className="px-4 py-3 text-xs font-semibold text-slate-200">{r.action}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500 max-w-md truncate">{r.details}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-400">{r.user}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-600">{fmt(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
