'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { platformRevenueApi, platformOrganizationsApi } from '@/lib/api';

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';
const selectClass = inputClass + ' cursor-pointer';

export default function GenerateInvoiceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    platformOrganizationsApi.list({ limit: 100 } as any).then((res: any) => setOrgs(res.data || [])).catch(() => setOrgs([]));
  }, []);

  const submit = async () => {
    const amountNum = Number(amount);
    if (!organizationId || !amountNum || amountNum <= 0) {
      setError('Organization and a positive amount are required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await platformRevenueApi.generateInvoice({ organizationId, amount: amountNum, description: description || undefined, dueDate: dueDate || undefined, taxRate: taxRate ? Number(taxRate) : undefined });
      onCreated();
    } catch {
      setError('Failed to generate the invoice. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-lg bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10 max-h-[88vh] overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-black text-white">Generate Invoice</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Organization</label>
            <select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} className={selectClass}>
              <option value="">Select an organization...</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Amount (USD)</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Tax Rate % (optional)</label>
              <input type="number" min="0" step="0.1" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="0" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Due Date (optional)</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
          </div>
          {error && <p className="text-[11px] text-rose-400">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
          <button disabled={busy} onClick={submit} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
            {busy && <Loader2 size={13} className="animate-spin" />} Generate Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
