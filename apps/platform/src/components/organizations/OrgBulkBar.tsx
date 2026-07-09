'use client';

import { useState } from 'react';
import { Ban, PlayCircle, Layers, Bell, Download, Archive, X } from 'lucide-react';
import type { PlanDTO } from '@/types/plans';

interface Props {
  count: number;
  canManage: boolean;
  plans: PlanDTO[];
  onClear: () => void;
  onBulk: (action: 'suspend' | 'activate' | 'archive' | 'notify' | 'assign_plan', planId?: string) => void;
  onExport: () => void;
  busy: boolean;
}

export default function OrgBulkBar({ count, canManage, plans, onClear, onBulk, onExport, busy }: Props) {
  const [assignOpen, setAssignOpen] = useState(false);

  const btn = 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors disabled:opacity-40';

  return (
    <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 bg-[#0b101d]/95 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-3 shadow-2xl">
      <span className="flex items-center gap-2 text-xs font-bold text-indigo-300 pl-1">
        <span className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-[10px]">{count}</span>
        selected
      </span>

      <div className="h-5 w-px bg-slate-800 mx-1" />

      {canManage && (
        <>
          <button disabled={busy} onClick={() => onBulk('activate')} className={`${btn} bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/15`}>
            <PlayCircle size={13} /> Activate
          </button>
          <button disabled={busy} onClick={() => onBulk('suspend')} className={`${btn} bg-rose-500/10 border-rose-500/20 text-rose-300 hover:bg-rose-500/15`}>
            <Ban size={13} /> Suspend
          </button>

          <div className="relative">
            <button disabled={busy} onClick={() => setAssignOpen((v) => !v)} className={`${btn} bg-slate-900 border-slate-800 text-slate-300 hover:border-indigo-500/30`}>
              <Layers size={13} /> Assign Plan
            </button>
            {assignOpen && (
              <div className="absolute left-0 mt-2 w-52 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-30 p-1.5">
                {plans.length === 0 && <p className="px-3 py-2 text-[11px] text-slate-600">No active plans</p>}
                {plans.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setAssignOpen(false);
                      onBulk('assign_plan', p.id);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition-colors truncate"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button disabled={busy} onClick={() => onBulk('notify')} className={`${btn} bg-slate-900 border-slate-800 text-slate-300 hover:border-indigo-500/30`}>
            <Bell size={13} /> Notify
          </button>
        </>
      )}

      <button disabled={busy} onClick={onExport} className={`${btn} bg-slate-900 border-slate-800 text-slate-300 hover:border-indigo-500/30`}>
        <Download size={13} /> Export
      </button>

      {canManage && (
        <button disabled={busy} onClick={() => onBulk('archive')} className={`${btn} bg-slate-900 border-slate-800 text-slate-400 hover:text-rose-300 hover:border-rose-500/30`}>
          <Archive size={13} /> Archive
        </button>
      )}

      <button onClick={onClear} className="ml-auto flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors">
        <X size={12} /> Clear
      </button>
    </div>
  );
}
