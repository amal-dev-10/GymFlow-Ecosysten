'use client';

import { useEffect, useState } from 'react';
import { Webhook, Bell, Smartphone, Mail, MessageSquare, MessageCircle } from 'lucide-react';
import { platformNotificationsApi } from '@/lib/api';
import type { NotificationChannelDTO } from '@/types/notifications';
import CategorySettingsPanel from '@/components/global-settings/CategorySettingsPanel';
import NotificationsSettingsFields from '@/components/global-settings/NotificationsSettingsFields';

const ICON_MAP: Record<string, typeof Bell> = { Bell, Smartphone, Mail, MessageSquare, MessageCircle };

// Provider/retry/rate-limit/quiet-hours fields are NOT re-implemented here -
// this reuses PLT-015's own CategorySettingsPanel + NotificationsSettingsFields
// against the same 'notifications' Global Settings category, so there is one
// answer to "where do notification settings live," not two.
export default function NotificationsSettingsSection({ canManage, canManageSettings, showToast }: { canManage: boolean; canManageSettings: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [channels, setChannels] = useState<NotificationChannelDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    platformNotificationsApi.listChannels().then(setChannels).catch(() => setChannels([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = async (c: NotificationChannelDTO) => {
    setSavingKey(c.key);
    try {
      await platformNotificationsApi.updateChannel(c.key, !c.isActive);
      showToast(`${c.label} ${!c.isActive ? 'enabled' : 'disabled'}.`);
      load();
    } catch {
      showToast('Failed to update channel.', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200 mb-3"><Webhook size={13} className="text-indigo-400" /> Delivery Channels</span>
        <p className="text-[11px] text-slate-500 mb-3">A future FCM/APNs/SMTP/Twilio/WhatsApp integration is a provider swap behind one of these keys - enable/disable which channels are considered active for campaigns and quick sends.</p>
        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-slate-900/40 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-2">
            {channels.map((c) => {
              const Icon = ICON_MAP[c.icon || ''] || Bell;
              return (
                <div key={c.key} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-900/40 border border-slate-850">
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-200"><Icon size={14} className="text-slate-500" /> {c.label}</span>
                  {canManage ? (
                    <button
                      disabled={savingKey === c.key}
                      onClick={() => toggle(c)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors disabled:opacity-40 ${c.isActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-slate-800/60 border-slate-700/60 text-slate-500'}`}
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </button>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${c.isActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-slate-800/60 border-slate-700/60 text-slate-500'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CategorySettingsPanel category="notifications" canEdit={canManageSettings} showToast={showToast}>
        {(values, setValue, editable) => <NotificationsSettingsFields values={values} setValue={setValue} canEdit={editable} />}
      </CategorySettingsPanel>
    </div>
  );
}
