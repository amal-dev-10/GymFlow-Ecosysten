'use client';

import { useEffect, useState } from 'react';
import { Save, ShieldCheck, KeySquare } from 'lucide-react';
import { platformOrganizationsApi, handleApiError } from '@/lib/api';
import type { Org360Settings } from '@/types/org360';
import { SectionCard, TabLoading, EmptyRow } from '../shared';
import { ExperienceBadge } from '@/components/organizations/OrgBadges';
import { OverrideTypeBadge } from '@/components/feature-engine/OverrideBadges';

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';
const selectClass = inputClass + ' cursor-pointer';

const TIMEZONES = ['UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Toronto', 'Europe/London', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'];
const LANGUAGES = [{ v: 'en', l: 'English' }, { v: 'es', l: 'Spanish' }, { v: 'fr', l: 'French' }, { v: 'de', l: 'German' }, { v: 'ar', l: 'Arabic' }, { v: 'ja', l: 'Japanese' }];

export default function SettingsTab({ orgId, canManage, showToast }: { orgId: string; canManage: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [data, setData] = useState<Org360Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ language: string; timezone: string; workspaceExperienceOverride: string }>({ language: '', timezone: '', workspaceExperienceOverride: '' });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    platformOrganizationsApi
      .getSettings(orgId)
      .then((d) => {
        setData(d);
        setForm({ language: d.language || 'en', timezone: d.timezone || 'UTC', workspaceExperienceOverride: d.workspaceExperienceOverride || '' });
        setDirty(false);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };
  useEffect(load, [orgId]);

  const update = (patch: Partial<typeof form>) => { setForm((f) => ({ ...f, ...patch })); setDirty(true); };

  const save = async () => {
    setBusy(true);
    try {
      await platformOrganizationsApi.updateSettings(orgId, {
        language: form.language,
        timezone: form.timezone,
        workspaceExperienceOverride: form.workspaceExperienceOverride || null,
      });
      showToast('Settings updated.');
      load();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <TabLoading />;
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <SectionCard
          title="Organization Configuration"
          action={canManage && dirty && (
            <button onClick={save} disabled={busy} className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-40">
              <Save size={11} /> {busy ? 'Saving' : 'Save'}
            </button>
          )}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Default Language</label>
              <select disabled={!canManage} value={form.language} onChange={(e) => update({ language: e.target.value })} className={selectClass}>
                {LANGUAGES.map((l) => <option key={l.v} value={l.v}>{l.l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Default Timezone</label>
              <select disabled={!canManage} value={form.timezone} onChange={(e) => update({ timezone: e.target.value })} className={selectClass}>
                {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
                {!TIMEZONES.includes(form.timezone) && form.timezone && <option value={form.timezone}>{form.timezone}</option>}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Date Format</label>
              <input disabled value={data.dateFormat || 'YYYY-MM-DD'} className={`${inputClass} opacity-60`} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Workspace Experience">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-bold text-slate-200">Effective</span>
              <div className="mt-1"><ExperienceBadge experience={data.effectiveWorkspaceExperience} /></div>
            </div>
            <span className="text-[10px] text-slate-500">Plan default: {data.workspaceExperienceDefault}</span>
          </div>
          {canManage && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Override</label>
              <select value={form.workspaceExperienceOverride} onChange={(e) => update({ workspaceExperienceOverride: e.target.value })} className={selectClass}>
                <option value="">Use plan default</option>
                <option value="ESSENTIAL">Essential</option>
                <option value="PROFESSIONAL">Professional</option>
                <option value="EXPERT">Expert</option>
              </select>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="space-y-4">
        <SectionCard title="Notification Preferences">
          <div className="space-y-2">
            {['Platform announcements', 'Billing reminders', 'Usage & limit alerts', 'Security notifications'].map((n) => (
              <label key={n} className="flex items-center justify-between py-1.5">
                <span className="text-xs text-slate-300">{n}</span>
                <input type="checkbox" defaultChecked disabled className="accent-indigo-500 opacity-70" />
              </label>
            ))}
          </div>
          <p className="text-[10px] text-slate-600 mt-2">Delivery channel configuration is managed by the tenant.</p>
        </SectionCard>

        <SectionCard title="Security Settings">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-400"><ShieldCheck size={13} className="text-emerald-400" /> Two-factor enforced for owners</div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400"><ShieldCheck size={13} className="text-emerald-400" /> Audit logging enabled</div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400"><ShieldCheck size={13} className="text-slate-600" /> IP allow-list not configured</div>
          </div>
        </SectionCard>

        <SectionCard title="Platform Overrides">
          {data.platformOverrides.length === 0 ? (
            <div className="text-center py-3"><KeySquare size={18} className="text-slate-700 mx-auto mb-2" /><p className="text-[11px] text-slate-500">No active platform overrides.</p></div>
          ) : (
            <div className="space-y-2">
              {data.platformOverrides.map((o) => (
                <div key={o.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-slate-850">
                  <div>
                    <span className="text-xs font-semibold text-slate-200">{o.target}</span>
                    <span className="block text-[10px] text-slate-500">{o.reason}</span>
                  </div>
                  <OverrideTypeBadge type={o.overrideType as any} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
