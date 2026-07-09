'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Plus, Copy, Upload, Download, GitCompare } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import PlanStatCards from '@/components/plans/PlanStatCards';
import PlanFiltersBar from '@/components/plans/PlanFiltersBar';
import PlanTable from '@/components/plans/PlanTable';
import PlanCard from '@/components/plans/PlanCard';
import DuplicatePlanModal from '@/components/plans/DuplicatePlanModal';
import { platformPlansApi, handleApiError, type PlanListFilters } from '@/lib/api';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import type { PlanDTO, PlanStatsDTO } from '@/types/plans';

export default function PlatformPlansPage() {
  const router = useRouter();
  const { canWrite } = usePlatformRole();
  const importInputRef = useRef<HTMLInputElement>(null);

  const [plans, setPlans] = useState<PlanDTO[]>([]);
  const [stats, setStats] = useState<PlanStatsDTO | null>(null);
  const [filters, setFilters] = useState<PlanListFilters>({});
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateTarget, setDuplicateTarget] = useState<PlanDTO | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<PlanDTO | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [duplicatePickerOpen, setDuplicatePickerOpen] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await platformPlansApi.list(filters);
      setPlans(data);
    } catch (err) {
      setErrorMsg(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    setStatsLoading(true);
    platformPlansApi
      .getStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [plans.length]);

  const handleActivate = async (plan: PlanDTO) => {
    try {
      await platformPlansApi.activate(plan.id);
      showToast(`"${plan.name}" is now active.`);
      loadPlans();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await platformPlansApi.archive(archiveTarget.id);
      showToast(`"${archiveTarget.name}" archived.`);
      loadPlans();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setArchiveTarget(null);
    }
  };

  const handleDuplicateConfirm = async (mode: 'clone' | 'version') => {
    if (!duplicateTarget) return;
    try {
      const created = await platformPlansApi.duplicate(duplicateTarget.id, mode);
      showToast(`Duplicated as "${created.name}".`);
      setDuplicateTarget(null);
      loadPlans();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(plans, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gymflow-plans-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const payload = Array.isArray(parsed) ? parsed[0] : parsed;
      if (!payload?.name || !payload?.internalCode) {
        throw new Error('File must contain a plan object with at least "name" and "internalCode".');
      }
      await platformPlansApi.create(payload);
      showToast(`Imported plan "${payload.name}" as a draft.`);
      loadPlans();
    } catch (err: any) {
      showToast(err?.message || handleApiError(err), 'error');
    }
  };

  const isEmpty = !loading && plans.length === 0 && Object.keys(filters).length === 0;
  const isFilteredEmpty = !loading && plans.length === 0 && Object.keys(filters).length > 0;

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Subscription Plans"
        description="Manage commercial plans and platform feature access."
        actions={
          <>
            {plans.length > 1 && (
              <button
                onClick={() => router.push(`/commercial/plans/compare?ids=${plans.slice(0, 3).map((p) => p.id).join(',')}`)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-300 text-xs font-bold rounded-xl transition-colors"
              >
                <GitCompare size={14} />
                Compare
              </button>
            )}
            {canWrite && (
              <>
                <button
                  onClick={handleExport}
                  disabled={plans.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
                >
                  <Download size={14} />
                  Export
                </button>
                <button
                  onClick={() => importInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-300 text-xs font-bold rounded-xl transition-colors"
                >
                  <Upload size={14} />
                  Import
                </button>
                <input ref={importInputRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
                <button
                  onClick={() => setDuplicatePickerOpen((v) => !v)}
                  disabled={plans.length === 0}
                  className="relative flex items-center gap-1.5 px-3.5 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
                >
                  <Copy size={14} />
                  Duplicate
                  {duplicatePickerOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-[#0b101d] border border-slate-800 rounded-xl shadow-2xl py-1.5 z-20 text-left">
                      {plans.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setDuplicateTarget(p);
                            setDuplicatePickerOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-900/60 hover:text-indigo-300 transition-colors truncate"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </button>
                <button
                  onClick={() => router.push('/commercial/plans/new')}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors"
                >
                  <Plus size={14} />
                  Create Plan
                </button>
              </>
            )}
          </>
        }
      />

      <PlanStatCards stats={stats} loading={statsLoading} />

      {isEmpty ? (
        <PlatformEmptyState
          icon={Layers}
          title="No subscription plans yet"
          description="Create your first plan to start controlling resource limits, feature access, and billing for organizations on GymFlow."
          action={
            canWrite && (
              <button
                onClick={() => router.push('/commercial/plans/new')}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors"
              >
                <Plus size={14} />
                Create Plan
              </button>
            )
          }
        />
      ) : (
        <>
          <PlanFiltersBar filters={filters} onChange={setFilters} />

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{errorMsg}</div>
          )}

          {isFilteredEmpty ? (
            <PlatformEmptyState icon={Layers} title="No plans match your filters" description="Try a different search term or clear the active filters." />
          ) : loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 min-h-[180px] animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <PlanTable plans={plans} canWrite={canWrite} onDuplicate={setDuplicateTarget} onArchive={setArchiveTarget} onActivate={handleActivate} />
              <PlanCard plans={plans} canWrite={canWrite} onDuplicate={setDuplicateTarget} onArchive={setArchiveTarget} onActivate={handleActivate} />
            </>
          )}
        </>
      )}

      {duplicateTarget && (
        <DuplicatePlanModal plan={duplicateTarget} onClose={() => setDuplicateTarget(null)} onConfirm={handleDuplicateConfirm} />
      )}

      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
          <div className="fixed inset-0" onClick={() => setArchiveTarget(null)} />
          <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
            <h3 className="text-base font-extrabold text-white mb-2">Archive Plan</h3>
            <p className="text-xs text-slate-400 mb-5">
              Archive <b className="text-slate-200">{archiveTarget.name}</b>? Archived plans can be restored, but won&apos;t be assignable to new organizations.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setArchiveTarget(null)}
                className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveConfirm}
                className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-xs font-bold rounded-xl transition-colors"
              >
                Archive
              </button>
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
