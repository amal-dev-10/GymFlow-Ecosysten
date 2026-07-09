'use client';

import { History } from 'lucide-react';
import type { RoleDetailDTO } from '@/types/roles';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString();
}

export default function RoleAuditHistoryTab({ role }: { role: RoleDetailDTO }) {
  if (role.auditHistory.length === 0) {
    return <PlatformEmptyState icon={History} title="No audit events yet" description="Changes to this role will appear here." />;
  }

  return (
    <div className="space-y-2">
      {role.auditHistory.map((log) => (
        <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-[#0b101d] border border-slate-800/80">
          <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0 mt-0.5"><History size={13} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-200">{log.action}</span>
              <span className="text-[10px] text-slate-600 shrink-0">{fmtDateTime(log.createdAt)}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 break-words">{log.details}</p>
            <span className="text-[10px] text-slate-600">by {log.user}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
