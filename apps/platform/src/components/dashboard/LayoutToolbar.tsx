'use client';

import React, { useState } from 'react';
import { SlidersHorizontal, RotateCcw, Eye } from 'lucide-react';

const WIDGET_LABELS: Record<string, string> = {
  'platform-health': 'Platform Health',
  'system-monitoring': 'System Monitoring',
  'revenue-analytics': 'Revenue Analytics',
  'organization-overview': 'Organization Overview',
  'subscription-overview': 'Subscription Overview',
  'platform-usage': 'Platform Usage',
  'support-overview': 'Support Overview',
  'activity-timeline': 'Platform Activity Timeline',
  'alerts-center': 'Alerts Center',
  'recent-deployments': 'Recent Deployments',
  announcements: 'Announcements',
  'audit-snapshot': 'Audit Snapshot',
};

interface LayoutToolbarProps {
  hidden: Set<string>;
  isCustomized: boolean;
  onShow: (id: string) => void;
  onRestoreDefault: () => void;
}

export default function LayoutToolbar({ hidden, isCustomized, onShow, onRestoreDefault }: LayoutToolbarProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex items-center gap-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-xl text-[11px] font-bold text-slate-400 hover:text-slate-200 transition-colors"
      >
        <SlidersHorizontal size={13} />
        Customize
        {hidden.size > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 text-[9px]">{hidden.size} hidden</span>
        )}
      </button>

      {isCustomized && (
        <button
          onClick={onRestoreDefault}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-xl text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors"
          title="Restore default layout"
        >
          <RotateCcw size={12} />
          Reset Layout
        </button>
      )}

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-50 p-3 animate-fade-in">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-2">Hidden Widgets</p>
          {hidden.size === 0 ? (
            <p className="text-[11px] text-slate-600 py-2">Nothing hidden. Use the eye icon on any widget to hide it.</p>
          ) : (
            <div className="space-y-1">
              {Array.from(hidden).map((id) => (
                <button
                  key={id}
                  onClick={() => onShow(id)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] text-slate-300 hover:bg-slate-900 transition-colors"
                >
                  <span className="truncate">{WIDGET_LABELS[id] || id}</span>
                  <Eye size={12} className="text-indigo-400 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
