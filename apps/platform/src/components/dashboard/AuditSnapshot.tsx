'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { usePlatformWidget } from '@/hooks/usePlatformWidget';
import WidgetShell from './WidgetShell';
import WidgetEmptyState from './WidgetEmptyState';
import StatGrid from './StatGrid';

interface AuditData {
  platformLogins: number;
  failedLogins: number;
  permissionChanges: number;
  configChanges: number;
  recentActions: { id: string; actor: string; action: string }[];
}

export default function AuditSnapshot(props: { id: string; onHide?: (id: string) => void; draggable?: boolean; onDragStart?: (id: string) => void; onDragOver?: (e: React.DragEvent) => void; onDrop?: (id: string) => void; favorite?: boolean; onToggleFavorite?: (id: string) => void }) {
  const { data, loading, connected } = usePlatformWidget<AuditData>('audit-snapshot');

  return (
    <WidgetShell id={props.id} title="Audit Snapshot" icon={Lock} onHide={props.onHide} draggable={props.draggable} onDragStart={props.onDragStart} onDragOver={props.onDragOver} onDrop={props.onDrop} favorite={props.favorite} onToggleFavorite={props.onToggleFavorite}>
      {loading ? (
        <div className="h-32 bg-slate-900/40 rounded-xl animate-pulse" />
      ) : !connected || !data ? (
        <WidgetEmptyState label="Platform logins, permission changes, and admin actions will appear once audit data is connected." />
      ) : (
        <div className="space-y-4">
          <StatGrid
            stats={[
              { label: 'Platform Logins', value: data.platformLogins },
              { label: 'Failed Logins', value: data.failedLogins },
              { label: 'Permission Changes', value: data.permissionChanges },
              { label: 'Config Changes', value: data.configChanges },
            ]}
          />
          <div className="space-y-1.5">
            {data.recentActions.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-xs bg-slate-950/40 rounded-lg px-3 py-2">
                <span className="text-slate-300 truncate">{a.action}</span>
                <span className="text-[9px] text-slate-500 shrink-0 ml-2">{a.actor}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetShell>
  );
}
