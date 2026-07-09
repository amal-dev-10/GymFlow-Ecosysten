'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Megaphone } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import SupportCenterTabs, { SUPPORT_TABS, SupportTabId } from '@/components/support/SupportCenterTabs';
import SupportKpiCards from '@/components/support/SupportKpiCards';
import TicketList from '@/components/support/TicketList';
import CreateTicketModal from '@/components/support/CreateTicketModal';
import EscalationsSection from '@/components/support/EscalationsSection';
import SlaDashboardSection from '@/components/support/SlaDashboardSection';
import KnowledgeBase from '@/components/support/KnowledgeBase';
import CustomersSection from '@/components/support/CustomersSection';
import SettingsSection from '@/components/support/SettingsSection';
import NotificationsPanel from '@/components/support/NotificationsPanel';
import { platformSupportApi } from '@/lib/api';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import type { SupportDashboardDTO } from '@/types/support';

function SupportCenterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role } = usePlatformRole();
  const canManage = role === 'SUPER_ADMIN';

  const initialTab = (searchParams.get('section') as SupportTabId) || 'dashboard';
  const [tab, setTab] = useState<SupportTabId>(SUPPORT_TABS.some((t) => t.id === initialTab) ? initialTab : 'dashboard');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const changeTab = (next: SupportTabId) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', next);
    router.replace(`/operations/support?${params.toString()}`, { scroll: false });
  };

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const [dashboard, setDashboard] = useState<SupportDashboardDTO | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForOrg, setCreateForOrg] = useState<string | undefined>(undefined);

  useEffect(() => {
    setDashboardLoading(true);
    platformSupportApi.getDashboard().then(setDashboard).catch(() => setDashboard(null)).finally(() => setDashboardLoading(false));
  }, [tab]);

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Support Center"
        description="The operational workspace for GymFlow's Customer Success and Support teams — tickets, escalations, SLAs and the knowledge base, without leaving this page."
      />

      <SupportCenterTabs active={tab} onChange={changeTab} />

      {tab === 'dashboard' && (
        <div className="space-y-6">
          <SupportKpiCards dashboard={dashboard} loading={dashboardLoading} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Notifications</p>
            <NotificationsPanel />
          </div>
        </div>
      )}

      {tab === 'tickets' && <TicketList canManage={canManage} showToast={showToast} onCreateTicket={() => { setCreateForOrg(undefined); setCreateOpen(true); }} />}

      {tab === 'customers' && <CustomersSection onCreateTicketFor={(orgId) => { setCreateForOrg(orgId); setCreateOpen(true); }} />}

      {tab === 'escalations' && <EscalationsSection showToast={showToast} />}

      {tab === 'kb' && <KnowledgeBase canManage={canManage} showToast={showToast} />}

      {tab === 'announcements' && (
        <PlatformEmptyState icon={Megaphone} title="Announcements not connected" description="No platform-wide announcement delivery system exists yet - this mirrors the same 'not connected' state as the main Dashboard's Announcements widget." />
      )}

      {tab === 'sla' && <SlaDashboardSection canManage={canManage} showToast={showToast} />}

      {tab === 'settings' && <SettingsSection canManage={canManage} onNavigate={changeTab} />}

      {createOpen && (
        <CreateTicketModal
          initialOrganizationId={createForOrg}
          onClose={() => setCreateOpen(false)}
          onCreated={(ticketId) => {
            setCreateOpen(false);
            router.push(`/operations/support/tickets/${ticketId}`);
          }}
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

export default function SupportCenterPage() {
  return (
    <Suspense fallback={<div className="h-32 bg-slate-900/60 border border-slate-900 rounded-2xl animate-pulse" />}>
      <SupportCenterContent />
    </Suspense>
  );
}
