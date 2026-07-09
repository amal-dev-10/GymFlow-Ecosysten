'use client';

import { Activity } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

export default function PlatformMonitoringPage() {
  return (
    <div className="space-y-6">
      <PlatformPageHeader title="Monitoring" description="System health, uptime, latency, and error rates across platform services." />
      <PlatformEmptyState icon={Activity} title="Monitoring module not built yet" />
    </div>
  );
}
