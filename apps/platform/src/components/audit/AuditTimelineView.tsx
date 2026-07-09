'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { AuditEventRowDTO } from '@/types/audit';
import { getCategoryIcon, SeverityBadge } from './AuditBadges';

export type TimelineGroupBy = 'none' | 'category' | 'user' | 'organization';

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString();
}

function groupKey(row: AuditEventRowDTO, groupBy: TimelineGroupBy): string {
  if (groupBy === 'category') return row.eventCategory || 'Uncategorized';
  if (groupBy === 'user') return row.user;
  if (groupBy === 'organization') return row.organization?.name || 'Platform-level';
  return 'All Events';
}

function TimelineGroup({ title, rows, onSelect, collapsible }: { title: string; rows: AuditEventRowDTO[]; onSelect: (row: AuditEventRowDTO) => void; collapsible: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
      {collapsible && (
        <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-200">{title}</span>
          <span className="flex items-center gap-2 text-[10px] text-slate-500">
            {rows.length} event{rows.length === 1 ? '' : 's'}
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
        </button>
      )}
      {open && (
        <div className="relative pl-2">
          <div className="absolute left-[19px] top-1 bottom-1 w-px bg-slate-800" />
          <div className="space-y-3">
            {rows.map((r) => {
              const Icon = getCategoryIcon(r.eventCategory);
              return (
                <div key={r.id} onClick={() => onSelect(r)} className="relative flex items-start gap-3 cursor-pointer rounded-xl -mx-2 px-2 py-1 hover:bg-slate-900/40 transition-colors">
                  <div className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 z-10 text-indigo-300 bg-indigo-500/10 border-indigo-500/20">
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-200 truncate">{r.action}</span>
                      <span className="text-[10px] text-slate-600 shrink-0">{fmtDateTime(r.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 break-words">{r.details}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-600">by {r.user}</span>
                      <SeverityBadge severity={r.severity} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditTimelineView({ rows, groupBy, onSelect }: { rows: AuditEventRowDTO[]; groupBy: TimelineGroupBy; onSelect: (row: AuditEventRowDTO) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, AuditEventRowDTO[]>();
    for (const row of rows) {
      const key = groupKey(row, groupBy);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return Array.from(map.entries());
  }, [rows, groupBy]);

  return (
    <div className="space-y-4">
      {groups.map(([title, groupRows]) => (
        <TimelineGroup key={title} title={title} rows={groupRows} onSelect={onSelect} collapsible={groupBy !== 'none'} />
      ))}
    </div>
  );
}
