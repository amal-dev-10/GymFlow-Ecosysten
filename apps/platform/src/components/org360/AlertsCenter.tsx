'use client';

import { AlertOctagon, AlertTriangle, Info, X } from 'lucide-react';
import { useState } from 'react';
import type { OrgAlert } from '@/types/org360';

const LEVEL_CFG: Record<OrgAlert['level'], { icon: typeof AlertOctagon; className: string }> = {
  critical: { icon: AlertOctagon, className: 'bg-rose-500/5 border-rose-500/20 text-rose-300' },
  warning: { icon: AlertTriangle, className: 'bg-amber-500/5 border-amber-500/20 text-amber-300' },
  info: { icon: Info, className: 'bg-sky-500/5 border-sky-500/20 text-sky-300' },
};

export default function AlertsCenter({ alerts }: { alerts: OrgAlert[] }) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const visible = alerts.map((a, i) => ({ ...a, i })).filter((a) => !dismissed.has(a.i));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((a) => {
        const cfg = LEVEL_CFG[a.level];
        return (
          <div key={a.i} className={`flex items-start gap-3 p-3.5 rounded-2xl border ${cfg.className}`}>
            <cfg.icon size={16} className="shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold block">{a.title}</span>
              <span className="text-[11px] opacity-80 block mt-0.5">{a.detail}</span>
            </div>
            <button onClick={() => setDismissed((prev) => new Set(prev).add(a.i))} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
