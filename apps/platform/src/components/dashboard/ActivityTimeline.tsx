'use client';

import React from 'react';
import { History, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { usePlatformWidget } from '@/hooks/usePlatformWidget';
import type { ActivityEvent } from '@/types/dashboard';
import WidgetShell from './WidgetShell';
import WidgetEmptyState from './WidgetEmptyState';

const SEVERITY_ICON = { info: Info, success: CheckCircle2, warning: AlertTriangle, critical: XCircle };
const SEVERITY_COLOR = { info: 'text-slate-400', success: 'text-emerald-400', warning: 'text-amber-400', critical: 'text-rose-400' };

export default function ActivityTimeline(props: { id: string; onHide?: (id: string) => void; draggable?: boolean; onDragStart?: (id: string) => void; onDragOver?: (e: React.DragEvent) => void; onDrop?: (id: string) => void; favorite?: boolean; onToggleFavorite?: (id: string) => void }) {
  const { data, loading, connected } = usePlatformWidget<ActivityEvent[]>('activity-timeline');

  return (
    <WidgetShell id={props.id} title="Platform Activity Timeline" icon={History} onHide={props.onHide} draggable={props.draggable} onDragStart={props.onDragStart} onDragOver={props.onDragOver} onDrop={props.onDrop} favorite={props.favorite} onToggleFavorite={props.onToggleFavorite}>
      {loading ? (
        <div className="h-56 bg-slate-900/40 rounded-xl animate-pulse" />
      ) : !connected || !data || data.length === 0 ? (
        <WidgetEmptyState label="Organization creations, payments, deployments, and logins will stream in here in real time." />
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin pr-1">
          {data.map((event) => {
            const Icon = SEVERITY_ICON[event.severity || 'info'];
            return (
              <div key={event.id} className="flex items-start gap-2.5">
                <Icon size={13} className={`mt-0.5 shrink-0 ${SEVERITY_COLOR[event.severity || 'info']}`} />
                <div className="min-w-0">
                  <p className="text-xs text-slate-300">{event.message}</p>
                  <p className="text-[9px] text-slate-600 mt-0.5">
                    {event.actor ? `${event.actor} · ` : ''}
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetShell>
  );
}
