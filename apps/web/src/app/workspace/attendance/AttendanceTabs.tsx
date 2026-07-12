'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Monitor,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Radio
} from 'lucide-react';
import { Tabs } from '../../../components/ui';

export default function AttendanceTabs() {
  const router = useRouter();
  const pathname = usePathname();

  const primaryTabs = [
    { id: '/workspace/attendance', label: 'Attendance Terminal', icon: Monitor },
    { id: '/workspace/attendance/records', label: 'History', icon: HistoryIcon },
    { id: '/workspace/attendance/devices', label: 'Connected Devices', icon: Radio },
    { id: '/workspace/attendance/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const activeTab = primaryTabs.find((tab) => tab.id === pathname);

  return (
    <div className="sticky top-[-32px] bg-background z-40 py-5">
      <Tabs
        tabs={primaryTabs}
        activeId={activeTab?.id || ''}
        onChange={(path) => router.push(path)}
      />
    </div>
  );
}
