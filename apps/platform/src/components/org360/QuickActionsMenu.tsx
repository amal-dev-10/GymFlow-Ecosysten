'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  UserCog,
  Layers,
  Ban,
  PlayCircle,
  RotateCcw,
  Bell,
  LifeBuoy,
  Download,
  Archive,
} from 'lucide-react';

export interface QuickActionGates {
  canImpersonate: boolean;
  canManage: boolean; // suspend/activate/archive/reset-limits
  canAssignPlan: boolean;
  canNotify: boolean;
  canSupport: boolean;
}

interface Props {
  isSuspended: boolean;
  isArchived: boolean;
  gates: QuickActionGates;
  onImpersonate: () => void;
  onAssignPlan: () => void;
  onSuspend: () => void;
  onActivate: () => void;
  onResetLimits: () => void;
  onNotify: () => void;
  onSupportTicket: () => void;
  onExport: () => void;
  onArchive: () => void;
}

export default function QuickActionsMenu({ isSuspended, isArchived, gates, onImpersonate, onAssignPlan, onSuspend, onActivate, onResetLimits, onNotify, onSupportTicket, onExport, onArchive }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const item = (icon: React.ReactNode, label: string, onClick: () => void, danger = false) => (
    <button
      onClick={() => { setOpen(false); onClick(); }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${danger ? 'text-rose-400 hover:bg-rose-500/10' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors"
      >
        Quick Actions
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-30 p-1.5 animate-fade-in">
          {gates.canImpersonate && !isArchived && item(<UserCog size={14} className="text-indigo-400" />, 'Impersonate', onImpersonate)}
          {gates.canAssignPlan && item(<Layers size={14} className="text-indigo-400" />, 'Assign Subscription', onAssignPlan)}
          {gates.canManage && (
            <>
              <div className="my-1 border-t border-slate-850" />
              {!isSuspended && !isArchived && item(<Ban size={14} />, 'Suspend Organization', onSuspend, true)}
              {(isSuspended || isArchived) && item(<PlayCircle size={14} className="text-emerald-400" />, 'Activate Organization', onActivate)}
              {item(<RotateCcw size={14} className="text-indigo-400" />, 'Reset Limits', onResetLimits)}
            </>
          )}
          <div className="my-1 border-t border-slate-850" />
          {gates.canNotify && item(<Bell size={14} className="text-indigo-400" />, 'Send Notification', onNotify)}
          {gates.canSupport && item(<LifeBuoy size={14} className="text-indigo-400" />, 'Open Support Ticket', onSupportTicket)}
          {item(<Download size={14} className="text-indigo-400" />, 'Export Organization', onExport)}
          {gates.canManage && !isArchived && item(<Archive size={14} />, 'Archive Organization', onArchive, true)}
        </div>
      )}
    </div>
  );
}
