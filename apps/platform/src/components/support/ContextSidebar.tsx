'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ExternalLink, UserSearch, Repeat, Receipt, RefreshCw, ShieldAlert, Plus, Star, ArrowUpCircle,
  ChevronDown, Loader2, X,
} from 'lucide-react';
import { platformSupportApi, platformOrganizationsApi, platformRolesApi, platformUsersApi } from '@/lib/api';
import type { TicketWorkspaceDTO, TicketStatus, TicketPriority } from '@/types/support';
import { PRIORITY_LABELS, ESCALATION_LEVELS } from '@/types/support';
import { StatusBadge, PriorityBadge } from './SupportBadges';
import OrgSummaryCard from './OrgSummaryCard';
import SubscriptionSnapshot from './SubscriptionSnapshot';
import AuditTimelineSnapshot from './AuditTimelineSnapshot';
import BillingSnapshot from './BillingSnapshot';
import FeatureAccessSnapshot from './FeatureAccessSnapshot';
import CreateTicketModal from './CreateTicketModal';

const STATUSES: TicketStatus[] = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED', 'CANCELLED'];
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const selectClass = 'bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-300 outline-none cursor-pointer';

interface Props {
  workspace: TicketWorkspaceDTO;
  staff: { id: string; fullName: string }[];
  onRefresh: () => void;
  showToast: (m: string, t?: 'success' | 'error') => void;
}

