'use client';

import { useCallback, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import NotificationsCenterTabs, { NOTIFICATIONS_TABS, NotificationsTabId } from '@/components/notifications/NotificationsCenterTabs';
import NotificationsDashboard from '@/components/notifications/NotificationsDashboard';
import NotificationList from '@/components/notifications/NotificationList';
import TemplatesSection from '@/components/notifications/TemplatesSection';
import CampaignsSection from '@/components/notifications/CampaignsSection';
import SchedulesSection from '@/components/notifications/SchedulesSection';
import DeliveryLogsSection from '@/components/notifications/DeliveryLogsSection';
import NotificationsSettingsSection from '@/components/notifications/NotificationsSettingsSection';
import { usePlatformPermissions } from '@/hooks/usePlatformPermissions';

function NotificationsCenterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission, loading: permsLoading } = usePlatformPermissions();

  const initialTab = (searchParams.get('section') as NotificationsTabId) || 'dashboard';
  const [tab, setTab] = useState<NotificationsTabId>(NOTIFICATIONS_TABS.some((t) => t.id === initialTab) ? initialTab : 'dashboard');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const changeTab = (next: NotificationsTabId) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', next);
    router.replace(`/operations/notifications?${params.toString()}`, { scroll: false });
  };

  const canView = permsLoading || hasPermission('notifications.view');
  const canSend = hasPermission('notifications.send');
  const canManageTemplates = hasPermission('notifications.manage_templates');
  const canManageCampaigns = hasPermission('notifications.manage_campaigns');
  const canManageSettings = hasPermission('global_settings.configure');

  if (!canView) {
    return <PlatformEmptyState title="You don't have access to the Notifications Center" description="Contact a Super Administrator to request the notifications.view permission." />;
  }

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Notifications Center"
        description="Manage and monitor platform notifications across In-App, Push, Email, SMS and (future) WhatsApp channels."
      />

      <NotificationsCenterTabs active={tab} onChange={changeTab} />

      {tab === 'dashboard' && <NotificationsDashboard />}
      {tab === 'notifications' && <NotificationList canSend={canSend} showToast={showToast} />}
      {tab === 'templates' && <TemplatesSection canManage={canManageTemplates} showToast={showToast} />}
      {tab === 'campaigns' && <CampaignsSection canManage={canManageCampaigns} canSend={canSend} showToast={showToast} />}
      {tab === 'schedules' && <SchedulesSection showToast={showToast} />}
      {tab === 'delivery-logs' && <DeliveryLogsSection showToast={showToast} />}
      {tab === 'settings' && <NotificationsSettingsSection canManage={canManageCampaigns} canManageSettings={canManageSettings} showToast={showToast} />}

      {toast && (
        <div className="fixed top-5 right-5 z-[100] flex items-center gap-3 p-4 bg-[#0b101d]/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl max-w-sm">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-xs font-bold text-slate-100">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default function NotificationsCenterPage() {
  return (
    <Suspense fallback={<div className="h-32 bg-slate-900/60 border border-slate-900 rounded-2xl animate-pulse" />}>
      <NotificationsCenterContent />
    </Suspense>
  );
}
