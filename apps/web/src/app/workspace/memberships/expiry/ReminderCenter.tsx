'use client';

import React from 'react';
import { AlertTriangle, Plus, Play, RotateCcw } from 'lucide-react';

type ReminderTab = 'rules' | 'logs';
const TABS: ReminderTab[] = ['rules', 'logs'];

interface Props {
  open: boolean;
  onClose: () => void;
  reminderLoading: boolean;
  reminderTab: ReminderTab;
  setReminderTab: React.Dispatch<React.SetStateAction<ReminderTab>>;
  channelConfig: any;
  reminderRules: any[];
  reminderLogs: any[];
  showRuleForm: boolean;
  setShowRuleForm: React.Dispatch<React.SetStateAction<boolean>>;
  editingRule: any;
  setEditingRule: React.Dispatch<React.SetStateAction<any>>;
  ruleForm: any;
  setRuleForm: React.Dispatch<React.SetStateAction<any>>;
  dispatchingRuleId: string | null;
  handleSaveRule: (e: React.FormEvent) => void;
  handleDeleteRule: (id: string) => void;
  handleDispatch: (rule: any) => void;
  startEditRule: (rule: any) => void;
  toggleRuleChannel: (ch: string) => void;
}

export default function ReminderCenter(props: Props) {
  const {
    open, onClose, reminderLoading, reminderTab, setReminderTab,
    channelConfig, reminderRules, reminderLogs, showRuleForm, setShowRuleForm,
    editingRule, setEditingRule, ruleForm, setRuleForm, dispatchingRuleId,
    handleSaveRule, handleDeleteRule, handleDispatch, startEditRule, toggleRuleChannel,
  } = props;

  if (!open) return null;

  const activeChannels = [
    channelConfig?.smsEnabled !== false && 'SMS',
    channelConfig?.whatsAppEnabled !== false && 'WhatsApp',
    channelConfig?.emailEnabled !== false && 'Email',
  ].filter(Boolean).join(' · ');

  const limitText = channelConfig?.monthlyLimit ? ` · Limit: ${channelConfig.monthlyLimit} msgs/mo` : '';
  const channelSummary = activeChannels + limitText;

  const cancelForm = () => {
    setShowRuleForm(false);
    setEditingRule(null);
    setRuleForm(() => ({ label: '', triggerDays: 7, channels: ['WhatsApp'], templateSms: '', templateWhatsApp: '', templateEmail: '', isActive: true }));
  };

  const triggerLabel = (days: number) => {
    if (days > 0) return `${days}d before expiry`;
    if (days < 0) return `${Math.abs(days)}d after expiry`;
    return 'On expiry day';
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <div className="absolute inset-0 bg-neutral-50/80 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white border-l border-neutral-200/80 flex flex-col shadow-2xl">

          {/* Header */}
          <div className="flex justify-between items-start px-6 py-5 border-b border-neutral-200 flex-shrink-0">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 font-display flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-primary" />
                Reminder Automation Center
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5 font-mono">
                Automated outreach on behalf of GymFlow.
                {channelConfig && channelSummary && (
                  <span className="ml-1">{channelSummary}</span>
                )}
              </p>
            </div>
            <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 text-lg font-bold">
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-neutral-200 px-6 flex-shrink-0">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setReminderTab(t)}
                className={`py-3 px-4 text-[10px] font-bold uppercase border-b-2 transition ${reminderTab === t ? 'border-primary text-neutral-900' : 'border-transparent text-neutral-500'}`}
              >
                {t === 'rules' ? 'Reminder Rules' : 'Dispatch Log'}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">

            {reminderLoading && (
              <div className="flex items-center justify-center py-16 text-xs text-neutral-400 font-mono animate-pulse">
                Loading reminder config...
              </div>
            )}

            {!reminderLoading && reminderTab === 'rules' && (
              <>
                {/* Rule Form */}
                {showRuleForm && (
                  <form onSubmit={handleSaveRule} className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 space-y-4 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-neutral-800 text-[11px]">
                        {editingRule ? 'Edit Rule' : 'New Reminder Rule'}
                      </span>
                      <button type="button" onClick={cancelForm} className="text-neutral-500 hover:text-neutral-900 text-xs">
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] text-neutral-500 uppercase font-mono font-semibold">Rule Label</label>
                        <input
                          required
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
                          placeholder="e.g. 7-Day Pre-Expiry WhatsApp"
                          value={ruleForm.label}
                          onChange={e => setRuleForm((p: any) => ({ ...p, label: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500 uppercase font-mono font-semibold">Trigger Days</label>
                        <input
                          required
                          type="number"
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono focus:outline-none"
                          placeholder="+7 = 7d before, -7 = 7d after"
                          value={ruleForm.triggerDays}
                          onChange={e => setRuleForm((p: any) => ({ ...p, triggerDays: parseInt(e.target.value) || 0 }))}
                        />
                        <p className="text-[9px] text-neutral-400 font-mono">{triggerLabel(ruleForm.triggerDays)}</p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500 uppercase font-mono font-semibold">Status</label>
                        <select
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
                          value={ruleForm.isActive ? 'true' : 'false'}
                          onChange={e => setRuleForm((p: any) => ({ ...p, isActive: e.target.value === 'true' }))}
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </div>

                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] text-neutral-500 uppercase font-mono font-semibold">Channels</label>
                        <div className="flex gap-2">
                          {['SMS', 'WhatsApp', 'Email'].map(ch => {
                            const cfgEnabled = ch === 'SMS'
                              ? channelConfig?.smsEnabled !== false
                              : ch === 'WhatsApp'
                                ? channelConfig?.whatsAppEnabled !== false
                                : channelConfig?.emailEnabled !== false;
                            const selected = ruleForm.channels.includes(ch);
                            const btnCls = selected
                              ? 'bg-primary text-neutral-900 border-primary/30'
                              : 'bg-white text-neutral-600 border-neutral-200';
                            return (
                              <button
                                key={ch}
                                type="button"
                                disabled={!cfgEnabled}
                                onClick={() => toggleRuleChannel(ch)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition ${btnCls} ${!cfgEnabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                              >
                                {ch}{!cfgEnabled ? ' (disabled)' : ''}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {ruleForm.channels.includes('SMS') && (
                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] text-neutral-500 uppercase font-mono font-semibold">SMS Template</label>
                          <textarea
                            rows={2}
                            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono focus:outline-none text-[11px]"
                            placeholder="Dear {{memberName}}, your membership expires in {{days}} days..."
                            value={ruleForm.templateSms}
                            onChange={e => setRuleForm((p: any) => ({ ...p, templateSms: e.target.value }))}
                          />
                        </div>
                      )}

                      {ruleForm.channels.includes('WhatsApp') && (
                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] text-neutral-500 uppercase font-mono font-semibold">WhatsApp Template</label>
                          <textarea
                            rows={2}
                            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono focus:outline-none text-[11px]"
                            placeholder="Hello {{memberName}}, your {{planName}} expires in {{days}} days..."
                            value={ruleForm.templateWhatsApp}
                            onChange={e => setRuleForm((p: any) => ({ ...p, templateWhatsApp: e.target.value }))}
                          />
                        </div>
                      )}

                      {ruleForm.channels.includes('Email') && (
                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] text-neutral-500 uppercase font-mono font-semibold">Email Template</label>
                          <textarea
                            rows={2}
                            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono focus:outline-none text-[11px]"
                            placeholder="Dear {{memberName}}, your membership at {{gymName}} expires in {{days}} days..."
                            value={ruleForm.templateEmail}
                            onChange={e => setRuleForm((p: any) => ({ ...p, templateEmail: e.target.value }))}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-neutral-200">
                      <button type="submit" className="px-4 py-2 bg-primary text-neutral-900 text-xs font-semibold rounded-xl">
                        {editingRule ? 'Save Changes' : 'Create Rule'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Add Rule button */}
                {!showRuleForm && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-neutral-500 uppercase font-mono font-semibold">
                      {reminderRules.length} Configured Rule{reminderRules.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => {
                        setEditingRule(null);
                        setRuleForm(() => ({ label: '', triggerDays: 7, channels: ['WhatsApp'], templateSms: '', templateWhatsApp: '', templateEmail: '', isActive: true }));
                        setShowRuleForm(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-neutral-900 text-[10px] font-bold rounded-xl"
                    >
                      <Plus className="w-3 h-3" />
                      Add Rule
                    </button>
                  </div>
                )}

                {reminderRules.length === 0 && !showRuleForm && (
                  <div className="text-center py-12 text-xs text-neutral-500 font-mono border border-neutral-200 rounded-2xl">
                    No reminder rules configured yet. Add your first rule to start automated outreach.
                  </div>
                )}

                {/* Rule cards */}
                {reminderRules.map(rule => {
                  const waFrom = channelConfig?.whatsAppSenderId || 'GYMFLOW BROADCAST';
                  const smsFrom = channelConfig?.smsSenderId || 'TM-GYMFLW';
                  const emailFrom = (channelConfig?.emailFromName || 'GymFlow') + ' <' + (channelConfig?.emailFromAddress || 'no-reply@gymflow.io') + '>';
                  const isDispatching = dispatchingRuleId === rule.id;
                  const statusCls = rule.isActive
                    ? 'bg-success-light text-success border-green-200'
                    : 'bg-neutral-100 text-neutral-500 border-neutral-200';
                  return (
                    <div key={rule.id} className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-neutral-800 text-xs">{rule.label}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${statusCls}`}>
                              {rule.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                            {triggerLabel(rule.triggerDays)}
                            {' · '}
                            {rule.channels.join(', ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEditRule(rule)}
                            className="text-[10px] text-neutral-500 hover:text-neutral-900 font-mono px-2 py-1 border border-neutral-200 rounded-lg"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="text-[10px] text-danger hover:text-red-700 font-mono px-2 py-1 border border-red-200 rounded-lg"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {(rule.templateSms || rule.templateWhatsApp || rule.templateEmail) && (
                        <div className="grid grid-cols-1 gap-2">
                          {rule.templateWhatsApp && (
                            <div className="bg-success-light border border-green-200 rounded-xl p-2.5 text-[10px] font-mono text-neutral-700">
                              <span className="text-[9px] text-neutral-500 block mb-1">WhatsApp · From: {waFrom}</span>
                              {rule.templateWhatsApp}
                            </div>
                          )}
                          {rule.templateSms && (
                            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-[10px] font-mono text-neutral-700">
                              <span className="text-[9px] text-neutral-500 block mb-1">SMS · Sender: {smsFrom}</span>
                              {rule.templateSms}
                            </div>
                          )}
                          {rule.templateEmail && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 text-[10px] font-mono text-neutral-700">
                              <span className="text-[9px] text-neutral-500 block mb-1">Email · From: {emailFrom}</span>
                              {rule.templateEmail}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex justify-end pt-1 border-t border-neutral-100">
                        <button
                          onClick={() => handleDispatch(rule)}
                          disabled={isDispatching || !rule.isActive}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white text-[10px] font-bold rounded-xl disabled:opacity-50 transition"
                        >
                          {isDispatching ? <RotateCcw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                          {isDispatching ? 'Dispatching...' : 'Dispatch Now'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {!reminderLoading && reminderTab === 'logs' && (
              <div className="space-y-2">
                <span className="text-[10px] text-neutral-500 uppercase font-mono font-semibold block">
                  {reminderLogs.length} Recent Dispatch Events
                </span>
                {reminderLogs.length === 0 && (
                  <div className="text-center py-12 text-xs text-neutral-500 font-mono border border-neutral-200 rounded-2xl">
                    No reminders dispatched yet.
                  </div>
                )}
                {reminderLogs.map((log: any) => {
                  const logStatus = log.status === 'Sent'
                    ? 'bg-success-light text-success border-green-200'
                    : 'bg-danger-light text-danger border-red-200';
                  const logTrigger = log.triggerDays > 0
                    ? `${log.triggerDays}d prior`
                    : log.triggerDays < 0
                      ? `${Math.abs(log.triggerDays)}d post`
                      : 'Day-of';
                  const chCls = log.channel === 'WhatsApp'
                    ? 'bg-success-light text-success border-green-200'
                    : log.channel === 'SMS'
                      ? 'bg-neutral-100 text-neutral-600 border-neutral-200'
                      : 'bg-blue-50 text-blue-500 border-blue-100';
                  return (
                    <div key={log.id} className="flex justify-between items-center bg-white border border-neutral-200 p-3 rounded-xl text-xs">
                      <div>
                        <span className="font-semibold text-neutral-800 block">{log.memberName || 'Member'}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          <span className={`px-1 py-0.5 rounded text-[8px] font-bold border mr-1 ${chCls}`}>{log.channel}</span>
                          {log.rule?.label || 'Manual'} · {logTrigger}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${logStatus}`}>{log.status}</span>
                        <span className="text-[9px] text-neutral-400 font-mono block mt-0.5">
                          {new Date(log.sentAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
