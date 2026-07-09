'use client';

import type { AuditEventRowDTO } from '@/types/audit';
import { SeverityBadge, StatusBadge, CategoryPill, DeviceIcon } from './AuditBadges';

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString();
}

export default function AuditLogsTable({ rows, onSelect }: { rows: AuditEventRowDTO[]; onSelect: (row: AuditEventRowDTO) => void }) {
  return (
    <div className="hidden lg:block bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
      <table className="w-full text-left min-w-[1500px]">
        <thead>
          <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Timestamp</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Event</th>
            <th className="px-4 py-3">Performed By</th>
            <th className="px-4 py-3">Target Resource</th>
            <th className="px-4 py-3">Organization</th>
            <th className="px-4 py-3">IP Address</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Device</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Severity</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} onClick={() => onSelect(r)} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/30 cursor-pointer transition-colors">
              <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
              <td className="px-4 py-3"><CategoryPill category={r.eventCategory} /></td>
              <td className="px-4 py-3">
                <span className="text-xs font-bold text-slate-100 block">{r.action}</span>
                {r.eventType && <span className="text-[10px] text-slate-600 font-mono block">{r.eventType}</span>}
              </td>
              <td className="px-4 py-3 text-xs text-slate-300 whitespace-nowrap">{r.user}</td>
              <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap max-w-[160px] truncate">{r.entityType || '—'}{r.entityId ? ` #${r.entityId.slice(0, 8)}` : ''}</td>
              <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{r.organization?.name || '—'}</td>
              <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">{r.ipAddress || '—'}</td>
              <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{r.country || '—'}</td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap">
                  <DeviceIcon device={r.device} /> {r.browser} / {r.os}
                </span>
              </td>
              <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              <td className="px-4 py-3"><SeverityBadge severity={r.severity} /></td>
              <td className="px-4 py-3 text-right">
                <button onClick={(e) => { e.stopPropagation(); onSelect(r); }} className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 text-[11px] font-bold transition-colors">
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
