'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, RefreshCw, Download, ChevronDown, ChevronLeft, ChevronRight, Building2, Search as SearchIcon } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import PlatformUserKpiCards from '@/components/platform-users/PlatformUserKpiCards';
import PlatformUserFiltersBar, { ViewMode } from '@/components/platform-users/PlatformUserFiltersBar';
import PlatformUserTable from '@/components/platform-users/PlatformUserTable';
import PlatformUserCardGrid from '@/components/platform-users/PlatformUserCardGrid';
import PlatformUserBulkBar from '@/components/platform-users/PlatformUserBulkBar';
import InviteUserWizard from '@/components/platform-users/InviteUserWizard';
import DepartmentManagementModal from '@/components/platform-users/DepartmentManagementModal';
import type { RowActionGates } from '@/components/platform-users/PlatformUserRowActions';
import { platformUsersApi, handleApiError } from '@/lib/api';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { exportPlatformUsersCsv, exportPlatformUsersExcel, exportPlatformUsersPdf } from '@/lib/platformUserExport';
import type { PlatformUserRowDTO, PlatformUserListResponse, PlatformUserStatsDTO, PlatformUserListFilters, PlatformDepartmentDTO, DepartmentBreakdown } from '@/types/platformUsers';

const PAGE_SIZES = [10, 25, 50];

