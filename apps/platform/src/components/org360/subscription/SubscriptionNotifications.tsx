'use client';

import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import type { SubscriptionNotification } from '@/types/org360';

const CFG: Record<SubscriptionNotification['level'], { icon: typeof AlertOctagon; className: string }> = {
  critical: { icon: AlertOctagon, className: 'bg-rose-500/5 border-rose-500/20 text-rose-300' },
  warning: { icon: AlertTriangle, className: 'bg-amber-500/5 border-amber-500/20 text-amber-300' },
  info: { icon: Info, className: 'bg-sky-500/5 border-sky-500/20 text-sky-300' },
};

export default function SubscriptionNotifications({ notifications }: { notifications: SubscriptionNotification[] }) {
  if (notifications.length === 0) return null;
  return (
    <div className="space-y-2">
      {notifications.map((n, i) => {
        const cfg = CFG[n.level];
        return (
          <div key={i} className={`flex items-start gap-3 p-3.5 rounded-2xl border ${cfg.className}`}>
            <cfg.icon size={16} className="shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-xs font-bold block">{n.title}</span>
              <span className="text-[11px] opacity-80 block mt-0.5">{n.detail}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
