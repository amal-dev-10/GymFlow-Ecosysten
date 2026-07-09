'use client';

import React from 'react';
import { Gauge } from 'lucide-react';
import { usePlatformWidget } from '@/hooks/usePlatformWidget';
import WidgetShell from './WidgetShell';
import WidgetEmptyState from './WidgetEmptyState';
import StatGrid from './StatGrid';

interface UsageData {
  membersRegisteredToday: number;
  attendanceEventsToday: number;
  paymentsProcessed: number;
  workoutAssignments: number;
  activeMobileUsers: number;
  apiRequests: number;
  storageConsumptionGb: number;
}

export default function PlatformUsage(props: { id: string; onHide?: (id: string) => void; draggable?: boolean; onDragStart?: (id: string) => void; onDragOver?: (e: React.DragEvent) => void; onDrop?: (id: string) => void; favorite?: boolean; onToggleFavorite?: (id: string) => void }) {
  const { data, loading, connected } = usePlatformWidget<UsageData>('platform-usage');

  return (
    <WidgetShell id={props.id} title="Platform Usage" icon={Gauge} onHide={props.onHide} draggable={props.draggable} onDragStart={props.onDragStart} onDragOver={props.onDragOver} onDrop={props.onDrop} favorite={props.favorite} onToggleFavorite={props.onToggleFavorite}>
      {loading ? (
        <div className="h-32 bg-slate-900/40 rounded-xl animate-pulse" />
      ) : !connected || !data ? (
        <WidgetEmptyState label="Cross-organization usage metrics will appear once aggregated." />
      ) : (
        <StatGrid
          stats={[
            { label: 'Members Today', value: data.membersRegisteredToday },
            { label: 'Attendance Events', value: data.attendanceEventsToday },
            { label: 'Payments Processed', value: data.paymentsProcessed },
            { label: 'Workout Assignments', value: data.workoutAssignments },
            { label: 'Active Mobile Users', value: data.activeMobileUsers },
            { label: 'API Requests', value: data.apiRequests },
            { label: 'Storage Used', value: `${data.storageConsumptionGb} GB` },
          ]}
        />
      )}
    </WidgetShell>
  );
}
