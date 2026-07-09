'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gauge, ExternalLink } from 'lucide-react';
import { platformOrganizationsApi, featureEngineApi, handleApiError } from '@/lib/api';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import type { PlanDTO } from '@/types/plans';
import type { Org360Subscription } from '@/types/org360';
import { SectionCard, TabLoading, fmtMoney } from '../shared';
import SubscriptionQuickActions from '../subscription/SubscriptionQuickActions';
import CurrentSubscriptionCard from '../subscription/CurrentSubscriptionCard';
import SubscriptionNotifications from '../subscription/SubscriptionNotifications';
import SubscriptionTimelinePanel from '../subscription/SubscriptionTimelinePanel';
import TrialManagementPanel from '../subscription/TrialManagementPanel';
import CouponsPanel from '../subscription/CouponsPanel';
import BillingSummaryPanel from '../subscription/BillingSummaryPanel';
import EnterpriseSettingsPanel from '../subscription/EnterpriseSettingsPanel';
import AssignSubscriptionWizard from '../subscription/AssignSubscriptionWizard';

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">{children}</div>
    </div>
  );
}

export default function SubscriptionTab({
  orgId,
  plans,
  canManage,
  onChanged,
  showToast,
}: {
  orgId: string;
  plans: PlanDTO[];
  canManage: boolean;
  onChanged: () => void;
  showToast: (m: string, t?: 'success' | 'error') => void;
}) {
  const router = useRouter();
  const { role } = usePlatformRole();
  const canFinance = role === 'SUPER_ADMIN' || role === 'FINANCE';

  const [data, setData] = useState<Org360Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [recommendedPlanId, setRecommendedPlanId] = useState<string | null>(null);

  const [wizard, setWizard] = useState<'assign' | 'upgrade' | 'downgrade' | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDesc, setInvoiceDesc] = useState('');
  const [refundTarget, setRefundTarget] = useState<{ paymentId: string; max: number } | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    platformOrganizationsApi
      .getSubscription(orgId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(load, [load]);

  useEffect(() => {
    featureEngineApi
      .getUpgradeRecommendation(orgId)
      .then((rec) => setRecommendedPlanId(rec?.recommendedPlan.id ?? null))
      .catch(() => setRecommendedPlanId(null));
  }, [orgId]);

  const refreshAll = () => {
    load();
    onChanged();
  };

  // --- Wizard confirm (assign / upgrade / downgrade share one mutation) ---
  const handleWizardConfirm = async (planId: string) => {
    const res = await platformOrganizationsApi.assignPlan(orgId, planId);
    showToast(`Plan ${res.changeType === 'UPGRADED' ? 'upgraded' : res.changeType === 'DOWNGRADED' ? 'downgraded' : 'assigned'} to "${res.planName}".`);
    setWizard(null);
    refreshAll();
  };

  // --- Trial ---
  const handleExtendTrial = async (days: number) => {
    try {
      await platformOrganizationsApi.extendTrial(orgId, days);
      showToast(`Trial extended by ${days} day(s).`);
      refreshAll();
    } catch (err) {
      showToast(handleApiError(err), 'error');
      throw err;
    }
  };

  const handleEndTrial = async () => {
    try {
      await platformOrganizationsApi.endTrial(orgId);
      showToast('Trial converted to a paid subscription.');
      refreshAll();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };

  // --- Pause / Resume / Cancel ---
  const handlePause = async () => {
    try {
      await platformOrganizationsApi.pauseSubscription(orgId);
      showToast('Subscription paused.');
      refreshAll();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };

  const handleResume = async () => {
    try {
      await platformOrganizationsApi.resumeSubscription(orgId);
      showToast('Subscription resumed.');
      refreshAll();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    try {
      await platformOrganizationsApi.cancelSubscription(orgId, cancelReason || undefined);
      showToast('Subscription cancelled.');
      setCancelOpen(false);
      setCancelReason('');
      refreshAll();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  // --- Coupons ---
  const handleApplyCoupon = async (code: string) => {
    await platformOrganizationsApi.applyCoupon(orgId, code);
    showToast(`Coupon "${code}" applied.`);
    refreshAll();
  };

  const handleRemoveCoupon = async (redemptionId: string) => {
    try {
      await platformOrganizationsApi.removeCoupon(orgId, redemptionId);
      showToast('Coupon removed.');
      refreshAll();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };

  // --- Billing ---
  const handleGenerateInvoice = async () => {
    if (!invoiceAmount) return;
    setBusy(true);
    try {
      await platformOrganizationsApi.generateInvoice(orgId, Number(invoiceAmount), invoiceDesc || undefined);
      showToast('Invoice generated.');
      setInvoiceOpen(false);
      setInvoiceAmount('');
      setInvoiceDesc('');
      refreshAll();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRefund = async () => {
    if (!refundTarget || !refundAmount) return;
    setBusy(true);
    try {
      await platformOrganizationsApi.refundPayment(orgId, refundTarget.paymentId, Number(refundAmount), refundReason || undefined);
      showToast('Payment refunded.');
      setRefundTarget(null);
      setRefundAmount('');
      setRefundReason('');
      refreshAll();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  // --- Enterprise settings ---
  const handleSaveEnterprise = async (payload: { isEnterpriseCustom: boolean; customPrice: number | null; privateNotes: string; dedicatedSupportContact: string; customSlaTerms: string }) => {
    try {
      await platformOrganizationsApi.updateEnterpriseSettings(orgId, payload);
      showToast('Enterprise settings saved.');
      refreshAll();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };

  if (loading) return <TabLoading />;
  if (!data) return null;

  const currency = data.plan?.currency || 'USD';
  const showEnterprisePanel = data.isEnterpriseCustom || data.plan?.billingCycle === 'ENTERPRISE';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-500">
            {data.plan ? `${data.plan.name} · ${fmtMoney(data.effectivePrice, currency)}/${(data.billingCycle || '').toLowerCase()}` : 'No active plan'}
          </span>
        </div>
        <SubscriptionQuickActions
          status={data.status}
          canManage={canManage}
          onAssign={() => setWizard('assign')}
          onUpgrade={() => setWizard('upgrade')}
          onDowngrade={() => setWizard('downgrade')}
          onPause={handlePause}
          onResume={handleResume}
          onCancel={() => setCancelOpen(true)}
          onGenerateInvoice={() => setInvoiceOpen(true)}
        />
      </div>

      <SubscriptionNotifications notifications={data.notifications} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <CurrentSubscriptionCard subscription={data} />
          <TrialManagementPanel subscription={data} canManage={canManage} onExtend={handleExtendTrial} onEndTrial={handleEndTrial} />
          <BillingSummaryPanel
            invoices={data.invoices}
            currency={currency}
            canManage={canFinance}
            onGenerateInvoice={() => setInvoiceOpen(true)}
            onRefund={(paymentId, max) => setRefundTarget({ paymentId, max })}
          />
          {showEnterprisePanel && <EnterpriseSettingsPanel subscription={data} currency={currency} canManage={canFinance} onSave={handleSaveEnterprise} />}
        </div>

        <div className="space-y-4">
          <CouponsPanel coupons={data.coupons} currency={currency} canManage={canManage} onApply={handleApplyCoupon} onRemove={handleRemoveCoupon} />
          <SectionCard title="Subscription Usage" action={<Gauge size={14} className="text-slate-600" />}>
            <p className="text-[11px] text-slate-500 mb-3">Full limits, current usage, and warnings live in the Usage tab.</p>
            <button
              onClick={() => router.push(`/organizations/${orgId}?tab=usage`)}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-300 text-[11px] font-bold rounded-xl transition-colors"
            >
              View Usage Dashboard <ExternalLink size={12} />
            </button>
          </SectionCard>
          <SubscriptionTimelinePanel events={data.timeline} />
        </div>
      </div>

      {wizard && (
        <AssignSubscriptionWizard
          intent={wizard}
          currentPlanId={data.plan?.id ?? null}
          currency={currency}
          plans={plans}
          recommendedPlanId={wizard === 'upgrade' ? recommendedPlanId : undefined}
          onClose={() => setWizard(null)}
          onConfirm={handleWizardConfirm}
        />
      )}

      {cancelOpen && (
        <Modal onClose={() => setCancelOpen(false)}>
          <h3 className="text-base font-extrabold text-white mb-2">Cancel Subscription</h3>
          <p className="text-xs text-slate-400 mb-4">This will end auto-renewal and mark the subscription as cancelled.</p>
          <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2} placeholder="Reason (optional)" className={`${inputClass} mb-5`} />
          <div className="flex gap-3">
            <button onClick={() => setCancelOpen(false)} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Keep Subscription</button>
            <button onClick={handleCancel} disabled={busy} className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
              {busy ? 'Cancelling...' : 'Cancel Subscription'}
            </button>
          </div>
        </Modal>
      )}

      {invoiceOpen && (
        <Modal onClose={() => setInvoiceOpen(false)}>
          <h3 className="text-base font-extrabold text-white mb-4">Generate Invoice</h3>
          <input type="number" min={0} value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} placeholder={`Amount (${currency})`} className={`${inputClass} mb-3`} />
          <input value={invoiceDesc} onChange={(e) => setInvoiceDesc(e.target.value)} placeholder="Description (optional)" className={`${inputClass} mb-5`} />
          <div className="flex gap-3">
            <button onClick={() => setInvoiceOpen(false)} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
            <button onClick={handleGenerateInvoice} disabled={!invoiceAmount || busy} className="flex-1 py-3 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
              {busy ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </Modal>
      )}

      {refundTarget && (
        <Modal onClose={() => setRefundTarget(null)}>
          <h3 className="text-base font-extrabold text-white mb-4">Refund Payment</h3>
          <input
            type="number"
            min={0}
            max={refundTarget.max}
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            placeholder={`Amount up to ${fmtMoney(refundTarget.max, currency)}`}
            className={`${inputClass} mb-3`}
          />
          <textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={2} placeholder="Reason (optional)" className={`${inputClass} mb-5`} />
          <div className="flex gap-3">
            <button onClick={() => setRefundTarget(null)} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
            <button onClick={handleRefund} disabled={!refundAmount || busy} className="flex-1 py-3 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 text-amber-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
              {busy ? 'Refunding...' : 'Refund'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
