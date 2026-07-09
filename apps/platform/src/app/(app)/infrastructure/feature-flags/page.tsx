'use client';

import { Flag, Plus } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

export default function PlatformFeatureFlagsPage() {
  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Feature Flags"
        description="Roll features out gradually or restrict them to specific organizations."
        actions={
          <button className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors">
            <Plus size={14} />
            Create Flag
          </button>
        }
      />
      <PlatformEmptyState icon={Flag} title="Feature Flags module not built yet" />
    </div>
  );
}
