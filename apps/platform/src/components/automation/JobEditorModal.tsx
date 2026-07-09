'use client';

import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { platformAutomationApi } from '@/lib/api';
import { JOB_CATEGORIES, SCHEDULE_TYPES, WORKFLOW_TYPES } from '@/types/automation';
import type { AutomationJobDTO, AutomationQueueDTO } from '@/types/automation';

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';
const selectClass = inputClass + ' cursor-pointer';
const labelClass = 'block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5';

export default function JobEditorModal({ job, queues, onClose, onSaved }: { job: AutomationJobDTO | null; queues: AutomationQueueDTO[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(job?.name || '');
  const [category, setCategory] = useState(job?.category || JOB_CATEGORIES[0]);
  const [workflowType, setWorkflowType] = useState(job?.workflowType || '');
  const [description, setDescription] = useState(job?.description || '');
  const [scheduleType, setScheduleType] = useState(job?.scheduleType || 'DAILY');
  const [cronExpression, setCronExpression] = useState(job?.cronExpression || '');
  const [queueKey, setQueueKey] = useState(job?.queueKey || queues[0]?.key || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canSave = name.trim().length > 0 && queueKey.length > 0;

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = { name, category, workflowType: workflowType || undefined, description: description || undefined, scheduleType, cronExpression: scheduleType === 'CUSTOM_CRON' ? cronExpression : undefined, queueKey };
      if (job) await platformAutomationApi.updateJob(job.id, payload);
      else await platformAutomationApi.createJob(payload);
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save job.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-[#0b101d] border border-slate-800 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-850">
          <span className="text-sm font-black text-white">{job ? 'Edit Job' : 'Create Job'}</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Job Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Membership Expiry Check" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
                {JOB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Workflow (optional)</label>
              <select value={workflowType} onChange={(e) => setWorkflowType(e.target.value)} className={selectClass}>
                <option value="">Generic job</option>
                {WORKFLOW_TYPES.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What does this job do?" className={inputClass + ' resize-none'} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Schedule</label>
              <select value={scheduleType} onChange={(e) => setScheduleType(e.target.value)} className={selectClass}>
                {SCHEDULE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Queue</label>
              <select value={queueKey} onChange={(e) => setQueueKey(e.target.value)} className={selectClass}>
                {queues.map((q) => <option key={q.key} value={q.key}>{q.label}</option>)}
              </select>
            </div>
          </div>

          {scheduleType === 'CUSTOM_CRON' && (
            <div>
              <label className={labelClass}>Cron Expression</label>
              <input value={cronExpression} onChange={(e) => setCronExpression(e.target.value)} placeholder="0 3 * * 0" className={inputClass + ' font-mono'} />
              <p className="text-[10px] text-slate-600 mt-1">Stored for reference only - no cron-parsing library is connected in this build. This job advances on a fixed hourly re-check instead of evaluating the expression.</p>
            </div>
          )}

          {error && <p className="text-[11px] text-rose-400">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-850">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 text-xs font-bold hover:border-slate-700">Cancel</button>
          <button onClick={submit} disabled={!canSave || saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold hover:bg-indigo-500/25 disabled:opacity-50">
            <Save size={13} /> {saving ? 'Saving...' : 'Save Job'}
          </button>
        </div>
      </div>
    </div>
  );
}
