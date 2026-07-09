'use client';

import React from 'react';
import { Plug } from 'lucide-react';

/** Compact "no data source yet" state used inside dashboard widget cards. */
export default function WidgetEmptyState({ label = 'Not connected to a backend endpoint yet.' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 gap-2">
      <Plug size={18} className="text-slate-700" />
      <p className="text-[11px] text-slate-600 max-w-[220px]">{label}</p>
    </div>
  );
}
