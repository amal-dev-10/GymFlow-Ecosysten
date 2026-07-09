'use client';

import { Monitor, Smartphone, Tablet, MapPin, X } from 'lucide-react';
import { SectionCard, EmptyRow, fmtDateTime } from '@/components/org360/shared';
import type { PlatformUserSession } from '@/types/platformUsers';

const DEVICE_ICON: Record<string, typeof Monitor> = { Desktop: Monitor, Mobile: Smartphone, Tablet: Tablet };

export default function SessionsTab({
  sessions,
  canManage,
  onTerminate,
  onTerminateAll,
}: {
  sessions: PlatformUserSession[];
  canManage: boolean;
  onTerminate: (sessionId: string) => void;
  onTerminateAll: () => void;
}) {
  const active = sessions.filter((s) => s.status === 'Active');
  const ended = sessions.filter((s) => s.status !== 'Active');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SectionCard
        title={`Current Sessions · ${active.length}`}
        action={
          canManage && active.length > 0 && (
            <button onClick={onTerminateAll} className="text-[10px] font-bold text-rose-400 hover:text-rose-300">Terminate All</button>
          )
        }
      >
        {active.length === 0 ? (
          <EmptyRow text="No active sessions." />
        ) : (
          <div className="space-y-2">
            {active.map((s) => {
              const Icon = DEVICE_ICON[s.device] || Monitor;
              return (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-850">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400"><Icon size={14} /></div>
                    <div>
                      <span className="text-xs font-bold text-slate-200">{s.device} · {s.browser}</span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1"><MapPin size={10} /> {s.ipAddress}</span>
                        <span>{fmtDateTime(s.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  {canManage && (
                    <button onClick={() => onTerminate(s.id)} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/30 text-slate-500 hover:text-rose-400 transition-colors">
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Login History">
        {ended.length === 0 && active.length === 0 ? (
          <EmptyRow text="No login history yet." />
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
            {[...active, ...ended].map((s) => (
              <div key={`hist-${s.id}`} className="flex items-center justify-between py-2 border-b border-slate-900/60 last:border-0">
                <div>
                  <span className="text-xs font-semibold text-slate-300">{s.device} · {s.browser}</span>
                  <span className="block text-[10px] text-slate-500">{s.ipAddress} · {fmtDateTime(s.createdAt)}</span>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${s.status === 'Active' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-slate-500 bg-slate-500/10 border-slate-500/20'}`}>{s.status}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