export default function ContextSidebar({ workspace, staff, onRefresh, showToast }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [tempAccessOpen, setTempAccessOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);

  const updateField = async (field: 'status' | 'priority' | 'category', value: string) => {
    setBusy(true);
    try {
      await platformSupportApi.updateTicket(workspace.id, { [field]: value } as any);
      onRefresh();
    } catch {
      showToast('Update failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const assign = async (engineerId: string) => {
    if (!engineerId) return;
    setBusy(true);
    try {
      await platformSupportApi.assignEngineer(workspace.id, engineerId);
      showToast('Engineer assigned.');
      onRefresh();
    } catch {
      showToast('Assignment failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const impersonate = async () => {
    try {
      const res = await platformOrganizationsApi.impersonate(workspace.organizationId);
      showToast(`Impersonation link ready for ${res.owner || workspace.organization.name}.`);
      window.open(res.workspaceUrl, '_blank');
    } catch {
      showToast('Impersonation failed.', 'error');
    }
  };

  const resetCache = async () => {
    setBusy(true);
    try {
      await platformOrganizationsApi.resetLimits(workspace.organizationId);
      showToast('Feature & limit cache reset for this organization.');
    } catch {
      showToast('Reset failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const openEscalations = workspace.escalations.filter((e) => e.status === 'Open');

  return (
    <>
      {/* Ticket metadata */}
      <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 space-y-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ticket Details</span>
        <div className="grid grid-cols-2 gap-2">
          <select disabled={busy} value={workspace.status} onChange={(e) => updateField('status', e.target.value)} className={selectClass}>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <select disabled={busy} value={workspace.priority} onChange={(e) => updateField('priority', e.target.value)} className={selectClass}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-slate-500 mb-1">Assigned Engineer</label>
          <select disabled={busy} value={workspace.assignedEngineerId || ''} onChange={(e) => assign(e.target.value)} className={`${selectClass} w-full`}>
            <option value="">Unassigned</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
          </select>
        </div>
      </div>

      {/* Escalations */}
      <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200"><ArrowUpCircle size={13} className="text-orange-400" /> Escalation</span>
          <button onClick={() => setEscalateOpen(true)} className="text-[10px] font-bold text-indigo-300 hover:text-indigo-200">Escalate</button>
        </div>
        {openEscalations.length === 0 ? (
          <p className="text-[11px] text-slate-600">No open escalations.</p>
        ) : (
          openEscalations.map((e) => (
            <div key={e.id} className="text-[11px] text-slate-400">
              <span className="text-orange-300 font-semibold">{e.fromLevel} → {e.toLevel}</span>: {e.reason}
            </div>
          ))
        )}
      </div>

      {/* CSAT (resolved, no score yet) */}
      {(workspace.status === 'RESOLVED' || workspace.status === 'CLOSED') && !workspace.satisfactionScore && (
        <CsatQuickCard ticketId={workspace.id} onRecorded={onRefresh} showToast={showToast} />
      )}
      {workspace.satisfactionScore && (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200"><Star size={13} className="text-amber-400" /> CSAT: {workspace.satisfactionScore}/5</span>
          {workspace.satisfactionComment && <p className="text-[11px] text-slate-500 mt-1">{workspace.satisfactionComment}</p>}
        </div>
      )}

      {workspace.orgSnapshot && <OrgSummaryCard org={workspace.orgSnapshot} />}
      {workspace.subscriptionSnapshot && <SubscriptionSnapshot sub={workspace.subscriptionSnapshot} />}
      <AuditTimelineSnapshot events={workspace.auditTimeline} />
      {workspace.billingSnapshot && <BillingSnapshot billing={workspace.billingSnapshot} />}
      {workspace.featureSnapshot && <FeatureAccessSnapshot features={workspace.featureSnapshot} />}

      {/* Related Tickets */}
      <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Related Tickets</span>
        {workspace.relatedTickets.length === 0 ? (
          <p className="text-[11px] text-slate-600">No other tickets for this organization.</p>
        ) : (
          workspace.relatedTickets.map((t) => (
            <button key={t.id} onClick={() => router.push(`/operations/support/tickets/${t.id}`)} className="w-full flex items-center justify-between gap-2 text-left px-2 py-1.5 rounded-lg hover:bg-slate-900/60 transition-colors">
              <span className="text-[11px] text-slate-300 truncate">#{t.ticketNumber} {t.subject}</span>
              <StatusBadge status={t.status} />
            </button>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quick Actions</span>
        <QuickAction icon={ExternalLink} label="Open Organization 360" onClick={() => router.push(`/organizations/${workspace.organizationId}`)} />
        <QuickAction icon={UserSearch} label="Impersonate Organization" onClick={impersonate} />
        <QuickAction icon={Repeat} label="View Subscription" onClick={() => router.push(`/organizations/${workspace.organizationId}?tab=subscription`)} />
        <QuickAction icon={ShieldAlert} label="View Audit Logs" onClick={() => router.push('/operations/audit-logs?section=logs')} />
        <QuickAction icon={Receipt} label="View Billing" onClick={() => router.push(`/organizations/${workspace.organizationId}?tab=billing`)} />
        <QuickAction icon={RefreshCw} label="Reset Feature Cache" onClick={resetCache} busy={busy} />
        <QuickAction icon={ShieldAlert} label="Grant Temporary Access" onClick={() => setTempAccessOpen(true)} />
        <QuickAction icon={Plus} label="Create Follow-up" onClick={() => setFollowUpOpen(true)} />
      </div>

      {escalateOpen && <EscalateModal ticketId={workspace.id} onClose={() => setEscalateOpen(false)} onDone={() => { setEscalateOpen(false); onRefresh(); }} showToast={showToast} />}
      {tempAccessOpen && <GrantTempAccessModal ticketNumber={workspace.ticketNumber} onClose={() => setTempAccessOpen(false)} showToast={showToast} />}
      {followUpOpen && (
        <CreateTicketModal
          onClose={() => setFollowUpOpen(false)}
          onCreated={(ticketId) => {
            setFollowUpOpen(false);
            router.push(`/operations/support/tickets/${ticketId}`);
          }}
        />
      )}
    </>
  );
}

function QuickAction({ icon: Icon, label, onClick, busy }: { icon: typeof ExternalLink; label: string; onClick: () => void; busy?: boolean }) {
  return (
    <button disabled={busy} onClick={onClick} className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-[11px] font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition-colors disabled:opacity-40">
      {busy ? <Loader2 size={13} className="animate-spin text-indigo-400" /> : <Icon size={13} className="text-indigo-400" />}
      {label}
    </button>
  );
}

function CsatQuickCard({ ticketId, onRecorded, showToast }: { ticketId: string; onRecorded: () => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!score) return;
    setBusy(true);
    try {
      await platformSupportApi.recordCsat(ticketId, score, comment || undefined);
      showToast('CSAT recorded.');
      onRecorded();
    } catch {
      showToast('Failed to record CSAT.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 space-y-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Record Customer Satisfaction</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setScore(n)}><Star size={16} className={n <= score ? 'text-amber-400 fill-amber-400' : 'text-slate-700'} /></button>
        ))}
      </div>
      <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Feedback (optional)" className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 placeholder-slate-600 outline-none" />
      <button disabled={busy || !score} onClick={submit} className="w-full py-1.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-[11px] font-bold rounded-lg transition-colors disabled:opacity-40">
        Save
      </button>
    </div>
  );
}

function EscalateModal({ ticketId, onClose, onDone, showToast }: { ticketId: string; onClose: () => void; onDone: () => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [toLevel, setToLevel] = useState('Engineering');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await platformSupportApi.createEscalation(ticketId, { toLevel, reason });
      showToast('Ticket escalated.');
      onDone();
    } catch {
      showToast('Escalation failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-black text-white">Escalate Ticket</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Escalate To</label>
        <select value={toLevel} onChange={(e) => setToLevel(e.target.value)} className="w-full bg-[#0b101d] border border-slate-800/80 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none cursor-pointer mb-3">
          {ESCALATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Reason</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full bg-[#0b101d] border border-slate-800/80 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none" />
        <button disabled={busy || !reason.trim()} onClick={submit} className="w-full mt-4 py-2.5 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/15 text-orange-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
          Escalate
        </button>
      </div>
    </div>
  );
}

function GrantTempAccessModal({ ticketNumber, onClose, showToast }: { ticketNumber: number; onClose: () => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [users, setUsers] = useState<{ id: string; fullName: string }[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [platformUserId, setPlatformUserId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [reason, setReason] = useState(`Assisting with support ticket #${ticketNumber}.`);
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    platformUsersApi.list({ limit: 100 } as any).then((res: any) => setUsers(res.data || []));
    platformRolesApi.list({ limit: 100 } as any).then((res: any) => setRoles(res.data || []));
  }, []);

  const submit = async () => {
    if (!platformUserId || !roleId || !expiresAt) return;
    setBusy(true);
    try {
      await platformRolesApi.grantTemporaryAccess({ platformUserId, roleId, reason, expiresAt: new Date(expiresAt).toISOString(), approverName: 'Support Center' });
      showToast('Temporary access granted.');
      onClose();
    } catch {
      showToast('Failed to grant access.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-black text-white">Grant Temporary Access</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <select value={platformUserId} onChange={(e) => setPlatformUserId(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none cursor-pointer">
          <option value="">Select staff member...</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
        </select>
        <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none cursor-pointer">
          <option value="">Select role...</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none" />
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none" />
        <button disabled={busy || !platformUserId || !roleId || !expiresAt} onClick={submit} className="w-full py-2.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
          Grant Access
        </button>
      </div>
    </div>
  );
}
