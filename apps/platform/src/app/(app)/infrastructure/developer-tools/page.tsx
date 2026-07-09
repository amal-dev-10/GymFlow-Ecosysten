'use client';

import { Terminal } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

export default function PlatformDeveloperToolsPage() {
  return (
    <div className="space-y-6">
      <PlatformPageHeader title="Developer Tools" description="Internal tooling for debugging, data inspection, and platform diagnostics." />
      <PlatformEmptyState icon={Terminal} title="Developer Tools module not built yet" />
    </div>
  );
}
