'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import AuditEventDetailsDrawer from '@/components/audit/AuditEventDetailsDrawer';
import type { TicketWorkspaceDTO } from '@/types/support';

const SEVERITY_DOT: Record<string, string> = { Information: 'bg-slate-500', Low: 'bg-sky-400', Medium: 'bg-amber-400', High: 'bg-orange-400', Critical: 'bg-rose-500' };

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString();
}

export default function AuditTimelineSnapshot({ events }: { events: TicketWorkspaceDTO['auditTimeline'] }) {
  const [selected, setSelected] = useState<{ id: string } | null>(null);

  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 space-y-2">
      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200"><History size={13} className="text-slate-400" /> Recent Audit Events</span>
      {events.length === 0 ? (
        <p className="text-[11px] text-slate-600">No recent audit activity for this organization.</p>
      ) : (
        <div className="space-y-1.5">
          {events.slice(0, 6).map((e) => (
            <button key={e.id} onClick={() => setSelected({ id: e.id })} className="w-full flex items-start gap-2 text-left px-2 py-1.5 rounded-lg hover:bg-slate-900/60 transition-colors">
              <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${SEVERITY_DOT[e.severity] || 'bg-slate-500'}`} />
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold text-slate-300 truncate">{e.action}</span>
                <span className="block text-[10px] text-slate-600">{fmtDateTime(e.createdAt)} · {e.user}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && <AuditEventDetailsDrawer eventId={selected.id} onClose={() => setSelected(null)} onSelectRelated={(id) => setSelected({ id })} />}
    </div>
  );
}
