'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import RevenueCenterTabs, { REVENUE_TABS, RevenueTabId } from '@/components/revenue/RevenueCenterTabs';
import RevenueKpiCards from '@/components/revenue/RevenueKpiCards';
import { TrendAreaChart, RevenueByCountryChart, RevenueByPlanChart, RevenueByGatewayChart, SubscriptionGrowthChart } from '@/components/revenue/RevenueCharts';
import SubscriptionAnalyticsSection from '@/components/revenue/SubscriptionAnalyticsSection';
import InvoiceTable from '@/components/revenue/InvoiceTable';
import PaymentTable from '@/components/revenue/PaymentTable';
import RefundCenter from '@/components/revenue/RefundCenter';
import CouponAnalyticsSection from '@/components/revenue/CouponAnalyticsSection';
import TaxesSection from '@/components/revenue/TaxesSection';
import ForecastingSection from '@/components/revenue/ForecastingSection';
import ReportsSection from '@/components/revenue/ReportsSection';
import RevenueNotificationsPanel from '@/components/revenue/RevenueNotificationsPanel';
import SettingsSection from '@/components/revenue/SettingsSection';
import { platformRevenueApi } from '@/lib/api';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import type { RevenueDashboardDTO, RevenueChartsDTO } from '@/types/revenue';

function RevenueCenterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role } = usePlatformRole();
  const canManage = role === 'SUPER_ADMIN';

  const initialTab = (searchParams.get('section') as RevenueTabId) || 'dashboard';
  const [tab, setTab] = useState<RevenueTabId>(REVENUE_TABS.some((t) => t.id === initialTab) ? initialTab : 'dashboard');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const changeTab = (next: RevenueTabId) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', next);
    router.replace(`/commercial/billing?${params.toString()}`, { scroll: false });
  };

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const [dashboard, setDashboard] = useState<RevenueDashboardDTO | null>(null);
  const [charts, setCharts] = useState<RevenueChartsDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tab !== 'dashboard') return;
    setLoading(true);
    Promise.all([platformRevenueApi.getDashboard(), platformRevenueApi.getCharts()])
      .then(([d, c]) => { setDashboard(d); setCharts(c); })
      .catch(() => showToast('Failed to load revenue dashboard.', 'error'))
      .finally(() => setLoading(false));
  }, [tab, showToast]);

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Revenue & Billing Center"
        description="GymFlow's own internal financial dashboard — MRR, ARR, invoices, payments, refunds and forecasting for commercial operations. Not the billing module used by organizations."
      />

      <RevenueCenterTabs active={tab} onChange={changeTab} />

      {tab === 'dashboard' && (
        <div className="space-y-6">
          <RevenueKpiCards dashboard={dashboard} loading={loading} />
          {charts && !loading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TrendAreaChart title="Revenue Trend (12mo)" data={charts.revenueTrend} gradientId="revenueTrendGradient" color="#818cf8" />
              <TrendAreaChart title="MRR Growth" data={charts.mrrGrowth} gradientId="mrrGrowthGradient" color="#34d399" />
              <SubscriptionGrowthChart data={charts.subscriptionGrowth} />
              <RevenueByGatewayChart data={charts.revenueByPaymentMethod} />
              <RevenueByCountryChart data={charts.revenueByCountry} />
              <RevenueByPlanChart data={charts.revenueByPlan} />
            </div>
          )}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Notifications</p>
            <RevenueNotificationsPanel />
          </div>
        </div>
      )}

      {tab === 'subscriptions' && <SubscriptionAnalyticsSection />}
      {tab === 'invoices' && <InvoiceTable canManage={canManage} showToast={showToast} />}
      {tab === 'payments' && <PaymentTable canManage={canManage} showToast={showToast} />}
      {tab === 'refunds' && <RefundCenter />}
      {tab === 'coupons' && <CouponAnalyticsSection />}
      {tab === 'taxes' && <TaxesSection showToast={showToast} />}
      {tab === 'forecasting' && <ForecastingSection />}
      {tab === 'reports' && <ReportsSection showToast={showToast} />}
      {tab === 'settings' && <SettingsSection canManage={canManage} showToast={showToast} />}

      {toast && (
        <div className="fixed top-5 right-5 z-[100] flex items-center gap-3 p-4 bg-[#0b101d]/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl max-w-sm">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-xs font-bold text-slate-100">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default function RevenueCenterPage() {
  return (
    <Suspense fallback={<div className="h-32 bg-slate-900/60 border border-slate-900 rounded-2xl animate-pulse" />}>
      <RevenueCenterContent />
    </Suspense>
  );
}
