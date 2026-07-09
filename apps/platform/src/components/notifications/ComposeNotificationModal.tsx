'use client';

import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { platformNotificationsApi } from '@/lib/api';
import { NOTIFICATION_TYPES, PRIORITIES } from '@/types/notifications';
import type { AudienceFilter } from '@/types/notifications';
import AudienceSelector from './AudienceSelector';

const CHANNEL_OPTIONS = [{ value: 'in_app', label: 'In-App' }, { value: 'push', label: 'Push' }, { value: 'email', label: 'Email' }, { value: 'sms', label: 'SMS' }];
const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';
const selectClass = inputClass + ' cursor-pointer';
const labelClass = 'block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5';

export default function ComposeNotificationModal({ onClose, onSent }: { onClose: () => void; onSent: (count: number) => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [notificationType, setNotificationType] = useState(NOTIFICATION_TYPES[0]);
  const [channel, setChannel] = useState('in_app');
  const [priority, setPriority] = useState('Normal');
  const [audienceType, setAudienceType] = useState('OWNERS');
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const canSend = title.trim().length > 0 && body.trim().length > 0;

  const submit = async () => {
    setSending(true);
    setError('');
    try {
      const result = await platformNotificationsApi.quickSend({ title, body, notificationType, channel, priority, audienceType, audienceFilter });
      onSent(result.sentCount);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send notification.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-[#0b101d] border border-slate-800 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-850">
          <span className="text-sm font-black text-white">Compose Notification</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Message</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Notification body" className={inputClass + ' resize-none'} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Type</label>
              <select value={notificationType} onChange={(e) => setNotificationType(e.target.value)} className={selectClass}>
                {NOTIFICATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Channel</label>
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className={selectClass}>
                {CHANNEL_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={selectClass}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-900/60">
            <AudienceSelector audienceType={audienceType} audienceFilter={audienceFilter} onChange={(t, f) => { setAudienceType(t); setAudienceFilter(f); }} />
          </div>

          {error && <p className="text-[11px] text-rose-400">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-850">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 text-xs font-bold hover:border-slate-700">Cancel</button>
          <button
            onClick={submit}
            disabled={!canSend || sending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold hover:bg-indigo-500/25 disabled:opacity-50"
          >
            <Send size={13} /> {sending ? 'Sending...' : 'Send Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
