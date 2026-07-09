'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Pencil,
  Copy,
  Archive,
  PlayCircle,
  Building2,
  Star,
} from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import PlanStatusBadge from '@/components/plans/PlanStatusBadge';
import PlanVisibilityBadge from '@/components/plans/PlanVisibilityBadge';
import DuplicatePlanModal from '@/components/plans/DuplicatePlanModal';
import PlanVersionHistoryList from '@/components/plans/PlanVersionHistoryList';
import PlanAuditLogList from '@/components/plans/PlanAuditLogList';
import { platformPlansApi, handleApiError } from '@/lib/api';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { BILLING_CYCLE_LABEL, formatPriceWithCycle } from '@/lib/planFormat';
import type { PlanDTO, PlanVersionHistoryDTO, PlanAuditLogDTO } from '@/types/plans';

const TABS = ['Overview', 'Resources', 'Features', 'Organizations Using', 'Version History', 'Audit Log'] as const;
type Tab = (typeof TABS)[number];

const FEATURE_STATE_LABEL: Record<string, { label: string; className: string }> = {
  ENABLED: { label: 'Enabled', className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  DISABLED: { label: 'Disabled', className: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
  BETA: { label: 'Beta', className: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' },
  ENTERPRISE_ONLY: { label: 'Enterprise Only', className: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
};

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 block mb-1">{label}</span>
      <span className="text-xs font-semibold text-slate-200">{value}</span>
    </div>
  );
}

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canWrite } = usePlatformRole();

  const [plan, setPlan] = useState<PlanDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [history, setHistory] = useState<PlanVersionHistoryDTO[] | null>(null);
  const [auditLog, setAuditLog] = useState<PlanAuditLogDTO[] | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadPlan = () => {
    setLoading(true);
    platformPlansApi
      .get(id)
      .then(setPlan)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (activeTab === 'Version History' && history === null) {
      platformPlansApi.getVersionHistory(id).then(setHistory).catch(() => setHistory([]));
    }
    if (activeTab === 'Audit Log' && auditLog === null) {
      platformPlansApi.getAuditLog(id).then(setAuditLog).catch(() => setAuditLog([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, id]);

  const handleActivate = async () => {
    if (!plan) return;
    try {
      const updated = await platformPlansApi.activate(plan.id);
      setPlan(updated);
      showToast(`"${updated.name}" is now active.`);
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };

  const handleArchive = async () => {
    if (!plan) return;
    try {
      const updated = await platformPlansApi.archive(plan.id);
      setPlan(updated);
      showToast(`"${updated.name}" archived.`);
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setArchiveOpen(false);
    }
  };

  const handleDuplicateConfirm = async (mode: 'clone' | 'version') => {
    if (!plan) return;
    try {
      const created = await platformPlansApi.duplicate(plan.id, mode);
      showToast(`Duplicated as "${created.name}".`);
      setDuplicateOpen(false);
      router.push(`/commercial/plans/${created.id}`);
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };

  if (loading) {
    return <div className="h-96 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />;
  }

  if (notFound || !plan) {
    return <PlatformEmptyState title="Plan not found" description="This plan may have been removed." />;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push('/commercial/plans')}
        className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft size={13} />
        Back to Plans
      </button>

      <PlatformPageHeader
        title={plan.name}
        description={plan.description || plan.internalCode}
        actions={
          canWrite ? (
            <>
              <button
                onClick={() => router.push(`/commercial/plans/${plan.id}/edit`)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-300 text-xs font-bold rounded-xl transition-colors"
              >
                <Pencil size={13} />
                Edit
              </button>
              <button
                onClick={() => setDuplicateOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-300 text-xs font-bold rounded-xl transition-colors"
              >
                <Copy size={13} />
                Duplicate
              </button>
              {plan.status === 'ARCHIVED' || plan.status === 'DRAFT' ? (
                <button
                  onClick={handleActivate}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 text-emerald-300 text-xs font-bold rounded-xl transition-colors"
                >
                  <PlayCircle size={13} />
                  Activate
                </button>
              ) : (
                <button
                  onClick={() => setArchiveOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-xs font-bold rounded-xl transition-colors"
                >
                  <Archive size={13} />
                  Archive
                </button>
              )}
            </>
          ) : undefined
        }
      />

      <div className="flex items-center gap-2 flex-wrap">
        <PlanStatusBadge status={plan.status} />
        <PlanVisibilityBadge visibility={plan.visibility} />
        {plan.isDefault && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full">
            <Star size={11} fill="currentColor" />
            Default Plan
          </span>
        )}
        {plan.badge && (
          <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">{plan.badge}</span>
        )}
        <span className="text-xs font-black text-slate-100 ml-auto">{formatPriceWithCycle(plan.price, plan.currency, plan.billingCycle)}</span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-800/60">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-2 text-xs font-bold whitespace-nowrap rounded-t-lg transition-colors ${
              activeTab === tab ? 'text-indigo-300 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-3 gap-5">
          <DetailField label="Billing Cycle" value={BILLING_CYCLE_LABEL[plan.billingCycle]} />
          <DetailField label="Trial Days" value={plan.trialDays || '—'} />
          <DetailField label="Setup Fee" value={plan.setupFee ? formatPriceWithCycle(plan.setupFee, plan.currency, 'FREE') : '—'} />
          <DetailField label="Tax Included" value={plan.taxIncluded ? 'Yes' : 'No'} />
          <DetailField label="Version" value={`v${plan.version}`} />
          <DetailField label="Display Order" value={plan.displayOrder} />
          <DetailField label="Workspace Experience" value={plan.workspaceExperienceDefault} />
          <DetailField label="Experience Override" value={plan.allowExperienceOverride ? 'Allowed' : 'Locked'} />
          <DetailField label="Branding" value={plan.brandingAllowed ? 'Allowed' : 'Not Allowed'} />
          <DetailField label="Downgrade" value={plan.downgradeAllowed ? 'Allowed' : 'Not Allowed'} />
          <DetailField label="Auto Upgrade" value={plan.autoUpgrade ? 'Enabled' : 'Disabled'} />
          <DetailField label="Grace Period" value={`${plan.gracePeriodDays} days`} />
          {plan.upgradePathsFrom && plan.upgradePathsFrom.length > 0 && (
            <div className="col-span-full">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">Upgradeable To</span>
              <div className="flex flex-wrap gap-2">
                {plan.upgradePathsFrom.map((u) => (
                  <span key={u.id} className="text-[10px] font-bold text-slate-300 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full">
                    {u.toPlan.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Resources' && (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl divide-y divide-slate-900/60">
          {(plan.resourceLimits || []).length === 0 ? (
            <PlatformEmptyState title="No resource limits configured" />
          ) : (
            (plan.resourceLimits || []).map((limit) => (
              <div key={limit.id} className="flex items-center justify-between p-4">
                <span className="text-xs font-semibold text-slate-200">{limit.resource.label}</span>
                <span className="text-xs font-bold text-slate-400">
                  {limit.limitType === 'UNLIMITED' ? 'Unlimited' : limit.limitType === 'DISABLED' ? 'Disabled' : `${limit.limitValue}${limit.resource.unit ? ` ${limit.resource.unit}` : ''}`}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'Features' && (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl divide-y divide-slate-900/60">
          {(plan.featureAccess || []).length === 0 ? (
            <PlatformEmptyState title="No feature access configured" />
          ) : (
            (plan.featureAccess || []).map((access) => {
              const cfg = FEATURE_STATE_LABEL[access.state];
              return (
                <div key={access.id} className="flex items-center justify-between p-4">
                  <span className="text-xs font-semibold text-slate-200">{access.feature.label}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.className}`}>{cfg.label}</span>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'Organizations Using' && (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl divide-y divide-slate-900/60">
          {(plan.organizationSubscriptions || []).length === 0 ? (
            <PlatformEmptyState icon={Building2} title="No organizations on this plan" description="Once an organization subscribes, it will show up here." />
          ) : (
            (plan.organizationSubscriptions || []).map((sub) => (
              <div key={sub.id} className="flex items-center justify-between p-4">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">{sub.organization.name}</span>
                  <span className="text-[10px] text-slate-600">gymflow.app/{sub.organization.slug}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">{sub.status}</span>
                  <span className="text-[10px] text-slate-600 block mt-1">Since {new Date(sub.startDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'Version History' && (
        history === null ? (
          <div className="h-32 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />
        ) : (
          <PlanVersionHistoryList history={history} />
        )
      )}

      {activeTab === 'Audit Log' && (
        auditLog === null ? (
          <div className="h-32 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />
        ) : (
          <PlanAuditLogList logs={auditLog} />
        )
      )}

      {duplicateOpen && (
        <DuplicatePlanModal plan={plan} onClose={() => setDuplicateOpen(false)} onConfirm={handleDuplicateConfirm} />
      )}

      {archiveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
          <div className="fixed inset-0" onClick={() => setArchiveOpen(false)} />
          <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
            <h3 className="text-base font-extrabold text-white mb-2">Archive Plan</h3>
            <p className="text-xs text-slate-400 mb-5">
              Archive <b className="text-slate-200">{plan.name}</b>? Archived plans can be restored, but won&apos;t be assignable to new organizations.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setArchiveOpen(false)}
                className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
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
