'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Plus,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Search as SearchIcon,
  Info,
  UserCog,
} from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import OrgKpiCards from '@/components/organizations/OrgKpiCards';
import OrgInsights from '@/components/organizations/OrgInsights';
import OrgFiltersBar, { ViewMode } from '@/components/organizations/OrgFiltersBar';
import OrgAdvancedFilters from '@/components/organizations/OrgAdvancedFilters';
import OrgTable from '@/components/organizations/OrgTable';
import OrgCardGrid from '@/components/organizations/OrgCardGrid';
import OrgBulkBar from '@/components/organizations/OrgBulkBar';
import type { OrgActionGates } from '@/components/organizations/OrgRowActions';
import { platformOrganizationsApi, platformPlansApi, handleApiError } from '@/lib/api';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { exportOrgsCsv, exportOrgsExcel, exportOrgsPdf } from '@/lib/orgExport';
import type {
  OrganizationRowDTO,
  OrganizationListResponse,
  OrganizationStatsDTO,
  OrganizationInsightsDTO,
  OrganizationListFilters,
} from '@/types/organizations';
import type { PlanDTO } from '@/types/plans';

const PAGE_SIZES = [10, 20, 50];

export default function PlatformOrganizationsPage() {
  const router = useRouter();
  const { role } = usePlatformRole();

  const canManage = role === 'SUPER_ADMIN';
  const canImpersonate = role === 'SUPER_ADMIN' || role === 'SUPPORT';
  const canViewSubscription = role === 'SUPER_ADMIN' || role === 'FINANCE' || role === 'SALES';
  const gates: OrgActionGates = { canSuspend: canManage, canImpersonate, canViewSubscription };

  const [filters, setFilters] = useState<OrganizationListFilters>({ page: 1, limit: 20, sortBy: 'createdAt', sortDir: 'desc' });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [list, setList] = useState<OrganizationListResponse | null>(null);
  const [stats, setStats] = useState<OrganizationStatsDTO | null>(null);
  const [insights, setInsights] = useState<OrganizationInsightsDTO | null>(null);
  const [plans, setPlans] = useState<PlanDTO[]>([]);
  const [countries, setCountries] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [suspendTarget, setSuspendTarget] = useState<OrganizationRowDTO | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [archiveTarget, setArchiveTarget] = useState<OrganizationRowDTO | null>(null);
  const [impersonateResult, setImpersonateResult] = useState<{ name: string; owner?: string | null; workspaceUrl: string } | null>(null);
  const [createInfoOpen, setCreateInfoOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Debounce the search term so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search || ''), 350);
    return () => clearTimeout(t);
  }, [filters.search]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await platformOrganizationsApi.list({ ...filters, search: debouncedSearch || undefined });
      setList(data);
    } catch (err) {
      setErrorMsg(handleApiError(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearch,
    filters.page,
    filters.limit,
    filters.derivedStatus,
    filters.planId,
    filters.experience,
    filters.country,
    filters.health,
    filters.trial,
    filters.enterprise,
    filters.subscriptionStatus,
    filters.minMembers,
    filters.minBranches,
    filters.sortBy,
    filters.sortDir,
  ]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadAux = useCallback(() => {
    setStatsLoading(true);
    setInsightsLoading(true);
    platformOrganizationsApi.getStats().then(setStats).catch(() => setStats(null)).finally(() => setStatsLoading(false));
    platformOrganizationsApi.getInsights().then(setInsights).catch(() => setInsights(null)).finally(() => setInsightsLoading(false));
    platformPlansApi.list({ status: 'ACTIVE' }).then(setPlans).catch(() => setPlans([]));
    platformOrganizationsApi.listCountries().then(setCountries).catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    loadAux();
  }, [loadAux]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const refreshAll = () => {
    loadList();
    loadAux();
    showToast('Refreshed.');
  };

  const advancedCount = useMemo(
    () => [filters.minMembers, filters.minBranches, filters.subscriptionStatus].filter((v) => v !== undefined && v !== '').length,
    [filters.minMembers, filters.minBranches, filters.subscriptionStatus],
  );

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
      if (allSelected) return new Set();
      return new Set(rows.map((r) => r.id));
    });

  const handleSort = (field: string) => {
    setFilters((f) => ({
      ...f,
      sortBy: field,
      sortDir: f.sortBy === field && f.sortDir === 'desc' ? 'asc' : 'desc',
      page: 1,
    }));
  };

  const openDetails = (org: OrganizationRowDTO) => router.push(`/organizations/${org.id}`);

  // --- single-org actions ---
  const doSuspend = async () => {
    if (!suspendTarget) return;
    setBusy(true);
    try {
      await platformOrganizationsApi.suspend(suspendTarget.id, suspendReason || undefined);
      showToast(`"${suspendTarget.name}" suspended.`);
      setSuspendTarget(null);
      setSuspendReason('');
      loadList();
      loadAux();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doActivate = async (org: OrganizationRowDTO) => {
    try {
      await platformOrganizationsApi.activate(org.id);
      showToast(`"${org.name}" reactivated.`);
      loadList();
      loadAux();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };

  const doArchive = async () => {
    if (!archiveTarget) return;
    setBusy(true);
    try {
      await platformOrganizationsApi.archive(archiveTarget.id);
      showToast(`"${archiveTarget.name}" archived.`);
      setArchiveTarget(null);
      loadList();
      loadAux();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doImpersonate = async (org: OrganizationRowDTO) => {
    try {
      const result = await platformOrganizationsApi.impersonate(org.id);
      setImpersonateResult({ name: result.organizationName, owner: result.owner?.name, workspaceUrl: result.workspaceUrl });
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };

  const rowActions = {
    onViewDetails: openDetails,
    onImpersonate: doImpersonate,
    onSuspend: (o: OrganizationRowDTO) => setSuspendTarget(o),
    onActivate: doActivate,
    onArchive: (o: OrganizationRowDTO) => setArchiveTarget(o),
    onViewSubscription: (o: OrganizationRowDTO) => router.push(`/commercial/subscriptions?organizationId=${o.id}`),
    onViewAudit: (o: OrganizationRowDTO) => router.push(`/operations/audit-logs?organizationId=${o.id}`),
  };

  // --- bulk actions ---
  const doBulk = async (action: 'suspend' | 'activate' | 'archive' | 'notify' | 'assign_plan', planId?: string) => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const res = await platformOrganizationsApi.bulk({ organizationIds: Array.from(selected), action, planId });
      showToast(`${action.replace('_', ' ')}: ${res.affected} of ${res.requested} organization(s) updated.`);
      setSelected(new Set());
      loadList();
      loadAux();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const runExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setExportOpen(false);
    const scope = selected.size > 0 ? rows.filter((r) => selected.has(r.id)) : rows;
    if (scope.length === 0) {
      showToast('Nothing to export.', 'error');
      return;
    }
    if (format === 'csv') exportOrgsCsv(scope);
    else if (format === 'excel') exportOrgsExcel(scope);
    else exportOrgsPdf(scope);
    platformOrganizationsApi.recordExport(format, scope.length).catch(() => undefined);
    showToast(`Exported ${scope.length} organization(s) as ${format.toUpperCase()}.`);
  };

  const bulkExport = () => runExport('csv');

  const page = list?.page ?? 1;
  const totalPages = list?.totalPages ?? 1;
  const total = list?.total ?? 0;
  const limit = filters.limit ?? 20;
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(total, page * limit);

  const hasAnyFilter = !!(filters.search || filters.derivedStatus || filters.planId || filters.experience || filters.country || filters.health || filters.trial || filters.enterprise || advancedCount > 0);

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Organizations"
        description="Manage all customer organizations using GymFlow."
        actions={
          <>
            <button
              onClick={() => setShowInsights((v) => !v)}
              className={`hidden sm:flex items-center gap-1.5 px-3.5 py-2 border text-xs font-bold rounded-xl transition-colors ${showInsights ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-[#0b101d] border-slate-800/80 text-slate-300 hover:text-indigo-300 hover:border-indigo-500/30'}`}
            >
              <BarChart3 size={14} />
              Insights
            </button>
            <button
              onClick={refreshAll}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-300 text-xs font-bold rounded-xl transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-300 text-xs font-bold rounded-xl transition-colors"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown size={12} />
              </button>
              {exportOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-30 p-1.5 animate-fade-in">
                  {(['csv', 'excel', 'pdf'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => runExport(f)}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
                    >
                      Export {f.toUpperCase()}
                      {selected.size > 0 && f === 'csv' && <span className="text-[10px] text-slate-600"> ({selected.size} selected)</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setCreateInfoOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Create Organization</span>
            </button>
          </>
        }
      />

      <OrgKpiCards stats={stats} loading={statsLoading} />

      {showInsights && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Platform Insights</h2>
          </div>
          <OrgInsights insights={insights} loading={insightsLoading} onOpen={(id) => router.push(`/organizations/${id}`)} />
        </div>
      )}

      <OrgFiltersBar
        filters={filters}
        onChange={setFilters}
        plans={plans}
        countries={countries}
        viewMode={viewMode}
        onViewMode={setViewMode}
        advancedOpen={advancedOpen}
        onToggleAdvanced={() => setAdvancedOpen((v) => !v)}
        advancedCount={advancedCount}
      />

      {advancedOpen && <OrgAdvancedFilters filters={filters} onChange={setFilters} />}

      {selected.size > 0 && (
        <OrgBulkBar
          count={selected.size}
          canManage={canManage}
          plans={plans}
          onClear={() => setSelected(new Set())}
          onBulk={doBulk}
          onExport={bulkExport}
          busy={busy}
        />
      )}

      {errorMsg && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{errorMsg}</div>}

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        hasAnyFilter ? (
          <PlatformEmptyState icon={SearchIcon} title="No organizations match your filters" description="Try adjusting or clearing your search and filters." />
        ) : (
          <PlatformEmptyState icon={Building2} title="No organizations yet" description="Customer organizations will appear here as they sign up for GymFlow." />
        )
      ) : (
        <>
          {viewMode === 'table' && (
            <>
              <OrgTable
                orgs={rows}
                gates={gates}
                selected={selected}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
                sortBy={filters.sortBy || 'createdAt'}
                sortDir={filters.sortDir || 'desc'}
                onSort={handleSort}
                onRowClick={openDetails}
                actions={rowActions}
              />
              {/* Table collapses to cards below lg */}
              <OrgCardGrid orgs={rows} gates={gates} selected={selected} onToggleSelect={toggleSelect} onRowClick={openDetails} mobile actions={rowActions} />
            </>
          )}
          {viewMode === 'card' && (
            <OrgCardGrid orgs={rows} gates={gates} selected={selected} onToggleSelect={toggleSelect} onRowClick={openDetails} actions={rowActions} />
          )}
          {viewMode === 'compact' && (
            <OrgCardGrid orgs={rows} gates={gates} selected={selected} onToggleSelect={toggleSelect} onRowClick={openDetails} compact actions={rowActions} />
          )}

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-500">
                Showing <b className="text-slate-300">{rangeStart}–{rangeEnd}</b> of <b className="text-slate-300">{total}</b>
              </span>
              <select
                value={limit}
                onChange={(e) => setFilters((f) => ({ ...f, limit: Number(e.target.value), page: 1 }))}
                className="bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-400 outline-none cursor-pointer"
              >
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, (f.page || 1) - 1) }))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-xs font-bold text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-30"
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <span className="text-[11px] font-bold text-slate-400 px-2">Page {page} / {totalPages}</span>
              <button
                onClick={() => setFilters((f) => ({ ...f, page: Math.min(totalPages, (f.page || 1) + 1) }))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-xs font-bold text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-30"
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* --- Suspend modal --- */}
      {suspendTarget && (
        <Modal onClose={() => setSuspendTarget(null)}>
          <h3 className="text-base font-extrabold text-white mb-2">Suspend Organization</h3>
          <p className="text-xs text-slate-400 mb-4">
            Suspend <b className="text-slate-200">{suspendTarget.name}</b>? Members and staff will lose access until it is reactivated.
          </p>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Reason (optional)</label>
          <textarea
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            rows={2}
            placeholder="Recorded in the audit trail"
            className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none mb-5"
          />
          <div className="flex gap-3">
            <button onClick={() => setSuspendTarget(null)} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
            <button onClick={doSuspend} disabled={busy} className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
              {busy ? 'Suspending...' : 'Suspend'}
            </button>
          </div>
        </Modal>
      )}

      {/* --- Archive modal --- */}
      {archiveTarget && (
        <Modal onClose={() => setArchiveTarget(null)}>
          <h3 className="text-base font-extrabold text-white mb-2">Archive Organization</h3>
          <p className="text-xs text-slate-400 mb-5">
            Archive <b className="text-slate-200">{archiveTarget.name}</b>? It will be hidden from the active directory but can be reactivated later.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setArchiveTarget(null)} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
            <button onClick={doArchive} disabled={busy} className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
              {busy ? 'Archiving...' : 'Archive'}
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
            An audited impersonation session was started for <b className="text-slate-200">{impersonateResult.name}</b>
            {impersonateResult.owner ? <> as <b className="text-slate-200">{impersonateResult.owner}</b></> : null}. This action is recorded in the audit log.
          </p>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-850 text-[11px] text-slate-500 mb-5">
            Full cross-workspace impersonation launches from the Organization 360 page (PLT-005). Workspace target: <span className="font-mono text-slate-400">{impersonateResult.workspaceUrl}</span>
          </div>
          <button onClick={() => setImpersonateResult(null)} className="w-full py-3 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors">Done</button>
        </Modal>
      )}

      {/* --- Create info (creation lives in a separate flow) --- */}
      {createInfoOpen && (
        <Modal onClose={() => setCreateInfoOpen(false)}>
          <div className="flex items-center gap-2 mb-2">
            <Info size={18} className="text-indigo-400" />
            <h3 className="text-base font-extrabold text-white">Create Organization</h3>
          </div>
          <p className="text-xs text-slate-400 mb-5">
            Organization onboarding is handled by the dedicated creation flow. This index page is read-only for existing organizations — clicking an organization opens its full Organization 360 profile.
          </p>
          <button onClick={() => setCreateInfoOpen(false)} className="w-full py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-colors">Got it</button>
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

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">{children}</div>
    </div>
  );
}
