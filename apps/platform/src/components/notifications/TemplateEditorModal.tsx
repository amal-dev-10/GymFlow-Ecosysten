'use client';

import { useMemo, useState } from 'react';
import { X, Save, Eye } from 'lucide-react';
import { platformNotificationsApi } from '@/lib/api';
import { TEMPLATE_CATEGORIES } from '@/types/notifications';
import type { NotificationTemplateDTO } from '@/types/notifications';

const CHANNEL_OPTIONS = [{ value: 'in_app', label: 'In-App' }, { value: 'push', label: 'Push' }, { value: 'email', label: 'Email' }, { value: 'sms', label: 'SMS' }, { value: 'whatsapp', label: 'WhatsApp' }];
const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';
const selectClass = inputClass + ' cursor-pointer';
const labelClass = 'block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5';

const SAMPLE_VALUES: Record<string, string> = {
  memberName: 'Alex Johnson',
  organizationName: 'Iron Peak Fitness',
  branch: 'Downtown',
  membershipPlan: 'Gold Annual',
  expiryDate: '2026-12-31',
  amount: '$49.99',
  trainer: 'Sam Rivera',
  workoutName: 'Full Body Strength',
};

function substitute(text: string) {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => SAMPLE_VALUES[key] ?? `{{${key}}}`);
}

export default function TemplateEditorModal({ template, onClose, onSaved }: { template: NotificationTemplateDTO | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(template?.title || '');
  const [category, setCategory] = useState(template?.category || TEMPLATE_CATEGORIES[0]);
  const [channel, setChannel] = useState(template?.channel || 'email');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');
  const [status, setStatus] = useState(template?.status || 'Draft');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const variables = useMemo(() => [...new Set((body.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) || []).map((m) => m.replace(/[{}]/g, '').trim()))], [body]);
  const canSave = title.trim().length > 0 && body.trim().length > 0;

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = { title, category, channel, subject: subject || undefined, body, variables, status };
      if (template) await platformNotificationsApi.updateTemplate(template.id, payload);
      else await platformNotificationsApi.createTemplate(payload);
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-[#0b101d] border border-slate-800 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-850">
          <span className="text-sm font-black text-white">{template ? 'Edit Template' : 'Create Template'}</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Template title" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
                  {TEMPLATE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Channel</label>
                <select value={channel} onChange={(e) => setChannel(e.target.value)} className={selectClass}>
                  {CHANNEL_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            {channel === 'email' && (
              <div>
                <label className={labelClass}>Subject</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject" className={inputClass} />
              </div>
            )}
            <div>
              <label className={labelClass}>Body</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Use {{variableName}} for dynamic content" className={inputClass + ' resize-none'} />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
                {['Draft', 'Active', 'Archived'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {variables.length > 0 && (
              <div>
                <label className={labelClass}>Variables Detected</label>
                <div className="flex flex-wrap gap-1.5">
                  {variables.map((v) => <span key={v} className="px-2 py-1 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-indigo-300">{`{{${v}}}`}</span>)}
                </div>
              </div>
            )}
            {error && <p className="text-[11px] text-rose-400">{error}</p>}
          </div>

          <div className="space-y-3">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"><Eye size={12} className="text-indigo-400" /> Live Preview (sample data)</span>
            <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-2 min-h-[200px]">
              {channel === 'email' && subject && <p className="text-xs font-bold text-slate-200 border-b border-slate-900 pb-2">{substitute(subject)}</p>}
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{body ? substitute(body) : <span className="text-slate-700">Preview will appear here as you type.</span>}</p>
            </div>
            <p className="text-[10px] text-slate-600">Preview uses sample values (e.g. "{SAMPLE_VALUES.memberName}", "{SAMPLE_VALUES.organizationName}") - real sends substitute actual recipient data.</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-850">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 text-xs font-bold hover:border-slate-700">Cancel</button>
          <button onClick={submit} disabled={!canSave || saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold hover:bg-indigo-500/25 disabled:opacity-50">
            <Save size={13} /> {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
