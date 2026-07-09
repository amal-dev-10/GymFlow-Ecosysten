'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertOctagon, Clock, CheckCircle2, Save, Loader2 } from 'lucide-react';
import { platformSupportApi } from '@/lib/api';
import type { SlaDashboardDTO, TicketPriority } from '@/types/support';
import { PRIORITY_LABELS } from '@/types/support';

function fmtMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

export default function SlaDashboardSection({ canManage, showToast }: { canManage: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [dashboard, setDashboard] = useState<SlaDashboardDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, { firstResponseMinutes: number; resolutionMinutes: number }>>({});
  const [savingPriority, setSavingPriority] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    platformSupportApi
      .getSlaDashboard()
      .then((res) => {
        setDashboard(res);
        const d: Record<string, { firstResponseMinutes: number; resolutionMinutes: number }> = {};
        res.policies.forEach((p) => { d[p.priority] = { firstResponseMinutes: p.firstResponseMinutes, resolutionMinutes: p.resolutionMinutes }; });
        setDraft(d);
      })
      .catch(() => setDashboard(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (priority: TicketPriority) => {
    setSavingPriority(priority);
    try {
      await platformSupportApi.updateSlaPolicy({ priority, ...draft[priority] });
      showToast(`${PRIORITY_LABELS[priority]} SLA policy updated.`);
      load();
    } catch {
      showToast('Failed to save SLA policy.', 'error');
    } finally {
      setSavingPriority(null);
    }
  };

  if (loading || !dashboard) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"><AlertOctagon size={12} className="text-rose-400" /> Overdue Tickets</span>
          <span className="block text-2xl font-black text-rose-400 mt-2">{dashboard.overdueTickets}</span>
        </div>
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"><Clock size={12} className="text-amber-400" /> Upcoming Breaches</span>
          <span className="block text-2xl font-black text-amber-400 mt-2">{dashboard.upcomingBreaches}</span>
        </div>
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"><CheckCircle2 size={12} className="text-emerald-400" /> On Track</span>
          <span className="block text-2xl font-black text-emerald-400 mt-2">{dashboard.onTrack}</span>
        </div>
      </div>

      <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-850">
          <span className="text-xs font-bold text-slate-200">Priority SLA Policies</span>
          <p className="text-[11px] text-slate-500 mt-0.5">First response and resolution time targets used to compute "SLA Remaining" on every ticket.</p>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">First Response Time (min)</th>
              <th className="px-4 py-3">Resolution Time (min)</th>
              {canManage && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {dashboard.policies.map((p) => (
              <tr key={p.priority} className="border-b border-slate-900/60 last:border-0">
                <td className="px-4 py-3 text-xs font-bold text-slate-200">{PRIORITY_LABELS[p.priority]}</td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <input
                      type="number"
                      value={draft[p.priority]?.firstResponseMinutes ?? p.firstResponseMinutes}
                      onChange={(e) => setDraft((d) => ({ ...d, [p.priority]: { ...d[p.priority], firstResponseMinutes: Number(e.target.value) } }))}
                      className="w-24 bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">{fmtMinutes(p.firstResponseMinutes)}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <input
                      type="number"
                      value={draft[p.priority]?.resolutionMinutes ?? p.resolutionMinutes}
                      onChange={(e) => setDraft((d) => ({ ...d, [p.priority]: { ...d[p.priority], resolutionMinutes: Number(e.target.value) } }))}
                      className="w-24 bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">{fmtMinutes(p.resolutionMinutes)}</span>
                  )}
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <button disabled={savingPriority === p.priority} onClick={() => save(p.priority)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-indigo-300 hover:bg-indigo-500/10 transition-colors">
                      {savingPriority === p.priority ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
