'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { usePlatformWidget } from '@/hooks/usePlatformWidget';
import type { AlertItem } from '@/types/dashboard';
import WidgetShell from './WidgetShell';
import WidgetEmptyState from './WidgetEmptyState';

const SEVERITY_STYLE: Record<AlertItem['severity'], string> = {
  critical: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  security: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export default function AlertsCenter(props: { id: string; onHide?: (id: string) => void; draggable?: boolean; onDragStart?: (id: string) => void; onDragOver?: (e: React.DragEvent) => void; onDrop?: (id: string) => void; favorite?: boolean; onToggleFavorite?: (id: string) => void }) {
  const { data, loading, connected } = usePlatformWidget<AlertItem[]>('alerts-center');

  return (
    <WidgetShell id={props.id} title="Alerts Center" icon={ShieldAlert} onHide={props.onHide} draggable={props.draggable} onDragStart={props.onDragStart} onDragOver={props.onDragOver} onDrop={props.onDrop} favorite={props.favorite} onToggleFavorite={props.onToggleFavorite}>
      {loading ? (
        <div className="h-40 bg-slate-900/40 rounded-xl animate-pulse" />
      ) : !connected || !data || data.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-8 gap-2">
          <ShieldAlert size={18} className="text-emerald-500/60" />
          <p className="text-[11px] text-slate-500">No active alerts. Failed payments, security events, and limit breaches will surface here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((alert) => (
            <div key={alert.id} className={`p-2.5 rounded-xl border ${SEVERITY_STYLE[alert.severity]}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">{alert.title}</span>
                <span className="text-[8px] uppercase font-bold opacity-70">{alert.severity}</span>
              </div>
              {alert.description && <p className="text-[10px] opacity-80 mt-1">{alert.description}</p>}
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
