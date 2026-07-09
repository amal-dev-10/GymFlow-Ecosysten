'use client';

import React, { useEffect, useState } from 'react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import WelcomeSection from '@/components/dashboard/WelcomeSection';
import ExecutiveKPIGrid from '@/components/dashboard/ExecutiveKPIGrid';
import QuickActionsBar from '@/components/dashboard/QuickActionsBar';
import LayoutToolbar from '@/components/dashboard/LayoutToolbar';
import PlatformHealthPanel from '@/components/dashboard/PlatformHealthPanel';
import SystemMonitoring from '@/components/dashboard/SystemMonitoring';
import RevenueAnalytics from '@/components/dashboard/RevenueAnalytics';
import OrganizationOverview from '@/components/dashboard/OrganizationOverview';
import SubscriptionOverview from '@/components/dashboard/SubscriptionOverview';
import PlatformUsage from '@/components/dashboard/PlatformUsage';
import SupportOverview from '@/components/dashboard/SupportOverview';
import ActivityTimeline from '@/components/dashboard/ActivityTimeline';
import AlertsCenter from '@/components/dashboard/AlertsCenter';
import RecentDeployments from '@/components/dashboard/RecentDeployments';
import Announcements from '@/components/dashboard/Announcements';
import AuditSnapshot from '@/components/dashboard/AuditSnapshot';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';

// Widgets that read better spanning the full grid width.
const FULL_WIDTH_WIDGETS = new Set(['system-monitoring', 'revenue-analytics', 'activity-timeline']);

interface WidgetProps {
  id: string;
  onHide?: (id: string) => void;
  draggable?: boolean;
  onDragStart?: (id: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (id: string) => void;
  favorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

const WIDGET_REGISTRY: Record<string, React.ComponentType<WidgetProps>> = {
  'platform-health': PlatformHealthPanel,
  'system-monitoring': SystemMonitoring,
  'revenue-analytics': RevenueAnalytics,
  'organization-overview': OrganizationOverview,
  'subscription-overview': SubscriptionOverview,
  'platform-usage': PlatformUsage,
  'support-overview': SupportOverview,
  'activity-timeline': ActivityTimeline,
  'alerts-center': AlertsCenter,
  'recent-deployments': RecentDeployments,
  announcements: Announcements,
  'audit-snapshot': AuditSnapshot,
};

export default function PlatformDashboardPage() {
  const [userName, setUserName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const layout = useDashboardLayout();

  useEffect(() => {
    const userStr = localStorage.getItem('platform_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserName(u.fullName || u.name || '');
      } catch {
        /* ignore */
      }
    }
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 600);
  };

  const visibleOrder = layout.order.filter((id) => !layout.hidden.has(id));

  return (
    <div key={refreshKey} className="space-y-6">
      <PlatformPageHeader title="Platform Dashboard" description="Executive command center for the entire GymFlow SaaS platform." />

      <WelcomeSection
        userName={userName}
        status="unknown"
        summary="Platform-wide status reporting isn't connected to a backend source yet - once wired up, this banner will summarize organization counts, health, and incidents in real time."
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2.5">Quick Actions</p>
        <QuickActionsBar />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Executive KPIs</p>
        </div>
        <ExecutiveKPIGrid />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Operations</p>
        {layout.mounted && (
          <LayoutToolbar
            hidden={layout.hidden}
            isCustomized={layout.isCustomized}
            onShow={layout.showWidget}
            onRestoreDefault={layout.restoreDefault}
          />
        )}
      </div>

      {layout.mounted && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visibleOrder.map((id) => {
            const Widget = WIDGET_REGISTRY[id];
            if (!Widget) return null;
            return (
              <div key={id} className={FULL_WIDTH_WIDGETS.has(id) ? 'lg:col-span-2' : ''}>
                <Widget
                  id={id}
                  onHide={layout.hideWidget}
                  draggable
                  onDragStart={layout.handleDragStart}
                  onDrop={layout.handleDrop}
                  favorite={layout.favorites.has(id)}
                  onToggleFavorite={layout.toggleFavorite}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
