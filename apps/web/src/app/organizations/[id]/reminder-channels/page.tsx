'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MessageSquare,
  Mail,
  Phone,
  Save,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  Clock,
} from 'lucide-react';
import { platformOrgDetailApi } from '../../../../lib/api';

interface ChannelConfig {
  organizationId: string;
  smsEnabled: boolean;
  whatsAppEnabled: boolean;
  emailEnabled: boolean;
  smsSenderId: string | null;
  whatsAppSenderId: string | null;
  emailFromName: string | null;
  emailFromAddress: string | null;
  monthlyLimit: number | null;
  updatedAt: string | null;
  updatedByName: string | null;
}

interface ReminderLog {
  id: string;
  memberName: string | null;
  channel: string;
  triggerDays: number;
  status: string;
  failureReason: string | null;
  sentAt: string;
  rule: { label: string } | null;
}

interface ReminderRule {
  id: string;
  label: string;
  triggerDays: number;
  channels: string[];
  isActive: boolean;
}

export default function OrgReminderChannelsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ChannelConfig | null>(null);
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [activeTab, setActiveTab] = useState<'channels' | 'rules' | 'logs'>('channels');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form state mirrors config
  const [form, setForm] = useState({
    smsEnabled: true,
    whatsAppEnabled: true,
    emailEnabled: true,
    smsSenderId: '',
    whatsAppSenderId: '',
    emailFromName: '',
    emailFromAddress: '',
    monthlyLimit: '' as string,
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [cfg, logData, ruleData] = await Promise.all([
        platformOrgDetailApi.getReminderChannels(orgId),
        platformOrgDetailApi.getReminderLogs(orgId, 100),
        platformOrgDetailApi.getReminderRules(orgId),
      ]);
      setConfig(cfg);
      setLogs(logData || []);
      setRules(ruleData || []);
      setForm({
        smsEnabled: cfg.smsEnabled,
        whatsAppEnabled: cfg.whatsAppEnabled,
        emailEnabled: cfg.emailEnabled,
        smsSenderId: cfg.smsSenderId || '',
        whatsAppSenderId: cfg.whatsAppSenderId || '',
        emailFromName: cfg.emailFromName || '',
        emailFromAddress: cfg.emailFromAddress || '',
        monthlyLimit: cfg.monthlyLimit != null ? String(cfg.monthlyLimit) : '',
      });
    } catch {
      showToast('Failed to load reminder channel config', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [orgId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dto: any = {
        smsEnabled: form.smsEnabled,
        whatsAppEnabled: form.whatsAppEnabled,
        emailEnabled: form.emailEnabled,
        smsSenderId: form.smsSenderId || null,
        whatsAppSenderId: form.whatsAppSenderId || null,
        emailFromName: form.emailFromName || null,
        emailFromAddress: form.emailFromAddress || null,
        monthlyLimit: form.monthlyLimit !== '' ? parseInt(form.monthlyLimit) : null,
      };
      const updated = await platformOrgDetailApi.updateReminderChannels(orgId, dto);
      setConfig(updated);
      showToast('Channel configuration saved');
    } catch {
      showToast('Failed to save configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const sentCount = logs.filter(l => l.status === 'Sent').length;
  const failedCount = logs.filter(l => l.status === 'Failed').length;
  const channelsUsed = [...new Set(logs.map(l => l.channel))];

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
        Loading reminder channel configuration...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 p-8 space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-semibold ${toast.type === 'success' ? 'bg-success-light text-success border-green-200' : 'bg-danger-light text-danger border-red-200'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 border-b border-neutral-200 pb-6">
        <button onClick={() => router.back()} className="p-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 hover:text-neutral-900">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-neutral-900 font-display flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Reminder Channel Configuration
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5 font-mono">
            Org: {orgId} · Control delivery channels and sender identities for expiry reminders.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
        <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
          <span className="text-[9px] text-neutral-500 uppercase font-sans block">Total Dispatched</span>
          <span className="text-sm font-bold text-neutral-900 mt-1 block">{logs.length}</span>
        </div>
        <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
          <span className="text-[9px] text-neutral-500 uppercase font-sans block">Successfully Sent</span>
          <span className="text-sm font-bold text-success mt-1 block">{sentCount}</span>
        </div>
        <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
          <span className="text-[9px] text-neutral-500 uppercase font-sans block">Failed</span>
          <span className="text-sm font-bold text-danger mt-1 block">{failedCount}</span>
        </div>
        <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
          <span className="text-[9px] text-neutral-500 uppercase font-sans block">Configured Rules</span>
          <span className="text-sm font-bold text-primary mt-1 block">{rules.length} rules</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 gap-1">
        {(['channels', 'rules', 'logs'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`py-2.5 px-5 text-[10px] font-bold uppercase border-b-2 transition ${activeTab === t ? 'border-primary text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}>
            {t === 'channels' ? 'Channel Settings' : t === 'rules' ? 'Active Rules' : 'Dispatch Log'}
          </button>
        ))}
      </div>

      {/* Tab: Channel Settings */}
      {activeTab === 'channels' && (
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl">

          {config?.updatedAt && (
            <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2">
              <Clock className="w-3 h-3" />
              Last updated {new Date(config.updatedAt).toLocaleString()} {config.updatedByName ? `by ${config.updatedByName}` : ''}
            </div>
          )}

          {/* SMS Channel */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-neutral-100 rounded-xl flex items-center justify-center">
                  <Phone className="w-4 h-4 text-neutral-600" />
                </div>
                <div>
                  <span className="text-xs font-bold text-neutral-800 block">SMS</span>
                  <span className="text-[10px] text-neutral-500 font-mono">DLT-registered transactional SMS</span>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[10px] text-neutral-500 font-mono">{form.smsEnabled ? 'Enabled' : 'Disabled'}</span>
                <div
                  onClick={() => setForm(p => ({ ...p, smsEnabled: !p.smsEnabled }))}
                  className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${form.smsEnabled ? 'bg-success' : 'bg-neutral-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full m-0.5 transition-transform ${form.smsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </label>
            </div>
            {form.smsEnabled && (
              <div className="space-y-1 pt-2 border-t border-neutral-100">
                <label className="text-[10px] text-neutral-500 uppercase font-mono font-semibold">Sender ID (DLT)</label>
                <input
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono focus:outline-none"
                  placeholder="e.g. TM-GYMFLW"
                  value={form.smsSenderId}
                  onChange={e => setForm(p => ({ ...p, smsSenderId: e.target.value }))}
                />
                <p className="text-[9px] text-neutral-400 font-mono">Appears as the SMS sender name on member devices.</p>
              </div>
            )}
          </div>

          {/* WhatsApp Channel */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-success-light rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-success" />
                </div>
                <div>
                  <span className="text-xs font-bold text-neutral-800 block">WhatsApp</span>
                  <span className="text-[10px] text-neutral-500 font-mono">WhatsApp Business API broadcast</span>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[10px] text-neutral-500 font-mono">{form.whatsAppEnabled ? 'Enabled' : 'Disabled'}</span>
                <div
                  onClick={() => setForm(p => ({ ...p, whatsAppEnabled: !p.whatsAppEnabled }))}
                  className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${form.whatsAppEnabled ? 'bg-success' : 'bg-neutral-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full m-0.5 transition-transform ${form.whatsAppEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </label>
            </div>
            {form.whatsAppEnabled && (
              <div className="space-y-1 pt-2 border-t border-neutral-100">
                <label className="text-[10px] text-neutral-500 uppercase font-mono font-semibold">Broadcast Name</label>
                <input
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono focus:outline-none"
                  placeholder="e.g. GYMFLOW BROADCAST"
                  value={form.whatsAppSenderId}
                  onChange={e => setForm(p => ({ ...p, whatsAppSenderId: e.target.value }))}
                />
                <p className="text-[9px] text-neutral-400 font-mono">Shown as the sender on WhatsApp messages sent from GymFlow.</p>
              </div>
            )}
          </div>

          {/* Email Channel */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <span className="text-xs font-bold text-neutral-800 block">Email</span>
                  <span className="text-[10px] text-neutral-500 font-mono">DKIM/SPF-verified transactional email</span>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[10px] text-neutral-500 font-mono">{form.emailEnabled ? 'Enabled' : 'Disabled'}</span>
                <div
                  onClick={() => setForm(p => ({ ...p, emailEnabled: !p.emailEnabled }))}
                  className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${form.emailEnabled ? 'bg-success' : 'bg-neutral-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full m-0.5 transition-transform ${form.emailEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </label>
            </div>
            {form.emailEnabled && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 uppercase font-mono font-semibold">From Name</label>
                  <input
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono focus:outline-none"
                    placeholder="e.g. GymFlow"
                    value={form.emailFromName}
                    onChange={e => setForm(p => ({ ...p, emailFromName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 uppercase font-mono font-semibold">From Address</label>
                  <input
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono focus:outline-none"
                    placeholder="e.g. no-reply@gymflow.io"
                    value={form.emailFromAddress}
                    onChange={e => setForm(p => ({ ...p, emailFromAddress: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Monthly Quota */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-warning-light rounded-xl flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-800 block">Monthly Send Quota</span>
                <span className="text-[10px] text-neutral-500 font-mono">Limit how many reminder messages this org can dispatch per month. Leave blank for unlimited.</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-500 uppercase font-mono font-semibold">Monthly Limit</label>
              <input
                type="number"
                min="0"
                className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono focus:outline-none"
                placeholder="e.g. 500 — leave blank for unlimited"
                value={form.monthlyLimit}
                onChange={e => setForm(p => ({ ...p, monthlyLimit: e.target.value }))}
              />
              <p className="text-[9px] text-neutral-400 font-mono">
                Enforcement will be integrated with the subscription plan feature engine in a future release.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-neutral-900 text-xs font-semibold rounded-xl disabled:opacity-60">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Channel Configuration'}
            </button>
          </div>
        </form>
      )}

      {/* Tab: Active Rules */}
      {activeTab === 'rules' && (
        <div className="space-y-4 max-w-2xl">
          <p className="text-xs text-neutral-500 font-mono">Reminder rules configured by this workspace. These are read-only here — the workspace manages them from their Reminder Center.</p>
          {rules.length === 0 && (
            <div className="text-center py-12 text-xs text-neutral-500 font-mono border border-neutral-200 rounded-2xl">
              No reminder rules configured by this workspace yet.
            </div>
          )}
          {rules.map(rule => (
            <div key={rule.id} className="bg-white border border-neutral-200 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-800">{rule.label}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${rule.isActive ? 'bg-success-light text-success border-green-200' : 'bg-neutral-100 text-neutral-500 border-neutral-200'}`}>
                    {rule.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                  {rule.triggerDays > 0 ? `${rule.triggerDays}d before expiry` : rule.triggerDays < 0 ? `${Math.abs(rule.triggerDays)}d after expiry` : 'On expiry day'}
                  {' · '}{rule.channels.join(', ')}
                </p>
              </div>
              <div className="flex gap-1">
                {rule.channels.map(ch => {
                  const enabled = ch === 'SMS' ? config?.smsEnabled : ch === 'WhatsApp' ? config?.whatsAppEnabled : config?.emailEnabled;
                  return (
                    <span key={ch} className={`px-1.5 py-0.5 rounded text-[8px] font-mono border ${enabled ? 'bg-neutral-100 text-neutral-600 border-neutral-200' : 'bg-danger-light text-danger border-red-200'}`}>
                      {ch}{!enabled ? ' ✕' : ''}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
          {rules.some(r => r.channels.some(ch => {
            if (ch === 'SMS') return !config?.smsEnabled;
            if (ch === 'WhatsApp') return !config?.whatsAppEnabled;
            if (ch === 'Email') return !config?.emailEnabled;
            return false;
          })) && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-warning-light border border-amber-200 rounded-xl px-3 py-2.5 font-mono">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              Some rules include channels that are disabled at the platform level. Dispatching those rules will skip the disabled channels.
            </div>
          )}
        </div>
      )}

      {/* Tab: Dispatch Log */}
      {activeTab === 'logs' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-neutral-500 uppercase font-mono font-semibold">{logs.length} Log Entries</span>
            <div className="flex gap-3 text-[10px] font-mono">
              <span className="text-success">{sentCount} sent</span>
              <span className="text-danger">{failedCount} failed</span>
              {channelsUsed.length > 0 && <span className="text-neutral-500">via {channelsUsed.join(', ')}</span>}
            </div>
          </div>

          {logs.length === 0 && (
            <div className="text-center py-12 text-xs text-neutral-500 font-mono border border-neutral-200 rounded-2xl">
              No reminders dispatched from this workspace yet.
            </div>
          )}

          <div className="overflow-x-auto border border-neutral-200/60 rounded-2xl">
            {logs.length > 0 && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200/80 text-neutral-500 font-mono uppercase text-[9px] bg-neutral-50/20">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Rule</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Trigger</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Sent At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/30 font-mono">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-neutral-50/10">
                      <td className="py-3 px-4 font-sans text-neutral-800">{log.memberName || '—'}</td>
                      <td className="py-3 px-4 text-[10px] text-neutral-600">{log.rule?.label || 'Manual'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                          log.channel === 'WhatsApp' ? 'bg-success-light text-success border-green-200' :
                          log.channel === 'SMS' ? 'bg-neutral-100 text-neutral-600 border-neutral-200' :
                          'bg-blue-50 text-blue-500 border-blue-100'
                        }`}>{log.channel}</span>
                      </td>
                      <td className="py-3 px-4 text-[10px] text-neutral-500">
                        {log.triggerDays > 0 ? `${log.triggerDays}d prior` : log.triggerDays < 0 ? `${Math.abs(log.triggerDays)}d post` : 'Day-of'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${log.status === 'Sent' ? 'bg-success-light text-success border-green-200' : 'bg-danger-light text-danger border-red-200'}`}>
                          {log.status}
                        </span>
                        {log.failureReason && <span className="block text-[8px] text-neutral-400 mt-0.5">{log.failureReason}</span>}
                      </td>
                      <td className="py-3 px-4 text-[10px] text-neutral-500">{new Date(log.sentAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
