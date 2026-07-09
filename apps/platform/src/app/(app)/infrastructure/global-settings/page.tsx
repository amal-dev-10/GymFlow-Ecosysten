'use client';

import { useCallback, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import GlobalSettingsTabs, { SETTINGS_TABS, SettingsTabId } from '@/components/global-settings/GlobalSettingsTabs';
import SettingsSearchBox from '@/components/global-settings/SettingsSearchBox';
import SettingsDashboard from '@/components/global-settings/SettingsDashboard';
import CategorySettingsPanel from '@/components/global-settings/CategorySettingsPanel';
import GeneralSettingsFields from '@/components/global-settings/GeneralSettingsFields';
import BrandingSettingsFields from '@/components/global-settings/BrandingSettingsFields';
import LocalizationSettingsFields from '@/components/global-settings/LocalizationSettingsFields';
import AuthenticationSettingsFields from '@/components/global-settings/AuthenticationSettingsFields';
import SecuritySettingsFields from '@/components/global-settings/SecuritySettingsFields';
import NotificationsSettingsFields from '@/components/global-settings/NotificationsSettingsFields';
import StorageSettingsFields from '@/components/global-settings/StorageSettingsFields';
import EmailSettingsFields from '@/components/global-settings/EmailSettingsFields';
import MobileAppsSettingsFields from '@/components/global-settings/MobileAppsSettingsFields';
import SystemSettingsFields from '@/components/global-settings/SystemSettingsFields';
import AutomationSettingsFields from '@/components/global-settings/AutomationSettingsFields';
import ImportExportPanel from '@/components/global-settings/ImportExportPanel';
import VersionHistoryPanel from '@/components/global-settings/VersionHistoryPanel';
import SettingsAuditHistoryPanel from '@/components/global-settings/SettingsAuditHistoryPanel';
import { usePlatformPermissions } from '@/hooks/usePlatformPermissions';
import type { SettingsCategory } from '@/types/globalSettings';

function GlobalSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission, loading: permsLoading } = usePlatformPermissions();

  const initialTab = (searchParams.get('section') as SettingsTabId) || 'dashboard';
  const [tab, setTab] = useState<SettingsTabId>(SETTINGS_TABS.some((t) => t.id === initialTab) ? initialTab : 'dashboard');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const changeTab = (next: SettingsTabId) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', next);
    router.replace(`/infrastructure/global-settings?${params.toString()}`, { scroll: false });
  };

  const canViewSettings = permsLoading || hasPermission('global_settings.view');
  const canEdit = (category: SettingsCategory) => (category === 'system' ? hasPermission('global_settings.manage_system') : hasPermission('global_settings.configure'));

  if (!canViewSettings) {
    return <PlatformEmptyState title="You don't have access to Global Settings" description="Contact a Super Administrator to request the global_settings.view permission." />;
  }

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Global Settings"
        description="Centralized configuration for the entire GymFlow platform - branding, localization, authentication, security, mobile apps and system defaults."
        actions={<SettingsSearchBox onSelect={changeTab} />}
      />

      <GlobalSettingsTabs active={tab} onChange={changeTab} />

      {tab === 'dashboard' && <SettingsDashboard onNavigate={(c) => changeTab(c as SettingsTabId)} />}

      {tab === 'general' && (
        <CategorySettingsPanel category="general" canEdit={canEdit('general')} showToast={showToast}>
          {(values, setValue, editable) => <GeneralSettingsFields values={values} setValue={setValue} canEdit={editable} />}
        </CategorySettingsPanel>
      )}

      {tab === 'branding' && (
        <CategorySettingsPanel category="branding" canEdit={canEdit('branding')} showToast={showToast}>
          {(values, setValue, editable) => <BrandingSettingsFields values={values} setValue={setValue} canEdit={editable} showToast={showToast} />}
        </CategorySettingsPanel>
      )}

      {tab === 'localization' && (
        <CategorySettingsPanel category="localization" canEdit={canEdit('localization')} showToast={showToast}>
          {(values, setValue, editable) => <LocalizationSettingsFields values={values} setValue={setValue} canEdit={editable} />}
        </CategorySettingsPanel>
      )}

      {tab === 'authentication' && (
        <CategorySettingsPanel category="authentication" canEdit={canEdit('authentication')} showToast={showToast}>
          {(values, setValue, editable) => <AuthenticationSettingsFields values={values} setValue={setValue} canEdit={editable} />}
        </CategorySettingsPanel>
      )}

      {tab === 'security' && (
        <CategorySettingsPanel category="security" canEdit={canEdit('security')} showToast={showToast}>
          {(values, setValue, editable) => <SecuritySettingsFields values={values} setValue={setValue} canEdit={editable} />}
        </CategorySettingsPanel>
      )}

      {tab === 'notifications' && (
        <CategorySettingsPanel category="notifications" canEdit={canEdit('notifications')} showToast={showToast}>
          {(values, setValue, editable) => <NotificationsSettingsFields values={values} setValue={setValue} canEdit={editable} />}
        </CategorySettingsPanel>
      )}

      {tab === 'storage' && (
        <CategorySettingsPanel category="storage" canEdit={canEdit('storage')} showToast={showToast}>
          {(values, setValue, editable) => <StorageSettingsFields values={values} setValue={setValue} canEdit={editable} />}
        </CategorySettingsPanel>
      )}

      {tab === 'email' && (
        <CategorySettingsPanel category="email" canEdit={canEdit('email')} showToast={showToast}>
          {(values, setValue, editable) => <EmailSettingsFields values={values} setValue={setValue} canEdit={editable} />}
        </CategorySettingsPanel>
      )}

      {tab === 'mobile_apps' && (
        <CategorySettingsPanel category="mobile_apps" canEdit={canEdit('mobile_apps')} showToast={showToast}>
          {(values, setValue, editable) => <MobileAppsSettingsFields values={values} setValue={setValue} canEdit={editable} />}
        </CategorySettingsPanel>
      )}

      {tab === 'system' && (
        <CategorySettingsPanel category="system" canEdit={canEdit('system')} showToast={showToast}>
          {(values, setValue, editable) => <SystemSettingsFields values={values} setValue={setValue} canEdit={editable} />}
        </CategorySettingsPanel>
      )}

      {tab === 'automation' && (
        <CategorySettingsPanel category="automation" canEdit={canEdit('automation')} showToast={showToast}>
          {(values, setValue, editable) => <AutomationSettingsFields values={values} setValue={setValue} canEdit={editable} />}
        </CategorySettingsPanel>
      )}

      {tab === 'audit' && <SettingsAuditHistoryPanel />}

      {tab === 'versions' && <VersionHistoryPanel showToast={showToast} />}

      {tab !== 'dashboard' && tab !== 'audit' && tab !== 'versions' && (
        <div className="flex justify-end">
          <ImportExportPanel showToast={showToast} canImport={hasPermission('global_settings.configure')} />
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

export default function GlobalSettingsPage() {
  return (
    <Suspense fallback={<div className="h-32 bg-slate-900/60 border border-slate-900 rounded-2xl animate-pulse" />}>
      <GlobalSettingsContent />
    </Suspense>
  );
}
