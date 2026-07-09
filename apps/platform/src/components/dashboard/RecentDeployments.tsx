'use client';

import React from 'react';
import { Rocket } from 'lucide-react';
import { usePlatformWidget } from '@/hooks/usePlatformWidget';
import type { DeploymentItem } from '@/types/dashboard';
import WidgetShell from './WidgetShell';
import WidgetEmptyState from './WidgetEmptyState';

const STATUS_STYLE: Record<DeploymentItem['status'], string> = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  in_progress: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  rolled_back: 'bg-slate-700/30 text-slate-400 border-slate-700/40',
};

export default function RecentDeployments(props: { id: string; onHide?: (id: string) => void; draggable?: boolean; onDragStart?: (id: string) => void; onDragOver?: (e: React.DragEvent) => void; onDrop?: (id: string) => void; favorite?: boolean; onToggleFavorite?: (id: string) => void }) {
  const { data, loading, connected } = usePlatformWidget<DeploymentItem[]>('recent-deployments');

  return (
    <WidgetShell id={props.id} title="Recent Deployments" icon={Rocket} onHide={props.onHide} draggable={props.draggable} onDragStart={props.onDragStart} onDragOver={props.onDragOver} onDrop={props.onDrop} favorite={props.favorite} onToggleFavorite={props.onToggleFavorite}>
      {loading ? (
        <div className="h-32 bg-slate-900/40 rounded-xl animate-pulse" />
      ) : !connected || !data || data.length === 0 ? (
        <WidgetEmptyState label="Deployment history with rollback controls will appear once CI/CD reporting is connected." />
      ) : (
        <div className="space-y-1.5">
          {data.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-xs bg-slate-950/40 rounded-lg px-3 py-2.5">
              <div className="min-w-0">
                <span className="font-mono font-bold text-slate-200">{d.version}</span>
                <span className="text-[9px] text-slate-500 ml-2">{d.environment}</span>
              </div>
              <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 ${STATUS_STYLE[d.status]}`}>
                {d.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
