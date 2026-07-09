'use client';

import { Webhook } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

export default function PlatformApiManagementPage() {
  return (
    <div className="space-y-6">
      <PlatformPageHeader title="API Management" description="API keys, rate limits, and webhook deliveries across organizations." />
      <PlatformEmptyState icon={Webhook} title="API Management module not built yet" />
    </div>
  );
}
