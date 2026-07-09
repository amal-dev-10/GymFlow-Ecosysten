'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, ShieldAlert, KeyRound, Lock, GitBranch } from 'lucide-react';
import { platformAuditApi, handleApiError } from '@/lib/api';
import type { AuditEventRowDTO, AuditListFilters, SecurityEventsResponse } from '@/types/audit';
import AuditLogsTable from './AuditLogsTable';
import AuditLogCardGrid from './AuditLogCardGrid';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

function KpiCard({ icon: Icon, label, value, tone }: { icon: typeof ShieldAlert; label: string; value: number; tone: string }) {
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

export default function SecurityEventsSection({ onSelectEvent }: { onSelectEvent: (row: AuditEventRowDTO) => void }) {
  const [filters, setFilters] = useState<AuditListFilters>({ page: 1, limit: 25 });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [data, setData] = useState<SecurityEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search || ''), 350);
    return () => clearTimeout(t);
  }, [filters.search]);

  const load = useCallback(() => {
    setLoading(true);
    platformAuditApi
      .getSecurityEvents({ ...filters, search: debouncedSearch || undefined })
      .then(setData)
      .catch((err) => setErrorMsg(handleApiError(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.page, filters.limit]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={KeyRound} label="Failed Logins (24h)" value={data?.stats.failedLogins ?? 0} tone="text-rose-300 bg-rose-500/10 border-rose-500/20" />
        <KpiCard icon={ShieldAlert} label="MFA Events (24h)" value={data?.stats.mfaEvents ?? 0} tone="text-amber-300 bg-amber-500/10 border-amber-500/20" />
        <KpiCard icon={Lock} label="Locked Accounts (24h)" value={data?.stats.lockedAccounts ?? 0} tone="text-orange-300 bg-orange-500/10 border-orange-500/20" />
        <KpiCard icon={GitBranch} label="Role Changes (24h)" value={data?.stats.roleChanges ?? 0} tone="text-indigo-300 bg-indigo-500/10 border-indigo-500/20" />
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        <input
          value={filters.search || ''}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
          placeholder="Search security events..."
          className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none"
        />
      </div>

      {errorMsg && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{errorMsg}</div>}

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={ShieldAlert} title="No security events" description="Failed logins, MFA resets, account lockouts and role changes will appear here." />
      ) : (
        <>
          <AuditLogsTable rows={rows} onSelect={onSelectEvent} />
          <AuditLogCardGrid rows={rows} onSelect={onSelectEvent} />
          <AuditLogCardGrid rows={rows} onSelect={onSelectEvent} mobile />

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500">Page {data?.page ?? 1} / {data?.totalPages ?? 1} · {data?.total ?? 0} events</span>
            <div className="flex gap-2">
              <button onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, (f.page || 1) - 1) }))} disabled={(data?.page ?? 1) <= 1} className="px-3 py-1.5 rounded-lg bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-xs font-bold text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-30">Prev</button>
              <button onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))} disabled={(data?.page ?? 1) >= (data?.totalPages ?? 1)} className="px-3 py-1.5 rounded-lg bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-xs font-bold text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-30">Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
