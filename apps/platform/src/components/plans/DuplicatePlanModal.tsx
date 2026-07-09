'use client';

import { useState } from 'react';
import { X, Copy, GitBranch, RefreshCw } from 'lucide-react';
import type { PlanDTO } from '@/types/plans';

interface Props {
  plan: PlanDTO;
  onClose: () => void;
  onConfirm: (mode: 'clone' | 'version') => Promise<void>;
}

export default function DuplicatePlanModal({ plan, onClose, onConfirm }: Props) {
  const [mode, setMode] = useState<'clone' | 'version'>('clone');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(mode);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-md bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-base font-extrabold text-white">Duplicate Plan</h3>
            <p className="text-[11px] text-slate-400 mt-1">Duplicating <b className="text-indigo-300">{plan.name}</b></p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setMode('clone')}
            className={`w-full text-left p-4 rounded-xl border transition-colors ${mode === 'clone' ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-slate-800 hover:border-slate-700'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Copy size={14} className="text-indigo-400" />
              <span className="text-xs font-bold text-slate-100">Clone all configuration</span>
            </div>
            <p className="text-[11px] text-slate-500">Creates an independent new plan (new internal code) as a draft, copying every resource limit and feature.</p>
          </button>

          <button
            onClick={() => setMode('version')}
            className={`w-full text-left p-4 rounded-xl border transition-colors ${mode === 'version' ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-slate-800 hover:border-slate-700'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <GitBranch size={14} className="text-indigo-400" />
              <span className="text-xs font-bold text-slate-100">Create new version</span>
            </div>
            <p className="text-[11px] text-slate-500">Creates a draft next version of this plan (v{plan.version + 1}) so you can iterate before activating it.</p>
          </button>
        </div>

        <div className="flex gap-3 pt-5">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            {loading ? <RefreshCw className="animate-spin" size={13} /> : 'Duplicate'}
          </button>
        </div>
      </div>
    </div>
  );
}
