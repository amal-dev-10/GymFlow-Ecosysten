'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpCircle, X } from 'lucide-react';
import { platformSupportApi } from '@/lib/api';
import type { EscalationDTO } from '@/types/support';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString();
}

const LEVEL_TONE: Record<string, string> = {
  Support: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
  Engineering: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
  Operations: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
  Finance: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  'Platform Admin': 'text-amber-300 bg-amber-500/10 border-amber-500/20',
};

export default function EscalationsSection({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const router = useRouter();
  const [status, setStatus] = useState<'' | 'Open' | 'Resolved'>('Open');
  const [rows, setRows] = useState<EscalationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<EscalationDTO | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    platformSupportApi.listEscalations({ status: status || undefined, limit: 50 }).then((res) => setRows(res.data)).catch(() => setRows([])).finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(['Open', 'Resolved', ''] as const).map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatus(s)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${status === s ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={ArrowUpCircle} title="No escalations" description="Escalated tickets will appear here, tracked through the Support → Engineering → Operations → Finance → Platform Admin ladder." />
      ) : (
        <div className="space-y-2">
          {rows.map((e) => (
            <div key={e.id} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <button onClick={() => router.push(`/operations/support/tickets/${e.ticketId}`)} className="text-xs font-bold text-slate-200 hover:text-indigo-300 truncate">
                    #{e.ticket?.ticketNumber} {e.ticket?.subject}
                  </button>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${LEVEL_TONE[e.fromLevel] || LEVEL_TONE.Support}`}>{e.fromLevel}</span>
                    <span className="text-slate-600">→</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${LEVEL_TONE[e.toLevel] || LEVEL_TONE.Support}`}>{e.toLevel}</span>
                    {e.ticket?.organization?.name && <span className="text-[10px] text-slate-600">· {e.ticket.organization.name}</span>}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">{e.reason}</p>
                  {e.resolution && <p className="text-[11px] text-emerald-400 mt-1">Resolution: {e.resolution}</p>}
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${e.status === 'Open' ? 'text-orange-300 bg-orange-500/10 border-orange-500/20' : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'}`}>{e.status}</span>
                  <p className="text-[10px] text-slate-600 mt-1.5">{fmtDateTime(e.createdAt)}</p>
                  {e.status === 'Open' && (
                    <button onClick={() => setResolving(e)} className="mt-2 text-[10px] font-bold text-indigo-300 hover:text-indigo-200">Resolve</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolving && (
        <ResolveEscalationModal
          escalation={resolving}
          onClose={() => setResolving(null)}
          onDone={() => { setResolving(null); load(); showToast('Escalation resolved.'); }}
        />
      )}
    </div>
  );
}

function ResolveEscalationModal({ escalation, onClose, onDone }: { escalation: EscalationDTO; onClose: () => void; onDone: () => void }) {
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!resolution.trim()) return;
    setBusy(true);
    try {
      await platformSupportApi.resolveEscalation(escalation.id, resolution);
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-black text-white">Resolve Escalation</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={4} placeholder="Describe the resolution..." className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none" />
        <button disabled={busy || !resolution.trim()} onClick={submit} className="w-full mt-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 text-emerald-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
          Mark Resolved
        </button>
      </div>
    </div>
  );
}
