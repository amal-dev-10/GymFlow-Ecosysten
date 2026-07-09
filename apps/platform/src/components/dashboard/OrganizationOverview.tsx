'use client';

import React from 'react';
import { Building2 } from 'lucide-react';
import { usePlatformWidget } from '@/hooks/usePlatformWidget';
import type { OrganizationSummary } from '@/types/dashboard';
import WidgetShell from './WidgetShell';
import WidgetEmptyState from './WidgetEmptyState';
import StatGrid from './StatGrid';

interface OrgOverviewData {
  createdToday: number;
  awaitingApproval: number;
  nearExpiry: number;
  suspended: number;
  highGrowth: number;
  newest: OrganizationSummary[];
}

export default function OrganizationOverview(props: { id: string; onHide?: (id: string) => void; draggable?: boolean; onDragStart?: (id: string) => void; onDragOver?: (e: React.DragEvent) => void; onDrop?: (id: string) => void; favorite?: boolean; onToggleFavorite?: (id: string) => void }) {
  const { data, loading, connected } = usePlatformWidget<OrgOverviewData>('organization-overview');

  return (
    <WidgetShell id={props.id} title="Organization Overview" icon={Building2} onHide={props.onHide} draggable={props.draggable} onDragStart={props.onDragStart} onDragOver={props.onDragOver} onDrop={props.onDrop} favorite={props.favorite} onToggleFavorite={props.onToggleFavorite}>
      {loading ? (
        <div className="h-32 bg-slate-900/40 rounded-xl animate-pulse" />
      ) : !connected || !data ? (
        <WidgetEmptyState label="New, expiring, and suspended organizations will appear here once wired to the org directory." />
      ) : (
        <div className="space-y-4">
          <StatGrid
            stats={[
              { label: 'Created Today', value: data.createdToday },
              { label: 'Awaiting Approval', value: data.awaitingApproval },
              { label: 'Near Expiry', value: data.nearExpiry },
              { label: 'Suspended', value: data.suspended },
              { label: 'High Growth', value: data.highGrowth },
            ]}
          />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-2">Newest Organizations</p>
            <div className="space-y-1.5">
              {data.newest.map((org) => (
                <div key={org.id} className="flex items-center justify-between text-xs bg-slate-950/40 rounded-lg px-3 py-2">
                  <span className="text-slate-300 font-semibold truncate">{org.name}</span>
                  <span className="text-[9px] text-slate-500">{org.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </WidgetShell>
  );
}
