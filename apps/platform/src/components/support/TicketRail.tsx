'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { platformSupportApi } from '@/lib/api';
import type { TicketRowDTO } from '@/types/support';
import { StatusBadge } from './SupportBadges';

export default function TicketRail({ activeId }: { activeId: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<TicketRowDTO[]>([]);

  useEffect(() => {
    platformSupportApi.listTickets({ limit: 30, sortDir: 'desc' }).then((res) => setRows(res.data)).catch(() => setRows([]));
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-hidden">
      <div className="p-3 border-b border-slate-850 shrink-0">
        <button onClick={() => router.push('/operations/support?section=tickets')} className="text-[11px] font-bold text-slate-400 hover:text-indigo-300 transition-colors">← Back to Inbox</button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {rows.map((t) => (
          <button
            key={t.id}
            onClick={() => router.push(`/operations/support/tickets/${t.id}`)}
            className={`w-full text-left px-3 py-2.5 border-b border-slate-900/60 last:border-0 transition-colors ${t.id === activeId ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : 'hover:bg-slate-900/40'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-500">#{t.ticketNumber}</span>
              <StatusBadge status={t.status} />
            </div>
            <span className="block text-[11px] font-semibold text-slate-300 truncate mt-0.5">{t.subject}</span>
            <span className="block text-[10px] text-slate-600 truncate">{t.organization?.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
