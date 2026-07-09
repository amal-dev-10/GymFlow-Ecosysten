'use client';

import { useEffect, useState } from 'react';
import { Bell, Plus, X, Trash2, Play, Loader2 } from 'lucide-react';
import { platformAuditApi, handleApiError } from '@/lib/api';
import type { AuditAlertRuleDTO, AlertPreviewDTO } from '@/types/audit';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const TRIGGER_LABELS: Record<string, string> = {
  CRITICAL_EVENT: 'Critical Events',
  FAILED_PAYMENT: 'Failed Payments',
  REPEATED_LOGIN_FAILURES: 'Repeated Login Failures',
  HIGH_API_ERRORS: 'High API Errors',
  PERMISSION_CHANGES: 'Permission Changes',
  SECURITY_RISK: 'Security Risks',
};

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';
const selectClass = inputClass + ' cursor-pointer';

function AlertRuleModal({ rule, onClose, onSaved, showToast }: { rule: AuditAlertRuleDTO | null; onClose: () => void; onSaved: () => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [triggerType, setTriggerType] = useState<string>(rule?.triggerType || 'CRITICAL_EVENT');
  const [threshold, setThreshold] = useState(rule?.conditions.threshold ?? 1);
  const [windowMinutes, setWindowMinutes] = useState(rule?.conditions.windowMinutes ?? 60);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const payload = { name: name.trim(), description: description || undefined, triggerType, conditions: { threshold, windowMinutes } };
      if (rule) await platformAuditApi.updateAlertRule(rule.id, payload);
      else await platformAuditApi.createAlertRule(payload);
      showToast(`Alert rule "${name}" saved.`);
      onSaved();
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
          <h3 className="text-base font-extrabold text-white">{rule ? 'Edit Alert Rule' : 'Create Alert Rule'}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Critical Event Alert" className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this alert watch for?" className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Trigger On</label>
            <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} className={selectClass}>
              {Object.entries(TRIGGER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Threshold</label>
              <input type="number" min={1} value={threshold} onChange={(e) => setThreshold(Math.max(1, Number(e.target.value)))} className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Window (minutes)</label>
              <input type="number" min={1} value={windowMinutes} onChange={(e) => setWindowMinutes(Math.max(1, Number(e.target.value)))} className={inputClass} />
            </div>
          </div>
          <p className="text-[10px] text-slate-600">No email/Slack delivery is wired up yet - this rule computes a live match preview so you can validate it before connecting a channel.</p>
        </div>
        <button onClick={save} disabled={busy || !name.trim()} className="w-full flex items-center justify-center gap-1.5 py-2.5 mt-5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
          {busy ? 'Saving...' : 'Save Rule'}
        </button>
      </div>
    </div>
  );
}

export default function AlertsSection({ canManage, showToast }: { canManage: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [rules, setRules] = useState<AuditAlertRuleDTO[] | null>(null);
  const [previews, setPreviews] = useState<Record<string, AlertPreviewDTO | 'loading'>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AuditAlertRuleDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AuditAlertRuleDTO | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    platformAuditApi.listAlertRules().then(setRules).catch(() => setRules([]));
  };

  useEffect(() => {
    load();
  }, []);

  const toggleEnabled = async (rule: AuditAlertRuleDTO) => {
    try {
      await platformAuditApi.updateAlertRule(rule.id, { isEnabled: !rule.isEnabled });
      load();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };

  const runPreview = (id: string) => {
    setPreviews((p) => ({ ...p, [id]: 'loading' }));
    platformAuditApi
      .previewAlertRule(id)
      .then((res) => setPreviews((p) => ({ ...p, [id]: res })))
      .catch(() => setPreviews((p) => { const next = { ...p }; delete next[id]; return next; }));
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await platformAuditApi.removeAlertRule(deleteTarget.id);
      showToast(`Deleted "${deleteTarget.name}".`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!rules) return <div className="h-48 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Configuration + live preview only - no email/Slack delivery exists yet in this codebase.</p>
        {canManage && (
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors shrink-0">
            <Plus size={14} /> Create Alert
          </button>
        )}
      </div>

      {rules.length === 0 ? (
        <PlatformEmptyState icon={Bell} title="No alert rules yet" description="Create a rule to watch for critical events, security risks, or repeated failures." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rules.map((r) => {
            const preview = previews[r.id];
            return (
              <div key={r.id} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-100 block truncate">{r.name}</span>
                    <span className="text-[10px] text-indigo-400 font-semibold">{TRIGGER_LABELS[r.triggerType] || r.triggerType}</span>
                  </div>
                  {canManage && (
                    <button onClick={() => toggleEnabled(r)} className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${r.isEnabled ? 'bg-indigo-500' : 'bg-slate-800'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${r.isEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  )}
                </div>
                {r.description && <p className="text-[11px] text-slate-500 mt-2">{r.description}</p>}
                <p className="text-[10px] text-slate-600 mt-1">Threshold {r.conditions.threshold} within {r.conditions.windowMinutes}m</p>

                <div className="mt-3 pt-3 border-t border-slate-900/60 flex items-center justify-between gap-2">
                  <button onClick={() => runPreview(r.id)} className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-indigo-300 transition-colors">
                    {preview === 'loading' ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                    Check Now
                  </button>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditing(r); setModalOpen(true); }} className="text-[11px] font-bold text-slate-500 hover:text-indigo-300 transition-colors">Edit</button>
                      <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors"><Trash2 size={11} /></button>
                    </div>
                  )}
                </div>

                {preview && preview !== 'loading' && (
                  <div className={`mt-2 text-[11px] font-semibold ${preview.wouldTrigger ? 'text-rose-400' : 'text-slate-500'}`}>
                    {preview.matchCount} match{preview.matchCount === 1 ? '' : 'es'} in the last {preview.windowMinutes}m {preview.wouldTrigger ? '- would trigger' : '- below threshold'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && <AlertRuleModal rule={editing} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load(); }} showToast={showToast} />}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
          <div className="fixed inset-0" onClick={() => setDeleteTarget(null)} />
          <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
            <h3 className="text-base font-extrabold text-white mb-2">Delete Alert Rule</h3>
            <p className="text-xs text-slate-400 mb-5">Permanently delete <b className="text-slate-200">{deleteTarget.name}</b>?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
              <button onClick={remove} disabled={busy} className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">{busy ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
