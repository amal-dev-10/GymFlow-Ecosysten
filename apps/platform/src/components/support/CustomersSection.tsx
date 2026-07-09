'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building2, ExternalLink, Plus } from 'lucide-react';
import { platformOrganizationsApi } from '@/lib/api';
import type { OrganizationRowDTO } from '@/types/organizations';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const HEALTH_TONE: Record<string, string> = { HEALTHY: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', WARNING: 'text-amber-400 bg-amber-500/10 border-amber-500/20', CRITICAL: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };

export default function CustomersSection({ onCreateTicketFor }: { onCreateTicketFor: (organizationId: string) => void }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<OrganizationRowDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    platformOrganizationsApi.list({ search: search || undefined, limit: 30 } as any).then((res: any) => setRows(res.data || [])).catch(() => setRows([])).finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search organizations by name..." className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={Building2} title="No organizations found" description="Try a different search." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((o) => (
            <div key={o.id} className="bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-100 truncate">{o.name}</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">{o.plan?.name || 'No plan'} · {o.usage.members.used} members</span>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${HEALTH_TONE[o.health.band] || HEALTH_TONE.WARNING}`}>{o.health.score}</span>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-900/60">
                <button onClick={() => router.push(`/organizations/${o.id}`)} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-indigo-300 transition-colors">
                  <ExternalLink size={10} /> Org 360
                </button>
                <button onClick={() => onCreateTicketFor(o.id)} className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 hover:text-indigo-200 transition-colors ml-auto">
                  <Plus size={10} /> New Ticket
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
