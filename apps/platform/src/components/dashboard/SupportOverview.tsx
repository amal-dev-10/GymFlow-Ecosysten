'use client';

import React from 'react';
import { LifeBuoy } from 'lucide-react';
import { usePlatformWidget } from '@/hooks/usePlatformWidget';
import WidgetShell from './WidgetShell';
import WidgetEmptyState from './WidgetEmptyState';
import StatGrid from './StatGrid';

interface SupportData {
  openTickets: number;
  criticalTickets: number;
  avgResolutionHours: number;
  csatPercent: number;
  newest: { id: string; subject: string; org: string }[];
}

export default function SupportOverview(props: { id: string; onHide?: (id: string) => void; draggable?: boolean; onDragStart?: (id: string) => void; onDragOver?: (e: React.DragEvent) => void; onDrop?: (id: string) => void; favorite?: boolean; onToggleFavorite?: (id: string) => void }) {
  const { data, loading, connected } = usePlatformWidget<SupportData>('support-overview');

  return (
    <WidgetShell id={props.id} title="Support Overview" icon={LifeBuoy} onHide={props.onHide} draggable={props.draggable} onDragStart={props.onDragStart} onDragOver={props.onDragOver} onDrop={props.onDrop} favorite={props.favorite} onToggleFavorite={props.onToggleFavorite}>
      {loading ? (
        <div className="h-32 bg-slate-900/40 rounded-xl animate-pulse" />
      ) : !connected || !data ? (
        <WidgetEmptyState label="Open tickets and escalations will appear once the support module is connected." />
      ) : (
        <div className="space-y-4">
          <StatGrid
            stats={[
              { label: 'Open Tickets', value: data.openTickets },
              { label: 'Critical', value: data.criticalTickets },
              { label: 'Avg Resolution', value: `${data.avgResolutionHours}h` },
              { label: 'CSAT', value: `${data.csatPercent}%` },
            ]}
          />
          <div className="space-y-1.5">
            {data.newest.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs bg-slate-950/40 rounded-lg px-3 py-2">
                <span className="text-slate-300 font-semibold truncate">{t.subject}</span>
                <span className="text-[9px] text-slate-500 shrink-0 ml-2">{t.org}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetShell>
  );
}
