'use client';

import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Rocket } from 'lucide-react';
import { platformNotificationsApi } from '@/lib/api';
import { NOTIFICATION_TYPES, PRIORITIES } from '@/types/notifications';
import type { AudienceFilter, NotificationChannelDTO, NotificationTemplateDTO, CreateCampaignPayload } from '@/types/notifications';
import AudienceSelector from './AudienceSelector';

const STEPS = ['Target Audience', 'Channel', 'Template', 'Schedule', 'Preview & Send'];
const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';
const selectClass = inputClass + ' cursor-pointer';
const labelClass = 'block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5';

export default function CampaignBuilderWizard({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [notificationType, setNotificationType] = useState(NOTIFICATION_TYPES[0]);
  const [audienceType, setAudienceType] = useState('ALL_ORGANIZATIONS');
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>({});
  const [channel, setChannel] = useState('');
  const [channels, setChannels] = useState<NotificationChannelDTO[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [bodyOverride, setBodyOverride] = useState('');
  const [templates, setTemplates] = useState<NotificationTemplateDTO[]>([]);
  const [priority, setPriority] = useState('Normal');
  const [scheduleType, setScheduleType] = useState<'NOW' | 'SCHEDULED' | 'RECURRING'>('NOW');
  const [scheduledFor, setScheduledFor] = useState('');
  const [recurringFrequency, setRecurringFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [expiresAt, setExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    platformNotificationsApi.listChannels().then(setChannels).catch(() => setChannels([]));
  }, []);

  useEffect(() => {
    if (!channel) { setTemplates([]); return; }
    platformNotificationsApi.listTemplates({ channel, status: 'Active' }).then(setTemplates).catch(() => setTemplates([]));
  }, [channel]);

  const selectedTemplate = templates.find((t) => t.id === templateId) || null;

  const canProceed = [
    name.trim().length > 0,
    channel.length > 0,
    templateId.length > 0 || bodyOverride.trim().length > 0,
    scheduleType === 'NOW' || scheduledFor.length > 0,
    true,
  ][step];

  const submit = async () => {
    setCreating(true);
    setError('');
    try {
      const payload: CreateCampaignPayload = {
        name,
        notificationType,
        channel,
        templateId: templateId || undefined,
        bodyOverride: templateId ? undefined : bodyOverride,
        audienceType,
        audienceFilter,
        priority,
        scheduleType,
        scheduledFor: scheduleType !== 'NOW' ? new Date(scheduledFor).toISOString() : undefined,
        recurringFrequency: scheduleType === 'RECURRING' ? recurringFrequency : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      };
      await platformNotificationsApi.createCampaign(payload);
      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create campaign.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-[#0b101d] border border-slate-800 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-850">
          <span className="text-sm font-black text-white">Create Campaign</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex items-center gap-1 px-5 pt-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold shrink-0 ${i === step ? 'bg-indigo-500 text-white' : i < step ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-900 text-slate-600'}`}>
                {i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i < step ? 'bg-indigo-500/40' : 'bg-slate-900'}`} />}
            </div>
          ))}
        </div>
        <p className="px-5 pt-2 text-[11px] font-bold text-slate-400">{STEPS[step]}</p>

        <div className="p-5 space-y-4 min-h-[280px]">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Campaign Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Membership Renewal Reminder - March" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Notification Type</label>
                <select value={notificationType} onChange={(e) => setNotificationType(e.target.value)} className={selectClass}>
                  {NOTIFICATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <AudienceSelector audienceType={audienceType} audienceFilter={audienceFilter} onChange={(t, f) => { setAudienceType(t); setAudienceFilter(f); }} />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2">
              <label className={labelClass}>Delivery Channel</label>
              {channels.map((c) => (
                <button
                  key={c.key}
                  disabled={!c.isActive}
                  onClick={() => setChannel(c.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    channel === c.key ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-slate-900/40 border-slate-850 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-semibold text-slate-200">{c.label}</span>
                  {!c.isActive && <span className="text-[10px] text-slate-600">Coming soon</span>}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Template (optional)</label>
                <select value={templateId} onChange={(e) => { setTemplateId(e.target.value); if (e.target.value) setBodyOverride(''); }} className={selectClass}>
                  <option value="">Write a custom message instead</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
              {selectedTemplate ? (
                <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4">
                  <p className="text-xs text-slate-300 whitespace-pre-wrap">{selectedTemplate.body}</p>
                </div>
              ) : (
                <div>
                  <label className={labelClass}>Message Body</label>
                  <textarea value={bodyOverride} onChange={(e) => setBodyOverride(e.target.value)} rows={4} placeholder="Write your message..." className={inputClass + ' resize-none'} />
                </div>
              )}
              <div>
                <label className={labelClass}>Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className={selectClass}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Scheduling</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['NOW', 'SCHEDULED', 'RECURRING'] as const).map((s) => (
                    <button key={s} onClick={() => setScheduleType(s)} className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${scheduleType === s ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-slate-900/40 border-slate-850 text-slate-400 hover:border-slate-700'}`}>
                      {s === 'NOW' ? 'Send Now' : s === 'SCHEDULED' ? 'Schedule' : 'Recurring'}
                    </button>
                  ))}
                </div>
              </div>
              {scheduleType !== 'NOW' && (
                <div>
                  <label className={labelClass}>{scheduleType === 'RECURRING' ? 'First Run' : 'Send At'}</label>
                  <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className={inputClass} />
                </div>
              )}
              {scheduleType === 'RECURRING' && (
                <div>
                  <label className={labelClass}>Repeat</label>
                  <select value={recurringFrequency} onChange={(e) => setRecurringFrequency(e.target.value as any)} className={selectClass}>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
              )}
              <div>
                <label className={labelClass}>Expiry (optional)</label>
                <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={inputClass} />
              </div>
              <p className="text-[10px] text-slate-600">Timezone: UTC. No background scheduler exists in this environment - due campaigns are processed the next time this workspace is opened.</p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="text-slate-200 font-semibold">{name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="text-slate-200">{notificationType}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Channel</span><span className="text-slate-200">{channels.find((c) => c.key === channel)?.label || channel}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Audience</span><span className="text-slate-200">{audienceType.replace(/_/g, ' ')}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Priority</span><span className="text-slate-200">{priority}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Schedule</span><span className="text-slate-200">{scheduleType === 'NOW' ? 'Immediately' : scheduleType === 'RECURRING' ? `Recurring (${recurringFrequency.toLowerCase()})` : new Date(scheduledFor).toLocaleString()}</span></div>
              </div>
              <AudienceSelector audienceType={audienceType} audienceFilter={audienceFilter} onChange={() => {}} />
              {error && <p className="text-[11px] text-rose-400">{error}</p>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 p-5 border-t border-slate-850">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-800 text-slate-400 text-xs font-bold hover:border-slate-700 disabled:opacity-30">
            <ChevronLeft size={13} /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep((s) => s + 1)} disabled={!canProceed} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold hover:bg-indigo-500/25 disabled:opacity-50">
              Next <ChevronRight size={13} />
            </button>
          ) : (
            <button onClick={submit} disabled={creating} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold hover:bg-indigo-500/25 disabled:opacity-50">
              <Rocket size={13} /> {creating ? 'Creating...' : scheduleType === 'NOW' ? 'Send Campaign' : 'Schedule Campaign'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
