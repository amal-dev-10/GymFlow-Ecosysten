'use client';

import { useState } from 'react';
import { Gem, Save, Lock } from 'lucide-react';
import { SectionCard } from '../shared';
import type { Org360Subscription } from '@/types/org360';

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';

interface Props {
  subscription: Org360Subscription;
  currency: string;
  canManage: boolean;
  onSave: (payload: { isEnterpriseCustom: boolean; customPrice: number | null; privateNotes: string; dedicatedSupportContact: string; customSlaTerms: string }) => Promise<void>;
}

export default function EnterpriseSettingsPanel({ subscription: s, currency, canManage, onSave }: Props) {
  const [enabled, setEnabled] = useState(s.isEnterpriseCustom);
  const [customPrice, setCustomPrice] = useState(s.customPrice != null ? String(s.customPrice) : '');
  const [notes, setNotes] = useState(s.privateNotes || '');
  const [contact, setContact] = useState(s.dedicatedSupportContact || '');
  const [sla, setSla] = useState(s.customSlaTerms || '');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  const mark = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      await onSave({
        isEnterpriseCustom: enabled,
        customPrice: customPrice === '' ? null : Number(customPrice),
        privateNotes: notes,
        dedicatedSupportContact: contact,
        customSlaTerms: sla,
      });
      setDirty(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title="Enterprise Settings"
      action={
        <div className="flex items-center gap-2">
          <Gem size={14} className="text-amber-400" />
          {canManage && dirty && (
            <button onClick={save} disabled={busy} className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-40">
              <Save size={11} /> {busy ? 'Saving' : 'Save'}
            </button>
          )}
        </div>
      }
    >
      <label className="flex items-center justify-between mb-4 cursor-pointer">
        <span className="text-xs font-semibold text-slate-300">Hand-negotiated Enterprise deal</span>
        <input type="checkbox" checked={enabled} disabled={!canManage} onChange={(e) => mark(setEnabled)(e.target.checked)} className="accent-amber-500" />
      </label>

      {enabled && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Custom Pricing ({currency})</label>
            <input
              type="number"
              min={0}
              disabled={!canManage}
              value={customPrice}
              onChange={(e) => mark(setCustomPrice)(e.target.value)}
              placeholder="Overrides the plan's list price"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Dedicated Support Contact</label>
            <input disabled={!canManage} value={contact} onChange={(e) => mark(setContact)(e.target.value)} placeholder="e.g. enterprise-support@gymflow.test" className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Custom SLA Terms</label>
            <textarea disabled={!canManage} value={sla} onChange={(e) => mark(setSla)(e.target.value)} rows={2} className={inputClass} />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              <Lock size={10} /> Private Notes (Platform Admin only)
            </label>
            <textarea disabled={!canManage} value={notes} onChange={(e) => mark(setNotes)(e.target.value)} rows={3} placeholder="Never shown to the tenant." className={inputClass} />
          </div>
          <p className="text-[10px] text-slate-600">
            Custom limits are managed from the Feature & Limit Engine&apos;s Override Center to keep a single source of truth.
          </p>
        </div>
      )}
    </SectionCard>
  );
}
