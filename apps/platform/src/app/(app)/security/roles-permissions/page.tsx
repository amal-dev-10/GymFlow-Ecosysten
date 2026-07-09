'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Plus, RefreshCw, Search as SearchIcon } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import RolesTabs, { ROLES_TABS, RolesTabId } from '@/components/roles/RolesTabs';
import RolesKpiCards from '@/components/roles/RolesKpiCards';
import RolesFiltersBar, { ViewMode } from '@/components/roles/RolesFiltersBar';
import RolesTable from '@/components/roles/RolesTable';
import RoleCardGrid from '@/components/roles/RoleCardGrid';
import RoleCreationWizard from '@/components/roles/RoleCreationWizard';
import PermissionMatrix from '@/components/roles/PermissionMatrix';
import PermissionGroups from '@/components/roles/PermissionGroups';
import RoleTemplates from '@/components/roles/RoleTemplates';
import TemporaryAccess from '@/components/roles/TemporaryAccess';
import RoleAssignmentTable from '@/components/roles/RoleAssignmentTable';
import RolesAuditHistory from '@/components/roles/RolesAuditHistory';
import DeveloperPreview from '@/components/roles/DeveloperPreview';
import { platformRolesApi, handleApiError } from '@/lib/api';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import type { RoleListItemDTO, RoleListResponse, RolesDashboardDTO, RoleListFilters } from '@/types/roles';

const PAGE_SIZES = [10, 25, 50];

function RolesPermissionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role } = usePlatformRole();
  const canManage = role === 'SUPER_ADMIN';

  const initialTab = (searchParams.get('section') as RolesTabId) || 'roles';
  const [tab, setTab] = useState<RolesTabId>(ROLES_TABS.some((t) => t.id === initialTab) ? initialTab : 'roles');

  const changeTab = (next: RolesTabId) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', next);
    router.replace(`/security/roles-permissions?${params.toString()}`, { scroll: false });
  };

  const [filters, setFilters] = useState<RoleListFilters>({ page: 1, limit: 25 });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [list, setList] = useState<RoleListResponse | null>(null);
  const [dashboard, setDashboard] = useState<RolesDashboardDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [duplicateFrom, setDuplicateFrom] = useState<RoleListItemDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleListItemDTO | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search || ''), 350);
    return () => clearTimeout(t);
  }, [filters.search]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await platformRolesApi.list({ ...filters, search: debouncedSearch || undefined });
      setList(data);
    } catch (err) {
      setErrorMsg(handleApiError(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.page, filters.limit, filters.status, filters.kind]);

  const loadDashboard = useCallback(() => {
    setDashboardLoading(true);
    platformRolesApi.getDashboard().then(setDashboard).catch(() => setDashboard(null)).finally(() => setDashboardLoading(false));
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const refreshAll = () => {
    loadList();
    loadDashboard();
  };

  const rows = list?.data ?? [];
  const openDetails = (r: RoleListItemDTO) => router.push(`/security/roles-permissions/${r.id}`);

  const doArchiveToggle = async (r: RoleListItemDTO) => {
    setBusy(true);
    try {
      await platformRolesApi.update(r.id, { status: r.status === 'Active' ? 'Archived' : 'Active' });
      showToast(`${r.name} ${r.status === 'Active' ? 'archived' : 'restored'}.`);
      refreshAll();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await platformRolesApi.remove(deleteTarget.id);
      showToast(`${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
      refreshAll();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const rowActions = {
    onView: openDetails,
    onDuplicate: (r: RoleListItemDTO) => setDuplicateFrom(r),
    onAssignUsers: openDetails,
    onArchiveToggle: doArchiveToggle,
    onDelete: (r: RoleListItemDTO) => setDeleteTarget(r),
  };

  const page = list?.page ?? 1;
  const totalPages = list?.totalPages ?? 1;
  const total = list?.total ?? 0;
  const limit = filters.limit ?? 25;
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(total, page * limit);
  const hasAnyFilter = !!(filters.search || filters.status || filters.kind);

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Roles & Permissions"
        description="Role-based access control for GymFlow employees. Organization roles (Owner, Trainer, Receptionist) are managed separately inside each organization's workspace."
        actions={
          <>
            <button onClick={refreshAll} className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-300 text-xs font-bold rounded-xl transition-colors">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {canManage && (
              <button onClick={() => setWizardOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors">
                <Plus size={14} />
                <span className="hidden sm:inline">Create Role</span>
              </button>
            )}
          </>
        }
      />

      <RolesTabs active={tab} onChange={changeTab} />

      {tab === 'roles' && (
        <div className="space-y-6">
          <RolesKpiCards dashboard={dashboard} loading={dashboardLoading} />
          <RolesFiltersBar filters={filters} onChange={setFilters} viewMode={viewMode} onViewMode={setViewMode} />

          {errorMsg && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{errorMsg}</div>}

          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
          ) : rows.length === 0 ? (
            hasAnyFilter ? (
              <PlatformEmptyState icon={SearchIcon} title="No roles match your filters" description="Try adjusting or clearing your search and filters." />
            ) : (
              <PlatformEmptyState
                icon={ShieldCheck}
                title="No roles yet"
                description="Create your first custom role to control what GymFlow employees can access."
                action={
                  canManage && (
                    <button onClick={() => setWizardOpen(true)} className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors">
                      <Plus size={14} /> Create Role
                    </button>
                  )
                }
              />
            )
          ) : (
            <>
              {viewMode === 'table' && (
                <>
                  <RolesTable roles={rows} gates={{ canManage }} onRowClick={openDetails} actions={rowActions} />
                  <RoleCardGrid roles={rows} gates={{ canManage }} onRowClick={openDetails} mobile readOnly actions={rowActions} />
                </>
              )}
              {viewMode === 'card' && <RoleCardGrid roles={rows} gates={{ canManage }} onRowClick={openDetails} actions={rowActions} />}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500">
                    Showing <b className="text-slate-300">{rangeStart}–{rangeEnd}</b> of <b className="text-slate-300">{total}</b>
                  </span>
                  <select value={limit} onChange={(e) => setFilters((f) => ({ ...f, limit: Number(e.target.value), page: 1 }))} className="bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-400 outline-none cursor-pointer">
                    {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, (f.page || 1) - 1) }))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-xs font-bold text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-30">
                    Prev
                  </button>
                  <span className="text-[11px] font-bold text-slate-400 px-2">Page {page} / {totalPages}</span>
                  <button onClick={() => setFilters((f) => ({ ...f, page: Math.min(totalPages, (f.page || 1) + 1) }))} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-xs font-bold text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-30">
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'matrix' && <PermissionMatrix canManage={canManage} showToast={showToast} />}
      {tab === 'groups' && <PermissionGroups canManage={canManage} showToast={showToast} />}
      {tab === 'templates' && <RoleTemplates canManage={canManage} showToast={showToast} />}
      {tab === 'temporary-access' && <TemporaryAccess canManage={canManage} showToast={showToast} />}
      {tab === 'assignments' && <RoleAssignmentTable />}
      {tab === 'audit' && <RolesAuditHistory />}
      {tab === 'developer' && <DeveloperPreview />}

      {(wizardOpen || duplicateFrom) && (
        <RoleCreationWizard
          duplicateFrom={duplicateFrom}
          onClose={() => {
            setWizardOpen(false);
            setDuplicateFrom(null);
          }}
          onCreated={(role) => {
            setWizardOpen(false);
            setDuplicateFrom(null);
            showToast(`Role "${role.name}" created.`);
            refreshAll();
          }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
          <div className="fixed inset-0" onClick={() => setDeleteTarget(null)} />
          <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
            <h3 className="text-base font-extrabold text-white mb-2">Delete Role</h3>
            <p className="text-xs text-slate-400 mb-5">
              Permanently delete <b className="text-slate-200">{deleteTarget.name}</b>? This cannot be undone.
              {deleteTarget.usersAssigned > 0 && <span className="block mt-2 text-amber-400">This role is assigned to {deleteTarget.usersAssigned} user(s) - remove those assignments first.</span>}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
              <button onClick={doDeleteConfirm} disabled={busy} className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">{busy ? 'Deleting...' : 'Delete'}</button>
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

export default function RolesPermissionsPage() {
  return (
    <Suspense fallback={<div className="h-32 bg-slate-900/60 border border-slate-900 rounded-2xl animate-pulse" />}>
      <RolesPermissionsContent />
    </Suspense>
  );
}
