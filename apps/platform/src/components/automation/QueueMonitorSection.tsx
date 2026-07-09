'use client';

import { useEffect, useState } from 'react';
import { ListTree, Layers, Bell, Receipt, FileBarChart, Trash2 } from 'lucide-react';
import { platformAutomationApi } from '@/lib/api';
import type { AutomationQueueRollupDTO } from '@/types/automation';

const ICON_MAP: Record<string, typeof Layers> = { Layers, Bell, Receipt, FileBarChart, Trash2 };

export default function QueueMonitorSection({ canManage, showToast }: { canManage: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [queues, setQueues] = useState<AutomationQueueRollupDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    platformAutomationApi.listQueues().then(setQueues).catch(() => setQueues([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = async (q: AutomationQueueRollupDTO) => {
    setSavingKey(q.key);
    try {
      await platformAutomationApi.updateQueue(q.key, !q.isActive);
      showToast(`${q.label} ${!q.isActive ? 'enabled' : 'disabled'}.`);
      load();
    } catch {
      showToast('Failed to update queue.', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-slate-500">Real aggregate counts over actual job execution records - a future BullMQ/Redis/RabbitMQ/Kafka integration is a provider swap behind one of these queue keys, never a UI change.</p>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Queue Name</th>
                <th className="px-4 py-3">Pending</th>
                <th className="px-4 py-3">Processing</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3">Failed</th>
                <th className="px-4 py-3">Retry Count</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {queues.map((q) => {
                const Icon = ICON_MAP[q.icon || ''] || ListTree;
                return (
                  <tr key={q.key} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 text-xs font-semibold text-slate-200"><Icon size={14} className="text-slate-500" /> {q.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-indigo-300 font-bold">{q.pending}</td>
                    <td className="px-4 py-3 text-xs text-sky-300 font-bold">{q.processing}</td>
                    <td className="px-4 py-3 text-xs text-emerald-300 font-bold">{q.completed}</td>
                    <td className="px-4 py-3 text-xs text-rose-300 font-bold">{q.failed}</td>
                    <td className="px-4 py-3 text-xs text-amber-300 font-bold">{q.retryCount}</td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <button
                          disabled={savingKey === q.key}
                          onClick={() => toggle(q)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors disabled:opacity-40 ${q.isActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-slate-800/60 border-slate-700/60 text-slate-500'}`}
                        >
                          {q.isActive ? 'Active' : 'Inactive'}
                        </button>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${q.isActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-slate-800/60 border-slate-700/60 text-slate-500'}`}>
                          {q.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
