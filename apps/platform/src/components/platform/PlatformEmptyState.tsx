'use client';

import React from 'react';
import { LucideIcon, Construction } from 'lucide-react';

interface PlatformEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * Shared empty/placeholder state for Platform Administration modules that
 * don't have real data wired up yet, and for genuine zero-result states
 * once they do. Never fabricate sample data here - show this instead.
 */
export default function PlatformEmptyState({ icon: Icon = Construction, title, description, action }: PlatformEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-4">
        <Icon size={24} />
      </div>
      <h3 className="text-sm font-bold text-slate-200">{title}</h3>
      {description && <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
