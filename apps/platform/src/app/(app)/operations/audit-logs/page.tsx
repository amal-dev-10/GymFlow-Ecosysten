'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import AuditCenterTabs, { AUDIT_TABS, AuditTabId } from '@/components/audit/AuditCenterTabs';
import AuditKpiCards from '@/components/audit/AuditKpiCards';
import ActivityFeedList from '@/components/audit/ActivityFeedList';
import AuditLogsExplorer from '@/components/audit/AuditLogsExplorer';
import AuditEventDetailsDrawer from '@/components/audit/AuditEventDetailsDrawer';
import SecurityEventsSection from '@/components/audit/SecurityEventsSection';
import ApiActivitySection from '@/components/audit/ApiActivitySection';
import ExportsSection from '@/components/audit/ExportsSection';
import RetentionPolicySection from '@/components/audit/RetentionPolicySection';
import AlertsSection from '@/components/audit/AlertsSection';
import SettingsSection from '@/components/audit/SettingsSection';
import { platformAuditApi } from '@/lib/api';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import type { AuditDashboardDTO, AuditEventRowDTO } from '@/types/audit';

function AuditCenterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role } = usePlatformRole();
  const canManage = role === 'SUPER_ADMIN';

  const initialTab = (searchParams.get('section') as AuditTabId) || 'dashboard';
  const [tab, setTab] = useState<AuditTabId>(AUDIT_TABS.some((t) => t.id === initialTab) ? initialTab : 'dashboard');
  const [alertsView, setAlertsView] = useState(false);

  const changeTab = (next: AuditTabId) => {
    setTab(next);
    setAlertsView(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', next);
    router.replace(`/operations/audit-logs?${params.toString()}`, { scroll: false });
  };

  const [dashboard, setDashboard] = useState<AuditDashboardDTO | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<AuditEventRowDTO | { id: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const loadDashboard = useCallback(() => {
    setDashboardLoading(true);
    platformAuditApi.getDashboard().then(setDashboard).catch(() => setDashboard(null)).finally(() => setDashboardLoading(false));
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const openEvent = (event: AuditEventRowDTO | { id: string }) => setSelectedEvent(event);

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Audit Center"
        description="The single source of truth for platform activity, security, compliance and operational investigation."
      />

      <AuditCenterTabs active={tab} onChange={changeTab} />

      {tab === 'dashboard' && (
        <div className="space-y-6">
          <AuditKpiCards dashboard={dashboard} loading={dashboardLoading} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Recent Activity</p>
            <ActivityFeedList onSelect={openEvent} />
          </div>
        </div>
      )}

      {tab === 'feed' && <ActivityFeedList onSelect={openEvent} />}

      {tab === 'logs' && <AuditLogsExplorer onSelectEvent={openEvent} showToast={showToast} />}

      {tab === 'security' && <SecurityEventsSection onSelectEvent={openEvent} />}

      {tab === 'api' && <ApiActivitySection />}

      {tab === 'exports' && <ExportsSection showToast={showToast} />}

      {tab === 'retention' && <RetentionPolicySection canManage={canManage} showToast={showToast} />}

      {tab === 'settings' && (
        <SettingsSection canManage={canManage} showToast={showToast} onOpenAlerts={() => setAlertsView(true)} alertsView={alertsView} onCloseAlerts={() => setAlertsView(false)} />
      )}

      {selectedEvent && (
        <AuditEventDetailsDrawer
          eventId={selectedEvent.id}
          onClose={() => setSelectedEvent(null)}
          onSelectRelated={(id) => setSelectedEvent({ id })}
        />
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

export default function AuditCenterPage() {
  return (
    <Suspense fallback={<div className="h-32 bg-slate-900/60 border border-slate-900 rounded-2xl animate-pulse" />}>
      <AuditCenterContent />
    </Suspense>
  );
}
