'use client';

import { useCallback, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import AutomationTabs, { AUTOMATION_TABS, AutomationTabId } from '@/components/automation/AutomationTabs';
import AutomationDashboard from '@/components/automation/AutomationDashboard';
import JobList from '@/components/automation/JobList';
import SchedulesSection from '@/components/automation/SchedulesSection';
import WorkflowsSection from '@/components/automation/WorkflowsSection';
import QueueMonitorSection from '@/components/automation/QueueMonitorSection';
import ExecutionHistorySection from '@/components/automation/ExecutionHistorySection';
import FailedJobsSection from '@/components/automation/FailedJobsSection';
import AutomationSettingsSection from '@/components/automation/AutomationSettingsSection';
import { usePlatformPermissions } from '@/hooks/usePlatformPermissions';

function AutomationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission, loading: permsLoading } = usePlatformPermissions();

  const initialTab = (searchParams.get('section') as AutomationTabId) || 'dashboard';
  const [tab, setTab] = useState<AutomationTabId>(AUTOMATION_TABS.some((t) => t.id === initialTab) ? initialTab : 'dashboard');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const changeTab = (next: AutomationTabId) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', next);
    router.replace(`/infrastructure/automation?${params.toString()}`, { scroll: false });
  };

  const canView = permsLoading || hasPermission('automation.view');
  const canManageJobs = hasPermission('automation.manage_jobs');
  const canRunNow = hasPermission('automation.run_now');
  const canManageFailures = hasPermission('automation.manage_failures');
  const canManageSettings = hasPermission('global_settings.configure');

  if (!canView) {
    return <PlatformEmptyState title="You don't have access to Automation & Jobs" description="Contact a Super Administrator to request the automation.view permission." />;
  }

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Automation & Jobs"
        description="Centralized management for all platform automations, scheduled jobs, workflows and queues."
      />

      <AutomationTabs active={tab} onChange={changeTab} />

      {tab === 'dashboard' && <AutomationDashboard />}
      {tab === 'jobs' && <JobList mode="all" canManage={canManageJobs} canRun={canRunNow} showToast={showToast} />}
      {tab === 'schedules' && <SchedulesSection showToast={showToast} />}
      {tab === 'workflows' && <WorkflowsSection canManage={canManageJobs} canRun={canRunNow} showToast={showToast} />}
      {tab === 'queues' && <QueueMonitorSection canManage={canManageJobs} showToast={showToast} />}
      {tab === 'history' && <ExecutionHistorySection showToast={showToast} />}
      {tab === 'failed' && <FailedJobsSection canManage={canManageFailures} showToast={showToast} />}
      {tab === 'settings' && <AutomationSettingsSection canManage={canManageSettings} showToast={showToast} />}

      {toast && (
        <div className="fixed top-5 right-5 z-[100] flex items-center gap-3 p-4 bg-[#0b101d]/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl max-w-sm">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-xs font-bold text-slate-100">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default function AutomationPage() {
  return (
    <Suspense fallback={<div className="h-32 bg-slate-900/60 border border-slate-900 rounded-2xl animate-pulse" />}>
      <AutomationContent />
    </Suspense>
  );
}
