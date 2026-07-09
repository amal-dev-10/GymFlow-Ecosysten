'use client';

import React from 'react';
import { DollarSign } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { usePlatformWidget } from '@/hooks/usePlatformWidget';
import { platformRevenueApi } from '@/lib/api';
import WidgetShell from './WidgetShell';
import WidgetEmptyState from './WidgetEmptyState';
import StatGrid from './StatGrid';

interface RevenueData {
  today: number;
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
  arpo: number;
  mrrTrend: { month: string; value: number }[];
}

export default function RevenueAnalytics(props: { id: string; onHide?: (id: string) => void; draggable?: boolean; onDragStart?: (id: string) => void; onDragOver?: (e: React.DragEvent) => void; onDrop?: (id: string) => void; favorite?: boolean; onToggleFavorite?: (id: string) => void }) {
  const { data, loading, connected } = usePlatformWidget<RevenueData>('revenue-analytics', () => platformRevenueApi.getWidgetSummary());

  return (
    <WidgetShell id={props.id} title="Revenue Analytics" icon={DollarSign} onHide={props.onHide} draggable={props.draggable} onDragStart={props.onDragStart} onDragOver={props.onDragOver} onDrop={props.onDrop} favorite={props.favorite} onToggleFavorite={props.onToggleFavorite}>
      {loading ? (
        <div className="h-48 bg-slate-900/40 rounded-xl animate-pulse" />
      ) : !connected || !data ? (
        <div className="h-48 flex items-center justify-center border border-dashed border-slate-900 rounded-xl">
          <WidgetEmptyState label="MRR/ARR trend and revenue breakdowns will render here once billing data is connected." />
        </div>
      ) : (
        <div className="space-y-4">
          <StatGrid
            stats={[
              { label: 'Today', value: `$${data.today.toLocaleString()}` },
              { label: 'This Week', value: `$${data.thisWeek.toLocaleString()}` },
              { label: 'This Month', value: `$${data.thisMonth.toLocaleString()}` },
              { label: 'This Year', value: `$${data.thisYear.toLocaleString()}` },
              { label: 'Avg Revenue / Org', value: `$${data.arpo.toLocaleString()}` },
            ]}
          />
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.mrrTrend}>
                <defs>
                  <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0b101d', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2} fill="url(#mrrGradient)" animationDuration={700} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </WidgetShell>
  );
}
