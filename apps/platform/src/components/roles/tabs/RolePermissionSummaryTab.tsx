'use client';

import { useMemo } from 'react';
import { KeySquare } from 'lucide-react';
import type { RoleDetailDTO } from '@/types/roles';
import { SensitiveBadge } from '../RoleBadges';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

export default function RolePermissionSummaryTab({ role }: { role: RoleDetailDTO }) {
  const byCategory = useMemo(() => {
    const map = new Map<string, typeof role.permissions>();
    role.permissions.forEach((p) => {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    });
    return Array.from(map.entries());
  }, [role.permissions]);

  if (role.permissions.length === 0) {
    return <PlatformEmptyState icon={KeySquare} title="No direct permissions" description="This role has no directly-assigned permissions yet. It may still inherit permissions from other roles." />;
  }

  return (
    <div className="space-y-4">
      {byCategory.map(([category, perms]) => (
        <div key={category} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">{category}</p>
          <div className="space-y-1.5">
            {perms.map((p) => (
              <div key={p.key} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900/40 border border-slate-850">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-slate-200 truncate">{p.label}</span>
                  {p.isSensitive && <SensitiveBadge />}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.note && <span className="text-[10px] text-slate-500 max-w-[200px] truncate" title={p.note}>{p.note}</span>}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.effect === 'ALLOW' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'}`}>
                    {p.effect === 'ALLOW' ? 'Allow' : 'Deny'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
