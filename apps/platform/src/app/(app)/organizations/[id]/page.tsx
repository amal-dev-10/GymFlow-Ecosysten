'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Building2, UserCog, X } from 'lucide-react';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import OrgHeader from '@/components/org360/OrgHeader';
import AlertsCenter from '@/components/org360/AlertsCenter';
import Org360Tabs, { ORG360_TABS, Org360TabId } from '@/components/org360/Org360Tabs';
import OverviewTab from '@/components/org360/tabs/OverviewTab';
import SubscriptionTab from '@/components/org360/tabs/SubscriptionTab';
import UsageTab from '@/components/org360/tabs/UsageTab';
import BranchesTab from '@/components/org360/tabs/BranchesTab';
import UsersTab from '@/components/org360/tabs/UsersTab';
import FeatureAccessTab from '@/components/org360/tabs/FeatureAccessTab';
import BillingTab from '@/components/org360/tabs/BillingTab';
import ActivityTab from '@/components/org360/tabs/ActivityTab';
import AuditTab from '@/components/org360/tabs/AuditTab';
import SupportTab from '@/components/org360/tabs/SupportTab';
import SettingsTab from '@/components/org360/tabs/SettingsTab';
import { platformOrganizationsApi, platformPlansApi, handleApiError } from '@/lib/api';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { exportOrgOverviewJson } from '@/lib/orgExport';
import type { Org360Overview } from '@/types/org360';
import type { PlanDTO } from '@/types/plans';

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';
const selectClass = inputClass + ' cursor-pointer';

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">{children}</div>
    </div>
  );
}

