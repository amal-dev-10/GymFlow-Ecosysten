'use client';

import React from 'react';

interface PlatformPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/**
 * Standard page header for every Platform Administration page: title +
 * description on the left, optional action buttons on the right. Every
 * platform module page should start with this for visual consistency.
 */
export default function PlatformPageHeader({ title, description, actions }: PlatformPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800/60">
      <div>
        <h1 className="text-xl font-bold text-slate-50 tracking-tight">{title}</h1>
        {description && <p className="text-xs text-slate-400 mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
