'use client';

import { ReactNode } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

// The spec's central mandate: agents should rarely leave this workspace.
// Desktop = genuine 3-column layout (ticket rail · conversation · context
// sidebar); tablet collapses the rail; mobile stacks into a single-column
// inbox (handled by the page itself switching to TicketList on small
// screens rather than trying to cram 3 columns).
export default function TicketDetailShell({
  leftRail,
  center,
  right,
  leftCollapsed,
  onToggleLeft,
}: {
  leftRail: ReactNode;
  center: ReactNode;
  right: ReactNode;
  leftCollapsed: boolean;
  onToggleLeft: () => void;
}) {
  return (
    <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[520px]">
      <div className={`hidden lg:flex flex-col shrink-0 transition-[width] duration-150 ${leftCollapsed ? 'w-0 overflow-hidden' : 'w-72'}`}>
        {leftRail}
      </div>

      <div className="hidden lg:flex items-start pt-2">
        <button
          onClick={onToggleLeft}
          className="w-7 h-7 rounded-lg bg-[#0b101d] border border-slate-800/80 flex items-center justify-center text-slate-500 hover:text-indigo-300 hover:border-indigo-500/30 transition-colors"
          title={leftCollapsed ? 'Show ticket list' : 'Hide ticket list'}
        >
          {leftCollapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
        </button>
      </div>

      <div className="flex-1 min-w-0 flex flex-col bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-hidden">{center}</div>

      <div className="hidden xl:flex flex-col w-80 shrink-0 overflow-y-auto scrollbar-thin space-y-3 pr-1">{right}</div>
    </div>
  );
}
