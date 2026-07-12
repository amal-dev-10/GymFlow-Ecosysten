'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ArrowUpCircle, Receipt } from 'lucide-react';
import { orgApi, subscriptionApi } from '../../../../lib/api';
import { useSubscriptionContext, type AvailablePlan } from '../../../../context/subscription';
import { useBrand } from '../../../../hooks/useBrand';
import { Card, Badge, Button, Modal, TableContainer, Table, THead, TH, TBody, TR, TD } from '../../../../components/ui';

interface InvoiceRow {
  id: string;
  amount: number;
  status: string;
  description: string | null;
  paidAt: string | null;
  createdAt: string;
  planName: string;
  currency: string;
  payment: { paymentMethod: string; provider: string; transactionId: string | null; gatewayPaymentId: string | null } | null;
}

function formatPrice(price: number, currency: string) {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(price);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function OrganizationSubscriptionPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;
  const { brand, logoUrl: brandLogoUrl, initials: brandInitials } = useBrand();
  const { subscription, plans, loading, error, refetch, switchPlan, switching } = useSubscriptionContext();

  const [orgName, setOrgName] = useState('');
  const [confirmPlan, setConfirmPlan] = useState<AvailablePlan | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadInvoices = () => {
    setInvoicesLoading(true);
    subscriptionApi
      .getInvoices()
      .then((raw: any[]) => {
        setInvoices(
          (raw || []).map((inv: any) => ({
            id: inv.id,
            amount: inv.amount,
            status: inv.status,
            description: inv.description,
            paidAt: inv.paidAt,
            createdAt: inv.createdAt,
            planName: inv.subscription?.plan?.name || 'Unknown plan',
            currency: inv.subscription?.plan?.currency || 'USD',
            payment: inv.payments?.[0]
              ? {
                  paymentMethod: inv.payments[0].paymentMethod,
                  provider: inv.payments[0].provider,
                  transactionId: inv.payments[0].transactionId,
                  gatewayPaymentId: inv.payments[0].gatewayPaymentId,
                }
              : null,
          })),
        );
      })
      .catch(() => setInvoices([]))
      .finally(() => setInvoicesLoading(false));
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !orgId) return;
    localStorage.setItem('organizationId', orgId);
    refetch();
    loadInvoices();
    orgApi
      .list()
      .then((orgs: any[]) => {
        const org = orgs.find((o) => o.id === orgId);
        if (org) setOrgName(org.name);
      })
      .catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const handleConfirmSwitch = async () => {
    if (!confirmPlan) return;
    const result = await switchPlan(confirmPlan.id);
    if (result.ok) {
      showToast(`Switched to the ${confirmPlan.name} plan.`, 'success');
      setConfirmPlan(null);
      loadInvoices();
    } else {
      showToast(result.error || 'Failed to switch plans.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs font-bold shadow-2xl animate-fade-in ${toast.type === 'success' ? 'bg-success-light border-green-200 text-success' : 'bg-danger-light border-red-200 text-danger'
            }`}
        >
          <CheckCircle2 size={14} />
          <span>{toast.message}</span>
        </div>
      )}

      <header className="border-b border-neutral-200/80 bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt={brand.platformName} className="h-9 w-auto object-contain" />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ backgroundColor: brand.primaryColor }}>
                {brandInitials}
              </div>
            )}
            {/* <span className="font-extrabold text-lg tracking-tight text-neutral-900">{brand.platformName}</span> */}
          </div>
          <button
            onClick={() => router.push('/organizations')}
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            Back to Organizations
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Manage Subscription</h1>
          <p className="text-sm text-neutral-500 mt-1">{orgName ? `Billing and plan settings for ${orgName}.` : 'Billing and plan settings.'}</p>
        </div>

        {loading ? (
          <div className="space-y-6 animate-pulse select-none">
            <div className="h-32 bg-white border border-neutral-200 rounded-3xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-56 bg-white border border-neutral-200 rounded-2xl" />
              <div className="h-56 bg-white border border-neutral-200 rounded-2xl" />
              <div className="h-56 bg-white border border-neutral-200 rounded-2xl" />
            </div>
          </div>
        ) : error ? (
          <Card className="p-8 text-center text-sm text-danger">{error}</Card>
        ) : (
          <>
            {/* CURRENT PLAN */}
            <Card className="p-6">
              {subscription ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase">Current Plan</span>
                    <div className="flex items-center gap-2.5 flex-wrap mt-1">
                      <span className="text-xl font-black text-neutral-900">{subscription.plan.name}</span>
                      <Badge tone={subscription.status === 'Active' ? 'success' : 'warning'}>{subscription.status}</Badge>
                    </div>
                  </div>
                  <div className="text-3xl font-black text-neutral-900">
                    {formatPrice(subscription.plan.price, subscription.plan.currency)}
                    {subscription.plan.price > 0 && <span className="text-sm font-semibold text-neutral-500"> /{subscription.plan.billingCycle.toLowerCase()}</span>}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-neutral-500 text-center py-4">No active subscription yet — choose a plan below.</p>
              )}
            </Card>

            {/* AVAILABLE PLANS */}
            <div>
              <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider mb-4">Available Plans</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {plans
                  .slice()
                  .sort((a, b) => a.price - b.price)
                  .map((plan) => {
                    const isCurrent = subscription?.plan.id === plan.id;
                    return (
                      <Card key={plan.id} className={`p-5 flex flex-col justify-between gap-4 ${isCurrent ? 'border-primary/40 ring-1 ring-primary/10' : ''}`}>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-extrabold text-neutral-900">{plan.name}</span>
                            {plan.badge && <Badge tone="info">{plan.badge}</Badge>}
                          </div>
                          {plan.description && <p className="text-[11px] text-neutral-500 mt-1.5">{plan.description}</p>}
                          <div className="text-xl font-black text-neutral-900 mt-3">
                            {formatPrice(plan.price, plan.currency)}
                            {plan.price > 0 && <span className="text-xs font-semibold text-neutral-500"> /{plan.billingCycle.toLowerCase()}</span>}
                          </div>
                        </div>
                        <Button
                          variant={isCurrent ? 'secondary' : 'primary'}
                          size="sm"
                          disabled={isCurrent}
                          icon={!isCurrent ? <ArrowUpCircle size={14} /> : undefined}
                          onClick={() => setConfirmPlan(plan)}
                        >
                          {isCurrent ? 'Current Plan' : 'Switch to This Plan'}
                        </Button>
                      </Card>
                    );
                  })}
              </div>
            </div>

            {/* BILLING HISTORY */}
            <div>
              <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider mb-4">Billing History</h3>
              {invoicesLoading ? (
                <div className="h-40 bg-white border border-neutral-200 rounded-2xl animate-pulse" />
              ) : invoices.length === 0 ? (
                <Card className="p-8 text-center flex flex-col items-center gap-2">
                  <Receipt size={22} className="text-neutral-300" />
                  <p className="text-sm text-neutral-500">No transactions yet.</p>
                </Card>
              ) : (
                <TableContainer>
                  <Table>
                    <THead>
                      <TR>
                        <TH>Date</TH>
                        <TH>Plan</TH>
                        <TH>Amount</TH>
                        <TH>Status</TH>
                        <TH>Payment Method</TH>
                        <TH>Reference</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {invoices.map((inv) => (
                        <TR key={inv.id}>
                          <TD>{formatDateTime(inv.paidAt || inv.createdAt)}</TD>
                          <TD>
                            <div className="font-semibold text-neutral-900">{inv.planName}</div>
                            {inv.description && <div className="text-[11px] text-neutral-500 mt-0.5">{inv.description}</div>}
                          </TD>
                          <TD className="font-bold text-neutral-900">{formatPrice(inv.amount, inv.currency)}</TD>
                          <TD>
                            <Badge tone={inv.status === 'Paid' ? 'success' : 'warning'}>{inv.status}</Badge>
                          </TD>
                          <TD>{inv.payment ? inv.payment.paymentMethod : '—'}</TD>
                          <TD className="font-mono text-[11px] text-neutral-500">
                            {inv.payment?.gatewayPaymentId || inv.payment?.transactionId || '—'}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </TableContainer>
              )}
            </div>

            {subscription && (
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => router.push(`/workspace/dashboard?orgId=${orgId}`)}>
                  Go to Workspace
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <Modal
        open={!!confirmPlan}
        onClose={() => setConfirmPlan(null)}
        title="Switch Subscription Plan"
        description={confirmPlan ? `${orgName || 'This organization'} will move to the ${confirmPlan.name} plan effective immediately.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmPlan(null)} disabled={switching}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmSwitch} loading={switching}>
              Confirm Switch
            </Button>
          </>
        }
      >
        {confirmPlan && (
          <p className="text-xs text-neutral-600 leading-relaxed pb-4">
            This replaces the current subscription and starts a new billing cycle at{' '}
            <span className="font-bold text-neutral-900">{formatPrice(confirmPlan.price, confirmPlan.currency)}</span>
            {confirmPlan.price > 0 ? ` / ${confirmPlan.billingCycle.toLowerCase()}` : ''}.
            {confirmPlan.price > 0 && subscription && subscription.plan.price > 0 && (
              <> Any unused time left on your current plan is credited automatically, so the amount you're charged next may be less than the full price shown here.</>
            )}
            {confirmPlan.price > 0 && " You'll be prompted to complete payment via Razorpay before it activates."}
          </p>
        )}
      </Modal>
    </div>
  );
}
