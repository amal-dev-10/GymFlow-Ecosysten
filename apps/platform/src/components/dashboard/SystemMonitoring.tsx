'use client';

import React from 'react';
import { Server } from 'lucide-react';
import { usePlatformWidget } from '@/hooks/usePlatformWidget';
import type { ServiceHealth } from '@/types/dashboard';
import WidgetShell from './WidgetShell';
import WidgetEmptyState from './WidgetEmptyState';

const MONITORED_SERVICES = [
  'API Gateway',
  'Database',
  'Redis',
  'WebSocket',
  'Background Workers',
  'Storage',
  'Authentication',
  'Email Service',
  'SMS Service',
  'Payment Gateway',
];

const STATUS_DOT: Record<ServiceHealth['status'], string> = {
  operational: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  outage: 'bg-rose-500',
  unknown: 'bg-slate-600',
};

export default function SystemMonitoring(props: { id: string; onHide?: (id: string) => void; draggable?: boolean; onDragStart?: (id: string) => void; onDragOver?: (e: React.DragEvent) => void; onDrop?: (id: string) => void; favorite?: boolean; onToggleFavorite?: (id: string) => void }) {
  const { data, loading, connected } = usePlatformWidget<ServiceHealth[]>('system-monitoring');

  return (
    <WidgetShell id={props.id} title="System Monitoring" icon={Server} onHide={props.onHide} draggable={props.draggable} onDragStart={props.onDragStart} onDragOver={props.onDragOver} onDrop={props.onDrop} favorite={props.favorite} onToggleFavorite={props.onToggleFavorite}>
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 animate-pulse">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-900/60 rounded-xl" />
          ))}
        </div>
      ) : !connected ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {MONITORED_SERVICES.map((name) => (
            <div key={name} className="bg-slate-950/60 border border-slate-900 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                <span className="text-[10px] font-bold text-slate-400 truncate">{name}</span>
              </div>
              <span className="text-[9px] text-slate-700">No data</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {(data || []).map((svc) => (
            <div key={svc.name} className="bg-slate-950/60 border border-slate-900 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[svc.status]} ${svc.status === 'operational' ? 'animate-pulse' : ''}`} />
                <span className="text-[10px] font-bold text-slate-300 truncate">{svc.name}</span>
              </div>
              <div className="space-y-0.5 text-[9px] text-slate-500">
                {svc.latencyMs !== undefined && <div>{svc.latencyMs}ms latency</div>}
                {svc.uptimePercent !== undefined && <div>{svc.uptimePercent}% uptime</div>}
                {svc.version && <div className="font-mono">{svc.version}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
      {!connected && !loading && (
        <div className="mt-1">
          <WidgetEmptyState label="Live service health will appear here once the backend exposes a /platform/health endpoint." />
        </div>
      )}
    </WidgetShell>
  );
}
