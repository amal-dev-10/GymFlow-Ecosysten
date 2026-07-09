'use client';

import { useState } from 'react';
import { Clock, PlusCircle, CheckCircle2 } from 'lucide-react';
import { SectionCard, fmtDate } from '../shared';
import type { Org360Subscription } from '@/types/org360';

interface Props {
  subscription: Org360Subscription;
  canManage: boolean;
  onExtend: (days: number) => Promise<void>;
  onEndTrial: () => Promise<void>;
}

export default function TrialManagementPanel({ subscription: s, canManage, onExtend, onEndTrial }: Props) {
  const [extendOpen, setExtendOpen] = useState(false);
  const [days, setDays] = useState(14);
  const [busy, setBusy] = useState(false);

  if (!s.isTrial && s.status !== 'Trialing') return null;

  const submit = async () => {
    setBusy(true);
    try {
      await onExtend(days);
      setExtendOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="Trial Management" action={<Clock size={14} className="text-sky-400" />}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-2xl font-black text-slate-100">{s.trialDaysLeft ?? 0}</span>
          <span className="text-xs text-slate-500 ml-1.5">day(s) remaining</span>
        </div>
        <span className="text-[11px] text-slate-500">Ends {fmtDate(s.trialEndDate)}</span>
      </div>

      {canManage && (
        <div className="flex gap-2">
          {!extendOpen ? (
            <button onClick={() => setExtendOpen(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-300 text-[11px] font-bold rounded-xl transition-colors">
              <PlusCircle size={13} /> Extend Trial
            </button>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-16 bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-lg px-2 py-1.5 text-xs text-slate-100 outline-none"
              />
              <span className="text-[11px] text-slate-500">days</span>
              <button onClick={submit} disabled={busy} className="flex-1 py-1.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-[11px] font-bold rounded-lg transition-colors disabled:opacity-40">
                {busy ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          )}
          <button onClick={onEndTrial} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 text-emerald-300 text-[11px] font-bold rounded-xl transition-colors">
            <CheckCircle2 size={13} /> Convert To Paid
          </button>
        </div>
      )}
    </SectionCard>
  );
}
