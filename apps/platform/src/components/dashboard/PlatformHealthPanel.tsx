'use client';

import React from 'react';
import { HeartPulse } from 'lucide-react';
import { usePlatformWidget } from '@/hooks/usePlatformWidget';
import WidgetShell from './WidgetShell';
import WidgetEmptyState from './WidgetEmptyState';

interface HealthSummary {
  healthScore: number;
  avgResponseMs: number;
  uptimePercent: number;
}

export default function PlatformHealthPanel(props: { id: string; onHide?: (id: string) => void; draggable?: boolean; onDragStart?: (id: string) => void; onDragOver?: (e: React.DragEvent) => void; onDrop?: (id: string) => void; favorite?: boolean; onToggleFavorite?: (id: string) => void }) {
  const { data, loading, connected } = usePlatformWidget<HealthSummary>('platform-health-summary');

  return (
    <WidgetShell id={props.id} title="Platform Health" icon={HeartPulse} onHide={props.onHide} draggable={props.draggable} onDragStart={props.onDragStart} onDragOver={props.onDragOver} onDrop={props.onDrop} favorite={props.favorite} onToggleFavorite={props.onToggleFavorite}>
      {loading ? (
        <div className="grid grid-cols-3 gap-3 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-900/60 rounded-xl" />
          ))}
        </div>
      ) : !connected || !data ? (
        <WidgetEmptyState label="Health score, response time, and uptime will appear once monitoring is wired up." />
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 text-center">
            <span className="block text-lg font-black text-emerald-400">{data.healthScore}</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">Health Score</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 text-center">
            <span className="block text-lg font-black text-slate-100">{data.avgResponseMs}ms</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">Avg Response</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 text-center">
            <span className="block text-lg font-black text-slate-100">{data.uptimePercent}%</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">Uptime</span>
          </div>
        </div>
      )}
    </WidgetShell>
  );
}
