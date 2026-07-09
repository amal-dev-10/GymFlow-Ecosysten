'use client';

import { useState } from 'react';
import { Ticket, Plus, X, Layers } from 'lucide-react';
import { SectionCard, EmptyRow, fmtDate } from '../shared';
import { handleApiError } from '@/lib/api';
import type { AppliedCoupon } from '@/types/org360';

interface Props {
  coupons: AppliedCoupon[];
  currency: string;
  canManage: boolean;
  onApply: (code: string) => Promise<void>;
  onRemove: (redemptionId: string) => Promise<void>;
}

export default function CouponsPanel({ coupons, currency, canManage, onApply, onRemove }: Props) {
  const [applyOpen, setApplyOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const activeCoupons = coupons.filter((c) => c.active);
  const removedCoupons = coupons.filter((c) => !c.active);

  const submit = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setError('');
    try {
      await onApply(code.trim().toUpperCase());
      setCode('');
      setApplyOpen(false);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title="Coupons"
      action={
        canManage && (
          <button onClick={() => setApplyOpen((v) => !v)} className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300">
            <Plus size={11} /> Apply
          </button>
        )
      }
    >
      {applyOpen && (
        <div className="flex items-center gap-2 mb-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="COUPON CODE"
            className="flex-1 bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-600 outline-none uppercase"
          />
          <button onClick={submit} disabled={busy || !code.trim()} className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-[11px] font-bold rounded-lg transition-colors disabled:opacity-40">
            {busy ? '...' : 'Apply'}
          </button>
        </div>
      )}
      {error && <p className="text-[11px] text-rose-400 mb-3">{error}</p>}

      {activeCoupons.length === 0 && removedCoupons.length === 0 ? (
        <div className="text-center py-4">
          <Ticket size={18} className="text-slate-700 mx-auto mb-2" />
          <EmptyRow text="No coupons applied to this subscription." />
        </div>
      ) : (
        <div className="space-y-2">
          {activeCoupons.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-850">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold font-mono text-slate-200">{c.code}</span>
                  {c.stackable && <span className="text-[9px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Layers size={9} /> stackable</span>}
                </div>
                <span className="text-[10px] text-slate-500">
                  {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% off` : `${c.discountValue} ${currency} off`} · applied {fmtDate(c.redeemedAt)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400">-{c.discountApplied} {currency}</span>
                {canManage && (
                  <button onClick={() => onRemove(c.id)} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/30 text-slate-500 hover:text-rose-400 transition-colors">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {removedCoupons.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/20 border border-slate-900 opacity-60">
              <div>
                <span className="text-xs font-bold font-mono text-slate-400 line-through">{c.code}</span>
                <span className="block text-[10px] text-slate-600">Removed {fmtDate(c.removedAt)}</span>
              </div>
              <span className="text-[9px] font-bold text-slate-600 bg-slate-900 px-2 py-0.5 rounded-full">REMOVED</span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
