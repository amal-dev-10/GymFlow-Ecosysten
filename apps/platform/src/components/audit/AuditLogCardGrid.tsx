'use client';

import type { AuditEventRowDTO } from '@/types/audit';
import { getCategoryIcon, SeverityBadge, StatusBadge } from './AuditBadges';

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString();
}

export default function AuditLogCardGrid({ rows, onSelect, mobile = false }: { rows: AuditEventRowDTO[]; onSelect: (row: AuditEventRowDTO) => void; mobile?: boolean }) {
  return (
    <div className={`grid ${mobile ? 'grid-cols-1 lg:hidden' : 'hidden md:grid lg:hidden grid-cols-2 gap-3'} gap-3`}>
      {rows.map((r) => {
        const Icon = getCategoryIcon(r.eventCategory);
        return (
          <div key={r.id} onClick={() => onSelect(r)} className="bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 transition-colors cursor-pointer">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0"><Icon size={15} /></div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-100 block truncate">{r.action}</span>
                  <span className="text-[10px] text-slate-600 block">{fmtDateTime(r.createdAt)}</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">{r.details}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              <SeverityBadge severity={r.severity} />
              <StatusBadge status={r.status} />
            </div>
            <div className="mt-3 pt-3 border-t border-slate-900/60 text-[11px] text-slate-500">
              by {r.user}{r.organization?.name ? ` · ${r.organization.name}` : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}
