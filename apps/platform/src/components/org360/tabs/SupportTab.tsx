'use client';

import { useEffect, useState } from 'react';
import { Plus, LifeBuoy, Star, X, UserCog } from 'lucide-react';
import { platformOrganizationsApi, handleApiError } from '@/lib/api';
import type { Org360Support, SupportTicket, SupportTicketStatus, SupportTicketPriority } from '@/types/org360';
import { SectionCard, TabLoading, EmptyRow, fmtRelative } from '../shared';

const STATUS_CFG: Record<SupportTicketStatus, string> = {
  OPEN: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
  IN_PROGRESS: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  RESOLVED: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  CLOSED: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};
const PRIORITY_CFG: Record<SupportTicketPriority, string> = {
  LOW: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  MEDIUM: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
  HIGH: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  URGENT: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
};

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';

function NewTicketModal({ orgId, onClose, onCreated, showToast }: { orgId: string; onClose: () => void; onCreated: () => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [category, setCategory] = useState('Technical');
  const [assignedEngineer, setAssignedEngineer] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await platformOrganizationsApi.createSupportTicket(orgId, { subject, description: description || undefined, priority, category, assignedEngineer: assignedEngineer || undefined });
      showToast('Support ticket created.');
      onCreated();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-md bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold text-white">Open Support Ticket</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className={inputClass} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Describe the issue..." className={inputClass} />
          <div className="grid grid-cols-2 gap-3">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputClass} cursor-pointer`}>
              {['Technical', 'Billing', 'Account', 'Feature Request', 'Other'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={`${inputClass} cursor-pointer`}>
              {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
          <input value={assignedEngineer} onChange={(e) => setAssignedEngineer(e.target.value)} placeholder="Assign engineer (optional)" className={inputClass} />
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
          <button onClick={submit} disabled={busy || !subject} className="flex-1 py-3 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
            {busy ? 'Creating...' : 'Create Ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Csat({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={11} className={i <= score ? 'text-amber-400 fill-amber-400' : 'text-slate-700'} />)}
    </span>
  );
}

export default function SupportTab({ orgId, canManage, showToast }: { orgId: string; canManage: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [data, setData] = useState<Org360Support | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    platformOrganizationsApi.getSupport(orgId).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  };
  useEffect(load, [orgId]);

  if (loading) return <TabLoading />;
  if (!data) return null;

  const openTickets = data.tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  const closedTickets = data.tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED');

  const TicketCard = ({ t }: { t: SupportTicket }) => (
    <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-850">
      <button onClick={() => setExpanded(expanded === t.id ? null : t.id)} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-bold text-slate-200">{t.subject}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_CFG[t.priority]}`}>{t.priority}</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${STATUS_CFG[t.status]}`}>{t.status.replace('_', ' ')}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
          {t.category && <span>{t.category}</span>}
          {t.assignedEngineer && <span className="flex items-center gap-1"><UserCog size={10} /> {t.assignedEngineer}</span>}
          <span>{fmtRelative(t.createdAt)}</span>
          {t.satisfactionScore != null && <Csat score={t.satisfactionScore} />}
        </div>
      </button>
      {expanded === t.id && (t.description || t.internalNotes) && (
        <div className="mt-3 pt-3 border-t border-slate-850 space-y-2">
          {t.description && <p className="text-[11px] text-slate-400">{t.description}</p>}
          {t.internalNotes && (
            <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400/80">Internal Note</span>
              <p className="text-[11px] text-slate-400 mt-0.5">{t.internalNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Open', value: data.summary.open },
          { label: 'Closed', value: data.summary.closed },
          { label: 'Urgent', value: data.summary.urgent, tone: data.summary.urgent > 0 ? 'text-rose-400' : undefined },
          { label: 'Avg CSAT', value: data.summary.avgCsat != null ? `${data.summary.avgCsat}/5` : '—' },
        ].map((c) => (
          <div key={c.label} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{c.label}</span>
            <span className={`text-xl font-black block mt-2 ${c.tone || 'text-slate-100'}`}>{c.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          title={`Open Tickets · ${openTickets.length}`}
          action={canManage && <button onClick={() => setModalOpen(true)} className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300"><Plus size={11} /> New</button>}
        >
          {openTickets.length === 0 ? (
            <div className="text-center py-4"><LifeBuoy size={18} className="text-slate-700 mx-auto mb-2" /><p className="text-[11px] text-slate-500">No open tickets.</p></div>
          ) : (
            <div className="space-y-2">{openTickets.map((t) => <TicketCard key={t.id} t={t} />)}</div>
          )}
        </SectionCard>

        <SectionCard title={`Resolved & Closed · ${closedTickets.length}`}>
          {closedTickets.length === 0 ? (
            <EmptyRow text="No closed tickets." />
          ) : (
            <div className="space-y-2">{closedTickets.map((t) => <TicketCard key={t.id} t={t} />)}</div>
          )}
        </SectionCard>
      </div>

      {modalOpen && <NewTicketModal orgId={orgId} onClose={() => setModalOpen(false)} onCreated={() => { setModalOpen(false); load(); }} showToast={showToast} />}
    </div>
  );
}
