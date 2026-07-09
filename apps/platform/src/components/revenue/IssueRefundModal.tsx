'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { platformRevenueApi } from '@/lib/api';

export default function IssueRefundModal({
  paymentId,
  organizationId,
  organizationName,
  maxAmount,
  onClose,
  onDone,
}: {
  paymentId: string;
  organizationId: string;
  organizationName: string;
  maxAmount: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(String(maxAmount));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0 || amountNum > maxAmount) {
      setError(`Enter an amount between 0.01 and ${maxAmount}.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await platformRevenueApi.refundPayment(paymentId, { organizationId, amount: amountNum, reason: reason || undefined });
      onDone();
    } catch {
      setError('Failed to issue the refund. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-black text-white">Issue Refund</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <p className="text-[11px] text-slate-500 mb-4">{organizationName}</p>

        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Refund Amount (max {maxAmount})</label>
        <input type="number" min="0.01" max={maxAmount} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none mb-3" />

        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Reason (optional)</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none" />

        {error && <p className="text-[11px] text-rose-400 mt-2">{error}</p>}

        <button disabled={busy} onClick={submit} className="w-full mt-4 flex items-center justify-center gap-1.5 py-2.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
          {busy && <Loader2 size={13} className="animate-spin" />} Issue Refund
        </button>
      </div>
    </div>
  );
}
