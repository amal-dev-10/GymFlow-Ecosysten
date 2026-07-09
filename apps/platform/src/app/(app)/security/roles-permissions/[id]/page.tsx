'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ShieldCheck, Archive, RotateCcw, Trash2 } from 'lucide-react';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import RoleDetailTabs, { ROLE_DETAIL_TABS, RoleDetailTabId } from '@/components/roles/RoleDetailTabs';
import { RoleAvatar, RoleKindBadge, RoleStatusBadge } from '@/components/roles/RoleBadges';
import RoleInfoTab from '@/components/roles/tabs/RoleInfoTab';
import RoleUsersTab from '@/components/roles/tabs/RoleUsersTab';
import RolePermissionSummaryTab from '@/components/roles/tabs/RolePermissionSummaryTab';
import RoleAuditHistoryTab from '@/components/roles/tabs/RoleAuditHistoryTab';
import RoleInheritedTab from '@/components/roles/tabs/RoleInheritedTab';
import RoleRestrictionsTab from '@/components/roles/tabs/RoleRestrictionsTab';
import { platformRolesApi, handleApiError } from '@/lib/api';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import type { RoleDetailDTO } from '@/types/roles';

function RoleDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role: platformRole } = usePlatformRole();
  const canManage = platformRole === 'SUPER_ADMIN';

  const initialTab = (searchParams.get('tab') as RoleDetailTabId) || 'info';
  const [tab, setTab] = useState<RoleDetailTabId>(ROLE_DETAIL_TABS.some((t) => t.id === initialTab) ? initialTab : 'info');
  const [role, setRole] = useState<RoleDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const changeTab = (next: RoleDetailTabId) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`/security/roles-permissions/${id}?${params.toString()}`, { scroll: false });
  };

  const load = useCallback(() => {
    setLoading(true);
    platformRolesApi
      .getDetails(id)
      .then(setRole)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const doArchiveToggle = async () => {
    if (!role) return;
    setBusy(true);
    try {
      await platformRolesApi.update(role.id, { status: role.status === 'Active' ? 'Archived' : 'Active' });
      showToast(`${role.name} ${role.status === 'Active' ? 'archived' : 'restored'}.`);
      load();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!role) return;
    setBusy(true);
    try {
      await platformRolesApi.remove(role.id);
      showToast(`${role.name} deleted.`);
      router.push('/security/roles-permissions');
    } catch (err) {
      showToast(handleApiError(err), 'error');
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 bg-slate-900 rounded-lg animate-pulse" />
        <div className="h-40 bg-slate-900/60 border border-slate-900 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (notFound || !role) {
    return (
      <div className="space-y-6">
        <button onClick={() => router.push('/security/roles-permissions')} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors">
          <ChevronLeft size={13} /> Back to Roles &amp; Permissions
        </button>
        <PlatformEmptyState icon={ShieldCheck} title="Role not found" description="It may have been deleted, or the link is incorrect." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={() => router.push('/security/roles-permissions')} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors">
        <ChevronLeft size={13} /> Back to Roles &amp; Permissions
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <RoleAvatar name={role.name} colorTag={role.colorTag} size={44} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-50 tracking-tight">{role.name}</h1>
              <RoleKindBadge isSystem={role.isSystem} />
              <RoleStatusBadge status={role.status} />
            </div>
            {role.description && <p className="text-xs text-slate-400 mt-1 max-w-xl">{role.description}</p>}
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            {!role.isSystem && (
              <button
                onClick={doArchiveToggle}
                disabled={busy}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-amber-500/30 text-slate-300 hover:text-amber-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
              >
                {role.status === 'Active' ? <Archive size={14} /> : <RotateCcw size={14} />}
                {role.status === 'Active' ? 'Archive' : 'Restore'}
              </button>
            )}
            <button
              onClick={() => setDeleteOpen(true)}
              disabled={role.isSystem}
              title={role.isSystem ? 'System roles cannot be deleted.' : undefined}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-rose-500/30 text-slate-300 hover:text-rose-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>

      <RoleDetailTabs active={tab} onChange={changeTab} restrictionCount={role.restrictions.length} />

      {tab === 'info' && <RoleInfoTab role={role} canManage={canManage} onChanged={load} showToast={showToast} />}
      {tab === 'users' && <RoleUsersTab role={role} canManage={canManage} onChanged={load} showToast={showToast} />}
      {tab === 'permissions' && <RolePermissionSummaryTab role={role} />}
      {tab === 'audit' && <RoleAuditHistoryTab role={role} />}
      {tab === 'inherited' && <RoleInheritedTab role={role} canManage={canManage} onChanged={load} showToast={showToast} />}
      {tab === 'restrictions' && <RoleRestrictionsTab role={role} />}

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
          <div className="fixed inset-0" onClick={() => setDeleteOpen(false)} />
          <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
            <h3 className="text-base font-extrabold text-white mb-2">Delete Role</h3>
            <p className="text-xs text-slate-400 mb-5">
              Permanently delete <b className="text-slate-200">{role.name}</b>? This cannot be undone.
              {role.users.length > 0 && <span className="block mt-2 text-amber-400">This role is assigned to {role.users.length} user(s) - remove those assignments first.</span>}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteOpen(false)} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
              <button onClick={doDelete} disabled={busy} className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">{busy ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
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

export default function RoleDetailPage() {
  return (
    <Suspense fallback={<div className="h-32 bg-slate-900/60 border border-slate-900 rounded-2xl animate-pulse" />}>
      <RoleDetailContent />
    </Suspense>
  );
}
