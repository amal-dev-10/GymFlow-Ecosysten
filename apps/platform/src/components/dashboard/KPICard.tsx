'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import type { KPIDatum } from '@/types/dashboard';

function formatValue(value: number, format?: KPIDatum['format']) {
  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }
  if (format === 'percent') return `${value.toFixed(1)}%`;
  return new Intl.NumberFormat('en-US').format(value);
}

interface KPICardProps {
  datum: KPIDatum | null;
  loading?: boolean;
  onQuickAction?: (path: string) => void;
  /** Shown when datum is null so the dashboard grid still reads as complete - never fabricates a value. */
  fallbackLabel?: string;
}

export default function KPICard({ datum, loading, onQuickAction, fallbackLabel }: KPICardProps) {
  if (loading) {
    return (
      <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 animate-pulse">
        <div className="h-3 w-24 bg-slate-900 rounded mb-3" />
        <div className="h-6 w-20 bg-slate-900 rounded mb-2" />
        <div className="h-2.5 w-16 bg-slate-900 rounded" />
      </div>
    );
  }

  if (!datum) {
    return (
      <div className="bg-[#0b101d] border border-dashed border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between min-h-[110px]">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate">{fallbackLabel || '—'}</span>
        <span className="text-xl font-black text-slate-700">—</span>
        <span className="text-[9px] text-slate-700">Not connected</span>
      </div>
    );
  }

  const growth =
    datum.previousValue !== undefined && datum.previousValue !== 0
      ? ((datum.value - datum.previousValue) / Math.abs(datum.previousValue)) * 100
      : null;
  const trend = growth === null ? 'flat' : growth > 0 ? 'up' : growth < 0 ? 'down' : 'flat';
  const sparklineData = (datum.sparkline || []).map((v, i) => ({ i, v }));

  return (
    <div className="bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between min-h-[110px] transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{datum.label}</span>
        {sparklineData.length > 1 && (
          <div className="w-16 h-6 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={trend === 'up' ? '#34d399' : trend === 'down' ? '#fb7185' : '#818cf8'}
                  fill={trend === 'up' ? '#34d39922' : trend === 'down' ? '#fb718522' : '#818cf822'}
                  strokeWidth={1.5}
                  isAnimationActive
                  animationDuration={600}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <span className="text-xl font-black text-slate-100 mt-1">{formatValue(datum.value, datum.format)}</span>

      <div className="flex items-center justify-between mt-1.5">
        {growth !== null ? (
          <span
            className={`flex items-center gap-1 text-[10px] font-bold ${
              trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-slate-500'
            }`}
          >
            {trend === 'up' ? <TrendingUp size={11} /> : trend === 'down' ? <TrendingDown size={11} /> : <Minus size={11} />}
            {Math.abs(growth).toFixed(1)}%
          </span>
        ) : (
          <span className="text-[10px] text-slate-700">vs. last period</span>
        )}

        {datum.quickActionLabel && datum.quickActionPath && (
          <button
            onClick={() => onQuickAction?.(datum.quickActionPath!)}
            className="flex items-center gap-0.5 text-[9px] font-bold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {datum.quickActionLabel}
            <ArrowRight size={9} />
          </button>
        )}
      </div>
    </div>
  );
}
