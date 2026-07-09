'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Layers, TrendingUp, TrendingDown, PauseCircle, PlayCircle, Ban, FileText } from 'lucide-react';

interface Props {
  status: string;
  canManage: boolean;
  onAssign: () => void;
  onUpgrade: () => void;
  onDowngrade: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onGenerateInvoice: () => void;
}

export default function SubscriptionQuickActions({ status, canManage, onAssign, onUpgrade, onDowngrade, onPause, onResume, onCancel, onGenerateInvoice }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isPaused = status === 'Paused';
  const isCancelled = status === 'Canceled';

  const item = (icon: React.ReactNode, label: string, onClick: () => void, danger = false) => (
    <button
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${danger ? 'text-rose-400 hover:bg-rose-500/10' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}
    >
      {icon}
      {label}
    </button>
  );

  if (!canManage) return null;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors">
        Subscription Actions
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-30 p-1.5 animate-fade-in">
          {item(<Layers size={14} className="text-indigo-400" />, 'Assign Plan', onAssign)}
          {item(<TrendingUp size={14} className="text-emerald-400" />, 'Upgrade', onUpgrade)}
          {item(<TrendingDown size={14} className="text-amber-400" />, 'Downgrade', onDowngrade)}
          <div className="my-1 border-t border-slate-850" />
          {!isCancelled && (isPaused ? item(<PlayCircle size={14} className="text-emerald-400" />, 'Resume Subscription', onResume) : item(<PauseCircle size={14} />, 'Pause Subscription', onPause, true))}
          {!isCancelled && item(<Ban size={14} />, 'Cancel Subscription', onCancel, true)}
          <div className="my-1 border-t border-slate-850" />
          {item(<FileText size={14} className="text-indigo-400" />, 'Generate Invoice', onGenerateInvoice)}
        </div>
      )}
    </div>
  );
}
