'use client';

import { Repeat } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

export default function PlatformSubscriptionsPage() {
  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Subscriptions"
        description="Active, trialing, and churned organization subscriptions across the platform."
      />
      <PlatformEmptyState icon={Repeat} title="Subscriptions module not built yet" />
    </div>
  );
}
