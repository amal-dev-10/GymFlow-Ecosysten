'use client';

import { useCallback, useEffect, useState } from 'react';
import { Webhook, Gauge, XCircle, Zap } from 'lucide-react';
import { platformAuditApi } from '@/lib/api';
import type { ApiActivityResponse } from '@/types/audit';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

function KpiCard({ icon: Icon, label, value, tone }: { icon: typeof Webhook; label: string; value: string; tone: string }) {
  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${tone}`}><Icon size={16} /></div>
      <div>
        <span className="text-lg font-black text-slate-100 block">{value}</span>
        <span className="text-[10px] text-slate-500">{label}</span>
      </div>
    </div>
  );
}

function methodColor(method: string) {
  if (method === 'GET') return 'text-sky-300 bg-sky-500/10 border-sky-500/20';
  if (method === 'POST') return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20';
  if (method === 'PUT' || method === 'PATCH') return 'text-amber-300 bg-amber-500/10 border-amber-500/20';
  if (method === 'DELETE') return 'text-rose-300 bg-rose-500/10 border-rose-500/20';
  return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
}

function statusColor(status: number) {
  if (status >= 500) return 'text-rose-400';
  if (status >= 400) return 'text-amber-400';
  return 'text-emerald-400';
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString();
}

export default function ApiActivitySection() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    platformAuditApi.getApiActivity({ page, limit: 25 }).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={Webhook} label="Requests (24h)" value={String(data?.stats.requestCount ?? 0)} tone="text-indigo-300 bg-indigo-500/10 border-indigo-500/20" />
        <KpiCard icon={XCircle} label="Failed Requests (24h)" value={String(data?.stats.failedRequests ?? 0)} tone="text-rose-300 bg-rose-500/10 border-rose-500/20" />
        <KpiCard icon={Gauge} label="Avg Response Time" value={`${data?.stats.avgResponseTimeMs ?? 0}ms`} tone="text-cyan-300 bg-cyan-500/10 border-cyan-500/20" />
        <KpiCard icon={Zap} label="API Keys Used" value="Platform Session" tone="text-violet-300 bg-violet-500/10 border-violet-500/20" />
      </div>

      {data && data.stats.topEndpoints.length > 0 && (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Top Endpoints (24h)</p>
          <div className="flex flex-wrap gap-2">
            {data.stats.topEndpoints.map((e) => (
              <span key={e.path} className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 bg-slate-900 border border-slate-850 px-2.5 py-1.5 rounded-full">
                {e.path} <span className="text-slate-600">×{e.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={Webhook} title="No API activity yet" description="Every request across the platform is captured here in real time." />
      ) : (
        <>
          <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Endpoint</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Response Time</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/20">
                    <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${methodColor(r.method)}`}>{r.method}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-300 font-mono">{r.path}</td>
                    <td className={`px-4 py-2.5 text-xs font-bold ${statusColor(r.statusCode)}`}>{r.statusCode}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{r.responseTimeMs}ms</td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{r.actorName || 'Unauthenticated'}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">{r.ipAddress || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500">Page {data?.page ?? 1} / {data?.totalPages ?? 1} · {data?.total ?? 0} requests</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-xs font-bold text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-30">Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= (data?.totalPages ?? 1)} className="px-3 py-1.5 rounded-lg bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-xs font-bold text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-30">Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
