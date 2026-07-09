'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Megaphone, Send, X } from 'lucide-react';
import { platformNotificationsApi } from '@/lib/api';
import type { NotificationCampaignDTO } from '@/types/notifications';
import { ChannelBadge, StatusBadge } from './NotificationBadges';
import CampaignBuilderWizard from './CampaignBuilderWizard';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '-');

export default function CampaignsSection({ canManage, canSend, showToast }: { canManage: boolean; canSend: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<NotificationCampaignDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    platformNotificationsApi.listCampaigns({ status: status || undefined }).then(setRows).catch(() => showToast('Failed to load campaigns.', 'error')).finally(() => setLoading(false));
  }, [status, showToast]);

  useEffect(() => { load(); }, [load]);

  const sendNow = async (id: string) => {
    try {
      await platformNotificationsApi.sendCampaignNow(id);
      showToast('Campaign sent.');
      load();
    } catch {
      showToast('Failed to send campaign.', 'error');
    }
  };

  const cancel = async (id: string) => {
    try {
      await platformNotificationsApi.cancelCampaign(id);
      showToast('Campaign cancelled.');
      load();
    } catch {
      showToast('Failed to cancel campaign.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-[#0b101d] border border-slate-800/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none cursor-pointer">
          <option value="">All Statuses</option>
          {['Draft', 'Scheduled', 'Sent', 'Cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {canManage && (
          <button onClick={() => setWizardOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 rounded-xl text-xs font-bold text-indigo-300 transition-colors ml-auto">
            <Plus size={13} /> Create Campaign
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={Megaphone} title="No campaigns yet" description="Create a campaign to message a real audience at scale." />
      ) : (
        <div className="space-y-2">
          {rows.map((c) => (
            <div key={c.id} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200">{c.name}</span>
                  <StatusBadge status={c.status} />
                  <ChannelBadge channel={c.channel} />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {c.audienceType.replace(/_/g, ' ')} - {c.scheduleType === 'RECURRING' ? `Recurring (${(c.recurringFrequency || '').toLowerCase()}), next ${fmt(c.nextRunAt)}` : c.scheduleType === 'NOW' || c.status === 'Sent' ? `Sent ${fmt(c.sentAt)}` : `Scheduled for ${fmt(c.scheduledFor)}`}
                </p>
              </div>
              {canManage && c.status === 'Scheduled' && (
                <div className="flex items-center gap-2 shrink-0">
                  {canSend && (
                    <button onClick={() => sendNow(c.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-bold hover:bg-indigo-500/15">
                      <Send size={11} /> Send Now
                    </button>
                  )}
                  <button onClick={() => cancel(c.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 text-[11px] font-bold hover:border-rose-500/30 hover:text-rose-400">
                    <X size={11} /> Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {wizardOpen && <CampaignBuilderWizard onClose={() => setWizardOpen(false)} onCreated={() => { setWizardOpen(false); showToast('Campaign created.'); load(); }} />}
    </div>
  );
}