export default function Organization360Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role } = usePlatformRole();

  const canManage = role === 'SUPER_ADMIN';
  const canImpersonate = role === 'SUPER_ADMIN' || role === 'SUPPORT';
  const canAssignPlan = role === 'SUPER_ADMIN' || role === 'FINANCE' || role === 'SALES';
  const canNotify = role === 'SUPER_ADMIN' || role === 'SUPPORT' || role === 'SALES';
  const canSupport = role === 'SUPER_ADMIN' || role === 'SUPPORT';

  const initialTab = (searchParams.get('tab') as Org360TabId) || 'overview';
  const [tab, setTab] = useState<Org360TabId>(ORG360_TABS.some((t) => t.id === initialTab) ? initialTab : 'overview');
  const [overview, setOverview] = useState<Org360Overview | null>(null);
  const [plans, setPlans] = useState<PlanDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [busy, setBusy] = useState(false);

  // modals
  const [assignPlanOpen, setAssignPlanOpen] = useState(false);
  const [assignPlanId, setAssignPlanId] = useState('');
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [resetLimitsOpen, setResetLimitsOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [impersonateResult, setImpersonateResult] = useState<{ owner: string | null; workspaceUrl: string } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const changeTab = (next: Org360TabId) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`/organizations/${id}?${params.toString()}`, { scroll: false });
  };

  const loadOverview = useCallback(() => {
    setLoading(true);
    platformOrganizationsApi
      .getOverview(id)
      .then(setOverview)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadOverview();
    platformPlansApi.list({ status: 'ACTIVE' }).then(setPlans).catch(() => setPlans([]));
  }, [loadOverview]);

  // --- Quick actions ---
  const doImpersonate = async () => {
    try {
      const res = await platformOrganizationsApi.impersonate(id);
      setImpersonateResult({ owner: res.owner?.name || null, workspaceUrl: res.workspaceUrl });
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };

  const doAssignPlan = async () => {
    if (!assignPlanId) return;
    setBusy(true);
    try {
      const res = await platformOrganizationsApi.assignPlan(id, assignPlanId);
      showToast(`Assigned plan "${res.planName}".`);
      setAssignPlanOpen(false);
      setAssignPlanId('');
      loadOverview();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doSuspend = async () => {
    setBusy(true);
    try {
      await platformOrganizationsApi.suspend(id, suspendReason || undefined);
      showToast('Organization suspended.');
      setSuspendOpen(false);
      setSuspendReason('');
      loadOverview();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doActivate = async () => {
    try {
      await platformOrganizationsApi.activate(id);
      showToast('Organization activated.');
      loadOverview();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };

  const doResetLimits = async () => {
    setBusy(true);
    try {
      const res = await platformOrganizationsApi.resetLimits(id);
      showToast(`Limits reset — ${res.revoked} override(s) revoked.`);
      setResetLimitsOpen(false);
      loadOverview();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doArchive = async () => {
    setBusy(true);
    try {
      await platformOrganizationsApi.archive(id);
      showToast('Organization archived.');
      setArchiveOpen(false);
      loadOverview();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doNotify = async () => {
    setBusy(true);
    try {
      await platformOrganizationsApi.notify(id, notifyTitle, notifyMessage || undefined);
      showToast('Notification sent.');
      setNotifyOpen(false);
      setNotifyTitle('');
      setNotifyMessage('');
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doExport = () => {
    if (!overview) return;
    exportOrgOverviewJson(overview);
    platformOrganizationsApi.recordExport('json', 1).catch(() => undefined);
    showToast('Organization exported.');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 bg-slate-900 rounded-lg animate-pulse" />
        <div className="h-28 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />
        <div className="h-64 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (notFound || !overview) {
    return (
      <div className="space-y-6">
        <button onClick={() => router.push('/organizations')} className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors">
          <ChevronLeft size={13} /> Back to Organizations
        </button>
        <PlatformEmptyState icon={Building2} title="Organization not found" description="It may have been deleted, or the link is incorrect." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button onClick={() => router.push('/organizations')} className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors">
        <ChevronLeft size={13} /> Back to Organizations
      </button>

      <OrgHeader
        overview={overview}
        gates={{ canImpersonate, canManage, canAssignPlan, canNotify, canSupport }}
        actions={{
          onImpersonate: doImpersonate,
          onAssignPlan: () => setAssignPlanOpen(true),
          onSuspend: () => setSuspendOpen(true),
          onActivate: doActivate,
          onResetLimits: () => setResetLimitsOpen(true),
          onNotify: () => setNotifyOpen(true),
          onSupportTicket: () => changeTab('support'),
          onExport: doExport,
          onArchive: () => setArchiveOpen(true),
        }}
      />

      <AlertsCenter alerts={overview.alerts} />

      <Org360Tabs active={tab} onChange={changeTab} />

      <div>
        {tab === 'overview' && <OverviewTab overview={overview} onGoToTab={(t) => changeTab(t as Org360TabId)} />}
        {tab === 'subscription' && <SubscriptionTab orgId={id} plans={plans} canManage={canAssignPlan} onChanged={loadOverview} showToast={showToast} />}
        {tab === 'usage' && <UsageTab orgId={id} />}
        {tab === 'branches' && <BranchesTab orgId={id} showToast={showToast} />}
        {tab === 'users' && <UsersTab orgId={id} showToast={showToast} />}
        {tab === 'features' && <FeatureAccessTab orgId={id} />}
        {tab === 'billing' && <BillingTab orgId={id} currency={overview.plan?.currency || overview.currency || 'USD'} />}
        {tab === 'activity' && <ActivityTab orgId={id} showToast={showToast} />}
        {tab === 'audit' && <AuditTab orgId={id} />}
        {tab === 'support' && <SupportTab orgId={id} canManage={canSupport} showToast={showToast} />}
        {tab === 'settings' && <SettingsTab orgId={id} canManage={canManage} showToast={showToast} />}
      </div>

      {/* --- Assign Subscription --- */}
      {assignPlanOpen && (
        <Modal onClose={() => setAssignPlanOpen(false)}>
          <h3 className="text-base font-extrabold text-white mb-4">Assign Subscription</h3>
          <select value={assignPlanId} onChange={(e) => setAssignPlanId(e.target.value)} className={`${selectClass} mb-5`}>
            <option value="">Select a plan...</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="flex gap-3">
            <button onClick={() => setAssignPlanOpen(false)} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
            <button onClick={doAssignPlan} disabled={!assignPlanId || busy} className="flex-1 py-3 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
              {busy ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </Modal>
      )}

      {/* --- Suspend --- */}
      {suspendOpen && (
        <Modal onClose={() => setSuspendOpen(false)}>
          <h3 className="text-base font-extrabold text-white mb-2">Suspend Organization</h3>
          <p className="text-xs text-slate-400 mb-4">Suspend <b className="text-slate-200">{overview.name}</b>? Members and staff will lose access.</p>
          <textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows={2} placeholder="Reason (optional)" className={`${inputClass} mb-5`} />
          <div className="flex gap-3">
            <button onClick={() => setSuspendOpen(false)} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
            <button onClick={doSuspend} disabled={busy} className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
              {busy ? 'Suspending...' : 'Suspend'}
            </button>
          </div>
        </Modal>
      )}

      {/* --- Reset Limits --- */}
      {resetLimitsOpen && (
        <Modal onClose={() => setResetLimitsOpen(false)}>
          <h3 className="text-base font-extrabold text-white mb-2">Reset Limits</h3>
          <p className="text-xs text-slate-400 mb-5">Revoke all active overrides for <b className="text-slate-200">{overview.name}</b> and revert every feature and resource to its plan default?</p>
          <div className="flex gap-3">
            <button onClick={() => setResetLimitsOpen(false)} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
            <button onClick={doResetLimits} disabled={busy} className="flex-1 py-3 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
              {busy ? 'Resetting...' : 'Reset Limits'}
            </button>
          </div>
        </Modal>
      )}

      {/* --- Archive --- */}
      {archiveOpen && (
        <Modal onClose={() => setArchiveOpen(false)}>
          <h3 className="text-base font-extrabold text-white mb-2">Archive Organization</h3>
          <p className="text-xs text-slate-400 mb-5">Archive <b className="text-slate-200">{overview.name}</b>? It will be hidden from the active directory but can be reactivated later.</p>
          <div className="flex gap-3">
            <button onClick={() => setArchiveOpen(false)} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
            <button onClick={doArchive} disabled={busy} className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
              {busy ? 'Archiving...' : 'Archive'}
            </button>
          </div>
        </Modal>
      )}

      {/* --- Notify --- */}
      {notifyOpen && (
        <Modal onClose={() => setNotifyOpen(false)}>
          <h3 className="text-base font-extrabold text-white mb-4">Send Notification</h3>
          <input value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} placeholder="Title" className={`${inputClass} mb-3`} />
          <textarea value={notifyMessage} onChange={(e) => setNotifyMessage(e.target.value)} rows={3} placeholder="Message (optional)" className={`${inputClass} mb-5`} />
          <div className="flex gap-3">
            <button onClick={() => setNotifyOpen(false)} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
            <button onClick={doNotify} disabled={!notifyTitle || busy} className="flex-1 py-3 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
              {busy ? 'Sending...' : 'Send'}
            </button>
          </div>
        </Modal>
      )}

      {/* --- Impersonation result --- */}
      {impersonateResult && (
        <Modal onClose={() => setImpersonateResult(null)}>
          <div className="flex items-center gap-2 mb-2">
            <UserCog size={18} className="text-indigo-400" />
            <h3 className="text-base font-extrabold text-white">Impersonation Session</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            An audited impersonation session was started for <b className="text-slate-200">{overview.name}</b>
            {impersonateResult.owner ? <> as <b className="text-slate-200">{impersonateResult.owner}</b></> : null}.
          </p>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-850 text-[11px] text-slate-500 mb-5">
            Workspace target: <span className="font-mono text-slate-400">{impersonateResult.workspaceUrl}</span>
          </div>
          <button onClick={() => setImpersonateResult(null)} className="w-full py-3 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors">Done</button>
        </Modal>
      )}

      {toast && (
        <div className="fixed top-5 right-5 z-[100] flex items-center gap-3 p-4 bg-[#0b101d]/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl max-w-sm">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-xs font-bold text-slate-100">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