export default function PlatformUsersPage() {
  const router = useRouter();
  const { role } = usePlatformRole();
  const canManage = role === 'SUPER_ADMIN' || role === 'OPERATIONS';
  const canDelete = role === 'SUPER_ADMIN';
  const gates: RowActionGates = { canManage, canDelete };

  const [filters, setFilters] = useState<PlatformUserListFilters>({ page: 1, limit: 25 });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [list, setList] = useState<PlatformUserListResponse | null>(null);
  const [stats, setStats] = useState<PlatformUserStatsDTO | null>(null);
  const [departments, setDepartments] = useState<PlatformDepartmentDTO[]>([]);
  const [breakdown, setBreakdown] = useState<DepartmentBreakdown[]>([]);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [suspendTarget, setSuspendTarget] = useState<PlatformUserRowDTO | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PlatformUserRowDTO | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search || ''), 350);
    return () => clearTimeout(t);
  }, [filters.search]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await platformUsersApi.list({ ...filters, search: debouncedSearch || undefined });
      setList(data);
    } catch (err) {
      setErrorMsg(handleApiError(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.page, filters.limit, filters.department, filters.role, filters.status, filters.mfaEnabled, filters.online]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadAux = useCallback(() => {
    setStatsLoading(true);
    platformUsersApi.getStats().then(setStats).catch(() => setStats(null)).finally(() => setStatsLoading(false));
    platformUsersApi.listDepartments().then(setDepartments).catch(() => setDepartments([]));
    platformUsersApi.getDepartmentBreakdown().then(setBreakdown).catch(() => setBreakdown([]));
  }, []);

  useEffect(() => {
    loadAux();
  }, [loadAux]);

  const refreshAll = () => {
    loadList();
    loadAux();
  };

  const rows = list?.data ?? [];

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelectAll = () =>
    setSelected((prev) => {
      const allSelected = rows.length > 0 && rows.every((r) => prev.has(r.id));
      return allSelected ? new Set() : new Set(rows.map((r) => r.id));
    });

  const openProfile = (u: PlatformUserRowDTO) => router.push(`/operations/platform-users/${u.id}`);

  // --- row actions ---
  const doResetPassword = async (u: PlatformUserRowDTO) => {
    try {
      await platformUsersApi.resetPassword(u.id);
      showToast(`Password reset requested for ${u.fullName}.`);
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };
  const doResetMfa = async (u: PlatformUserRowDTO) => {
    try {
      await platformUsersApi.resetMfa(u.id);
      showToast(`MFA reset for ${u.fullName}.`);
      refreshAll();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };
  const doActivate = async (u: PlatformUserRowDTO) => {
    try {
      await platformUsersApi.activate(u.id);
      showToast(`${u.fullName} activated.`);
      refreshAll();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };
  const doDeactivate = async (u: PlatformUserRowDTO) => {
    try {
      await platformUsersApi.deactivate(u.id);
      showToast(`${u.fullName} deactivated.`);
      refreshAll();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };
  const doUnlock = async (u: PlatformUserRowDTO) => {
    try {
      await platformUsersApi.unlock(u.id);
      showToast(`${u.fullName} unlocked.`);
      refreshAll();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };
  const doResendInvitation = async (u: PlatformUserRowDTO) => {
    try {
      await platformUsersApi.resendInvitation(u.id);
      showToast(`Invitation resent to ${u.fullName}.`);
      refreshAll();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };
  const doSuspendConfirm = async () => {
    if (!suspendTarget) return;
    setBusy(true);
    try {
      await platformUsersApi.suspend(suspendTarget.id, suspendReason || undefined);
      showToast(`${suspendTarget.fullName} suspended.`);
      setSuspendTarget(null);
      setSuspendReason('');
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
      await platformUsersApi.remove(deleteTarget.id);
      showToast(`${deleteTarget.fullName} deleted.`);
      setDeleteTarget(null);
      refreshAll();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const rowActions = {
    onView: openProfile,
    onEdit: openProfile,
    onResetPassword: doResetPassword,
    onResetMfa: doResetMfa,
    onSuspend: (u: PlatformUserRowDTO) => setSuspendTarget(u),
    onActivate: doActivate,
    onDeactivate: doDeactivate,
    onUnlock: doUnlock,
    onResendInvitation: doResendInvitation,
    onDelete: (u: PlatformUserRowDTO) => setDeleteTarget(u),
  };

  // --- bulk actions ---
  const doBulk = async (action: 'activate' | 'suspend' | 'assign_department' | 'assign_role' | 'delete', extra?: { department?: string; role?: string }) => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const res = await platformUsersApi.bulk({ userIds: Array.from(selected), action, ...extra });
      showToast(`${action.replace('_', ' ')}: ${res.affected} of ${res.requested} user(s) updated.`);
      setSelected(new Set());
      refreshAll();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const runExport = (format: 'csv' | 'excel' | 'pdf') => {
    setExportOpen(false);
    const scope = selected.size > 0 ? rows.filter((r) => selected.has(r.id)) : rows;
    if (scope.length === 0) {
      showToast('Nothing to export.', 'error');
      return;
    }
    if (format === 'csv') exportPlatformUsersCsv(scope);
    else if (format === 'excel') exportPlatformUsersExcel(scope);
    else exportPlatformUsersPdf(scope);
    platformUsersApi.recordExport(format, scope.length).catch(() => undefined);
    showToast(`Exported ${scope.length} user(s) as ${format.toUpperCase()}.`);
  };

  const page = list?.page ?? 1;
  const totalPages = list?.totalPages ?? 1;
  const total = list?.total ?? 0;
  const limit = filters.limit ?? 25;
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(total, page * limit);
  const hasAnyFilter = !!(filters.search || filters.department || filters.role || filters.status || filters.mfaEnabled || filters.online);

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Platform Users"
        description="Manage internal GymFlow employees and platform access."
        actions={
          <>
            <button onClick={() => setDeptModalOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-300 text-xs font-bold rounded-xl transition-colors">
              <Building2 size={14} />
              <span className="hidden sm:inline">Departments</span>
            </button>
            <button onClick={refreshAll} className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-300 text-xs font-bold rounded-xl transition-colors">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <div className="relative">
              <button onClick={() => setExportOpen((v) => !v)} className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-300 text-xs font-bold rounded-xl transition-colors">
                <Download size={14} />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown size={12} />
              </button>
              {exportOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-30 p-1.5 animate-fade-in">
                  {(['csv', 'excel', 'pdf'] as const).map((f) => (
                    <button key={f} onClick={() => runExport(f)} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition-colors">
                      Export {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {canManage && (
              <button onClick={() => setInviteOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors">
                <Plus size={14} />
                <span className="hidden sm:inline">Invite User</span>
              </button>
            )}
          </>
        }
      />

      <PlatformUserKpiCards stats={stats} loading={statsLoading} />

      <PlatformUserFiltersBar filters={filters} onChange={setFilters} departments={departments} viewMode={viewMode} onViewMode={setViewMode} />

      {selected.size > 0 && (
        <PlatformUserBulkBar count={selected.size} canManage={canManage} departments={departments} onClear={() => setSelected(new Set())} onBulk={doBulk} onExport={() => runExport('csv')} busy={busy} />
      )}

      {errorMsg && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{errorMsg}</div>}

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        hasAnyFilter ? (
          <PlatformEmptyState icon={SearchIcon} title="No platform users match your filters" description="Try adjusting or clearing your search and filters." />
        ) : (
          <PlatformEmptyState
            icon={Users}
            title="No platform users yet"
            description="Invite your first internal GymFlow employee to give them access to this console."
            action={
              canManage && (
                <button onClick={() => setInviteOpen(true)} className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors">
                  <Plus size={14} /> Invite User
                </button>
              )
            }
          />
        )
      ) : (
        <>
          {viewMode === 'table' && (
            <>
              <PlatformUserTable users={rows} gates={gates} selected={selected} onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll} onRowClick={openProfile} actions={rowActions} />
              <PlatformUserCardGrid users={rows} gates={gates} selected={selected} onToggleSelect={toggleSelect} onRowClick={openProfile} mobile readOnly actions={rowActions} />
            </>
          )}
          {viewMode === 'card' && (
            <PlatformUserCardGrid users={rows} gates={gates} selected={selected} onToggleSelect={toggleSelect} onRowClick={openProfile} actions={rowActions} />
          )}

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
              <button onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, (f.page || 1) - 1) }))} disabled={page <= 1} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-xs font-bold text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-30">
                <ChevronLeft size={13} /> Prev
              </button>
              <span className="text-[11px] font-bold text-slate-400 px-2">Page {page} / {totalPages}</span>
              <button onClick={() => setFilters((f) => ({ ...f, page: Math.min(totalPages, (f.page || 1) + 1) }))} disabled={page >= totalPages} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-xs font-bold text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-30">
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </>
      )}

      {inviteOpen && (
        <InviteUserWizard departments={departments} onClose={() => setInviteOpen(false)} onInvited={() => { setInviteOpen(false); showToast('Invitation sent.'); refreshAll(); }} />
      )}

      {deptModalOpen && (
        <DepartmentManagementModal departments={departments} breakdown={breakdown} canManage={canManage} onClose={() => setDeptModalOpen(false)} onChanged={loadAux} showToast={showToast} />
      )}

      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
          <div className="fixed inset-0" onClick={() => setSuspendTarget(null)} />
          <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
            <h3 className="text-base font-extrabold text-white mb-2">Suspend Platform User</h3>
            <p className="text-xs text-slate-400 mb-4">Suspend <b className="text-slate-200">{suspendTarget.fullName}</b>? They will lose access to this console immediately.</p>
            <textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows={2} placeholder="Reason (optional)" className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none mb-5" />
            <div className="flex gap-3">
              <button onClick={() => setSuspendTarget(null)} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
              <button onClick={doSuspendConfirm} disabled={busy} className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">{busy ? 'Suspending...' : 'Suspend'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
          <div className="fixed inset-0" onClick={() => setDeleteTarget(null)} />
          <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
            <h3 className="text-base font-extrabold text-white mb-2">Delete Platform User</h3>
            <p className="text-xs text-slate-400 mb-5">Permanently delete <b className="text-slate-200">{deleteTarget.fullName}</b>? This cannot be undone.</p>
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
