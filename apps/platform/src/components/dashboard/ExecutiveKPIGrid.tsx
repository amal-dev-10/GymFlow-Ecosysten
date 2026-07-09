'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { usePlatformWidget } from '@/hooks/usePlatformWidget';
import { platformRevenueApi } from '@/lib/api';
import type { KPIDatum } from '@/types/dashboard';
import KPICard from './KPICard';

// PLT-012: only the revenue-scoped keys (mrr/arr/revenueToday) are wired to a
// real endpoint here - org counts/DAU/MAU/health score are mixed-concern and
// stay "Not connected" until their own modules exist. KPICard already
// renders missing keys gracefully (see its own `!datum` branch), so a
// partial record is safe.
async function fetchRevenueKpis(): Promise<Record<string, KPIDatum>> {
  const dashboard = await platformRevenueApi.getDashboard();
  return {
    mrr: { label: 'Monthly Recurring Revenue', value: dashboard.mrr, format: 'currency' },
    arr: { label: 'Annual Recurring Revenue', value: dashboard.arr, format: 'currency' },
    revenueToday: { label: 'Revenue Today', value: dashboard.revenueToday, format: 'currency' },
  };
}

interface KPIDefinition {
  key: string;
  label: string;
  format: KPIDatum['format'];
  quickActionLabel?: string;
  quickActionPath?: string;
}

const KPI_DEFINITIONS: KPIDefinition[] = [
  { key: 'totalOrganizations', label: 'Total Organizations', format: 'number', quickActionLabel: 'View all', quickActionPath: '/organizations' },
  { key: 'activeOrganizations', label: 'Active Organizations', format: 'number' },
  { key: 'trialOrganizations', label: 'Organizations in Trial', format: 'number' },
  { key: 'suspendedOrganizations', label: 'Suspended Organizations', format: 'number' },
  { key: 'totalMembers', label: 'Total Members (Platform)', format: 'number' },
  { key: 'totalEmployees', label: 'Total Employees', format: 'number' },
  { key: 'totalBranches', label: 'Total Branches', format: 'number' },
  { key: 'mrr', label: 'Monthly Recurring Revenue', format: 'currency', quickActionLabel: 'View revenue', quickActionPath: '/commercial/billing' },
  { key: 'arr', label: 'Annual Recurring Revenue', format: 'currency' },
  { key: 'revenueToday', label: 'Revenue Today', format: 'currency' },
  { key: 'dau', label: 'Daily Active Users', format: 'number' },
  { key: 'mau', label: 'Monthly Active Users', format: 'number' },
  { key: 'healthScore', label: 'Platform Health Score', format: 'percent', quickActionLabel: 'Monitoring', quickActionPath: '/infrastructure/monitoring' },
];

export default function ExecutiveKPIGrid() {
  const router = useRouter();
  const { data, loading } = usePlatformWidget<Record<string, KPIDatum>>('executive-kpis', fetchRevenueKpis);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {KPI_DEFINITIONS.map((def) => (
        <KPICard
          key={def.key}
          loading={loading}
          datum={data?.[def.key] || null}
          fallbackLabel={def.label}
          onQuickAction={(path) => router.push(path)}
        />
      ))}
    </div>
  );
}
