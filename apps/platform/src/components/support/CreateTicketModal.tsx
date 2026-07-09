'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { platformSupportApi, platformOrganizationsApi, platformUsersApi } from '@/lib/api';
import { PRIORITY_LABELS } from '@/types/support';
import { TICKET_CATEGORIES } from './TicketFiltersPanel';

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';
const selectClass = inputClass + ' cursor-pointer';

export default function CreateTicketModal({ onClose, onCreated, initialOrganizationId }: { onClose: () => void; onCreated: (ticketId: string) => void; initialOrganizationId?: string }) {
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [engineers, setEngineers] = useState<{ id: string; fullName: string }[]>([]);
  const [organizationId, setOrganizationId] = useState(initialOrganizationId || '');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [category, setCategory] = useState('General');
  const [assignedEngineerId, setAssignedEngineerId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    platformOrganizationsApi.list({ limit: 100 } as any).then((res: any) => setOrgs(res.data || [])).catch(() => setOrgs([]));
    platformUsersApi.list({ limit: 100 } as any).then((res: any) => setEngineers(res.data || [])).catch(() => setEngineers([]));
  }, []);

  const submit = async () => {
    if (!organizationId || !subject.trim()) {
      setError('Organization and subject are required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const ticket = await platformSupportApi.createTicket({ organizationId, subject, description: description || undefined, priority, category, assignedEngineerId: assignedEngineerId || undefined });
      onCreated(ticket.id);
    } catch {
      setError('Failed to create the ticket. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-lg bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10 max-h-[88vh] overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-black text-white">New Support Ticket</span>
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
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary of the issue" className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Additional detail (optional)" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={selectClass}>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
                {TICKET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Assign Engineer (optional)</label>
            <select value={assignedEngineerId} onChange={(e) => setAssignedEngineerId(e.target.value)} className={selectClass}>
              <option value="">Unassigned</option>
              {engineers.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </select>
          </div>

          {error && <p className="text-[11px] text-rose-400">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
          <button
            disabled={busy}
            onClick={submit}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
          >
            {busy && <Loader2 size={13} className="animate-spin" />} Create Ticket
          </button>
        </div>
      </div>
    </div>
  );
}
