'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Layers, Activity, DollarSign, LifeBuoy, Users, Flag, Settings } from 'lucide-react';

const ACTIONS = [
  { label: 'Create Organization', icon: Plus, path: '/organizations?action=create' },
  { label: 'Create Plan', icon: Layers, path: '/commercial/plans?action=create' },
  { label: 'Open Monitoring', icon: Activity, path: '/infrastructure/monitoring' },
  { label: 'View Revenue', icon: DollarSign, path: '/commercial/billing' },
  { label: 'Support Center', icon: LifeBuoy, path: '/operations/support' },
  { label: 'Platform Users', icon: Users, path: '/operations/platform-users' },
  { label: 'Feature Flags', icon: Flag, path: '/infrastructure/feature-flags' },
  { label: 'Global Settings', icon: Settings, path: '/infrastructure/global-settings' },
];

export default function QuickActionsBar() {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((a) => (
        <button
          key={a.label}
          onClick={() => router.push(a.path)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 hover:bg-indigo-500/5 rounded-xl text-[11px] font-bold text-slate-300 hover:text-indigo-300 transition-colors"
        >
          <a.icon size={13} className="text-indigo-400" />
          {a.label}
        </button>
      ))}
    </div>
  );
}
