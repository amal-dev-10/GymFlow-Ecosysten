'use client';

import { ShieldCheck } from 'lucide-react';
import type { PlanAuditLogDTO } from '@/types/plans';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

export default function PlanAuditLogList({ logs }: { logs: PlanAuditLogDTO[] }) {
  if (logs.length === 0) {
    return <PlatformEmptyState icon={ShieldCheck} title="No audit events yet" description="Every action taken on this plan is recorded here." />;
  }

  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl divide-y divide-slate-900/60">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start justify-between gap-4 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">{log.action}</span>
              <span className="text-[10px] text-slate-600">by {log.user}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{log.details}</p>
          </div>
          <span className="text-[10px] text-slate-600 shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
