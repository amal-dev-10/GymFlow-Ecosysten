'use client';

import { ShieldAlert } from 'lucide-react';
import type { RoleDetailDTO } from '@/types/roles';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

export default function RoleRestrictionsTab({ role }: { role: RoleDetailDTO }) {
  if (role.restrictions.length === 0) {
    return <PlatformEmptyState icon={ShieldAlert} title="No restrictions" description="This role has no explicit denials. It has whatever it's directly granted or inherits." />;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400 mb-1">Explicit denials always win over any allow granted by this role or an inherited role.</p>
      {role.restrictions.map((r) => (
        <div key={r.key} className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0"><ShieldAlert size={13} /></div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-rose-300 block">{r.label}</span>
            {r.note && <p className="text-[11px] text-slate-500 mt-0.5">{r.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
