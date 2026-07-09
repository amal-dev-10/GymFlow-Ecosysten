'use client';

import React from 'react';
import { Repeat } from 'lucide-react';
import { usePlatformWidget } from '@/hooks/usePlatformWidget';
import WidgetShell from './WidgetShell';
import WidgetEmptyState from './WidgetEmptyState';
import StatGrid from './StatGrid';

interface SubscriptionData {
  active: number;
  trial: number;
  paid: number;
  enterprise: number;
  renewalsToday: number;
  renewalsThisWeek: number;
  expired: number;
  cancelled: number;
  churnRatePercent: number;
}

export default function SubscriptionOverview(props: { id: string; onHide?: (id: string) => void; draggable?: boolean; onDragStart?: (id: string) => void; onDragOver?: (e: React.DragEvent) => void; onDrop?: (id: string) => void; favorite?: boolean; onToggleFavorite?: (id: string) => void }) {
  const { data, loading, connected } = usePlatformWidget<SubscriptionData>('subscription-overview');

  return (
    <WidgetShell id={props.id} title="Subscription Overview" icon={Repeat} onHide={props.onHide} draggable={props.draggable} onDragStart={props.onDragStart} onDragOver={props.onDragOver} onDrop={props.onDrop} favorite={props.favorite} onToggleFavorite={props.onToggleFavorite}>
      {loading ? (
        <div className="h-32 bg-slate-900/40 rounded-xl animate-pulse" />
      ) : !connected || !data ? (
        <WidgetEmptyState label="Subscription mix and churn will appear here once billing data is connected." />
      ) : (
        <StatGrid
          stats={[
            { label: 'Active', value: data.active },
            { label: 'Trial', value: data.trial },
            { label: 'Paid', value: data.paid },
            { label: 'Enterprise', value: data.enterprise },
            { label: 'Renewals Today', value: data.renewalsToday },
            { label: 'Renewals This Week', value: data.renewalsThisWeek },
            { label: 'Expired', value: data.expired },
            { label: 'Cancelled', value: data.cancelled },
            { label: 'Churn Rate', value: `${data.churnRatePercent}%` },
          ]}
        />
      )}
    </WidgetShell>
  );
}
