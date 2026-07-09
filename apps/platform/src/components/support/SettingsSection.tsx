'use client';

import { Timer, BookOpen, ArrowUpCircle, ShieldAlert } from 'lucide-react';
import { ESCALATION_LEVELS } from '@/types/support';
import { TICKET_CATEGORIES } from './TicketFiltersPanel';
import type { SupportTabId } from './SupportCenterTabs';

export default function SettingsSection({ canManage, onNavigate }: { canManage: boolean; onNavigate: (tab: SupportTabId) => void }) {
  return (
    <div className="space-y-4">
      {!canManage && (
        <p className="text-[11px] text-slate-500 bg-slate-900/40 border border-slate-850 rounded-xl px-3 py-2">Only Super Administrators can change SLA policies and manage the knowledge base. You can still view current settings below.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onClick={() => onNavigate('sla')} className="bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 text-left transition-colors">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200"><Timer size={13} className="text-cyan-400" /> SLA Policies</span>
          <p className="text-[11px] text-slate-500 mt-1.5">Configure first-response and resolution time targets per priority.</p>
        </button>
        <button onClick={() => onNavigate('kb')} className="bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 text-left transition-colors">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200"><BookOpen size={13} className="text-emerald-400" /> Knowledge Base</span>
          <p className="text-[11px] text-slate-500 mt-1.5">Publish and manage Articles, FAQs, Troubleshooting guides and Internal docs.</p>
        </button>
      </div>

      <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200"><ArrowUpCircle size={13} className="text-orange-400" /> Escalation Ladder</span>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {ESCALATION_LEVELS.map((l, i) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold px-2 py-1 rounded-full border text-slate-300 bg-slate-900 border-slate-800">{l}</span>
              {i < ESCALATION_LEVELS.length - 1 && <span className="text-slate-700">→</span>}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200"><ShieldAlert size={13} className="text-indigo-400" /> Ticket Categories</span>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {TICKET_CATEGORIES.map((c) => <span key={c} className="text-[10px] font-semibold text-slate-400 bg-slate-900 border border-slate-850 px-2 py-1 rounded-full">{c}</span>)}
        </div>
      </div>
    </div>
  );
}
