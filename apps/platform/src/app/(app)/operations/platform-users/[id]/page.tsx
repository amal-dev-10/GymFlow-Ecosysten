'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Users, LayoutDashboard, Building2, MonitorSmartphone, ShieldCheck, History } from 'lucide-react';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import ProfileHeader from '@/components/platform-users/profile/ProfileHeader';
import OverviewTab from '@/components/platform-users/profile/tabs/OverviewTab';
import OrganizationsTab from '@/components/platform-users/profile/tabs/OrganizationsTab';
import SessionsTab from '@/components/platform-users/profile/tabs/SessionsTab';
import SecurityTab from '@/components/platform-users/profile/tabs/SecurityTab';
import ActivityTab from '@/components/platform-users/profile/tabs/ActivityTab';
import { platformUsersApi, handleApiError } from '@/lib/api';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import type { PlatformUserProfileDTO } from '@/types/platformUsers';

const TABS = [
  { id: 'overview', name: 'Overview', icon: LayoutDashboard },
  { id: 'organizations', name: 'Organizations', icon: Building2 },
  { id: 'sessions', name: 'Sessions', icon: MonitorSmartphone },
  { id: 'security', name: 'Security', icon: ShieldCheck },
  { id: 'activity', name: 'Activity', icon: History },
] as const;
type TabId = (typeof TABS)[number]['id'];

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">{children}</div>
    </div>
  );
}

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';

export default function PlatformUserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { role } = usePlatformRole();
  const canManage = role === 'SUPER_ADMIN' || role === 'OPERATIONS';
  const canDelete = role === 'SUPER_ADMIN';

  const [tab, setTab] = useState<TabId>('overview');
  const [profile, setProfile] = useState<PlatformUserProfileDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [busy, setBusy] = useState(false);

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    platformUsersApi.getProfile(id).then(setProfile).catch(() => setNotFound(true)).finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  const doResetPassword = async () => {
    try {
      await platformUsersApi.resetPassword(id);
      showToast('Password reset requested.');
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };
  const doResetMfa = async () => {
    try {
      await platformUsersApi.resetMfa(id);
      showToast('MFA reset.');
      load();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };
  const doActivate = async () => {
    try {
      await platformUsersApi.activate(id);
      showToast('User activated.');
      load();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };
  const doDeactivate = async () => {
    try {
      await platformUsersApi.deactivate(id);
      showToast('User deactivated.');
      load();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };
  const doUnlock = async () => {
    try {
      await platformUsersApi.unlock(id);
      showToast('User unlocked.');
      load();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };
  const doResendInvitation = async () => {
    try {
      await platformUsersApi.resendInvitation(id);
      showToast('Invitation resent.');
      load();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };
  const doSuspendConfirm = async () => {
    setBusy(true);
    try {
      await platformUsersApi.suspend(id, suspendReason || undefined);
      showToast('User suspended.');
      setSuspendOpen(false);
      setSuspendReason('');
      load();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };
  const doDeleteConfirm = async () => {
    setBusy(true);
    try {
      await platformUsersApi.remove(id);
      showToast('User deleted.');
      router.push('/operations/platform-users');
    } catch (err) {
      showToast(handleApiError(err), 'error');
      setBusy(false);
    }
  };
  const doTerminateSession = async (sessionId: string) => {
    try {
      await platformUsersApi.terminateSession(id, sessionId);
      showToast('Session terminated.');
      load();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };
  const doTerminateAll = async () => {
    try {
      await platformUsersApi.terminateAllSessions(id);
      showToast('All sessions terminated.');
      load();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
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

  if (notFound || !profile) {
    return (
      <div className="space-y-6">
        <button onClick={() => router.push('/operations/platform-users')} className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors">
          <ChevronLeft size={13} /> Back to Platform Users
        </button>
        <PlatformEmptyState icon={Users} title="Platform user not found" description="It may have been deleted, or the link is incorrect." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button onClick={() => router.push('/operations/platform-users')} className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors">
        <ChevronLeft size={13} /> Back to Platform Users
      </button>

      <ProfileHeader
        profile={profile}
        canManage={canManage}
        canDelete={canDelete}
        actions={{
          onResetPassword: doResetPassword,
          onResetMfa: doResetMfa,
          onSuspend: () => setSuspendOpen(true),
          onActivate: doActivate,
          onDeactivate: doDeactivate,
          onUnlock: doUnlock,
          onResendInvitation: doResendInvitation,
          onDelete: () => setDeleteOpen(true),
        }}
      />

      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors shrink-0 ${tab === t.id ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'text-slate-500 border border-transparent hover:bg-slate-900/60 hover:text-slate-300'}`}
          >
            <t.icon size={13} />
            {t.name}
          </button>
        ))}
      </div>

      <div>
        {tab === 'overview' && <OverviewTab profile={profile} />}
        {tab === 'organizations' && (
          <OrganizationsTab platformUserId={id} assignedOrganizations={profile.assignedOrganizations} canManage={canManage} onChanged={load} showToast={showToast} />
        )}
        {tab === 'sessions' && <SessionsTab sessions={profile.sessions} canManage={canManage} onTerminate={doTerminateSession} onTerminateAll={doTerminateAll} />}
        {tab === 'security' && <SecurityTab profile={profile} canManage={canManage} onResetMfa={doResetMfa} />}
        {tab === 'activity' && <ActivityTab events={profile.timeline} />}
      </div>

      {suspendOpen && (
        <Modal onClose={() => setSuspendOpen(false)}>
          <h3 className="text-base font-extrabold text-white mb-2">Suspend Platform User</h3>
          <p className="text-xs text-slate-400 mb-4">Suspend <b className="text-slate-200">{profile.fullName}</b>? They will lose access immediately.</p>
          <textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows={2} placeholder="Reason (optional)" className={`${inputClass} mb-5`} />
          <div className="flex gap-3">
            <button onClick={() => setSuspendOpen(false)} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
            <button onClick={doSuspendConfirm} disabled={busy} className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">{busy ? 'Suspending...' : 'Suspend'}</button>
          </div>
        </Modal>
      )}

      {deleteOpen && (
        <Modal onClose={() => setDeleteOpen(false)}>
          <h3 className="text-base font-extrabold text-white mb-2">Delete Platform User</h3>
          <p className="text-xs text-slate-400 mb-5">Permanently delete <b className="text-slate-200">{profile.fullName}</b>? This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteOpen(false)} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
            <button onClick={doDeleteConfirm} disabled={busy} className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">{busy ? 'Deleting...' : 'Delete'}</button>
          </div>
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
