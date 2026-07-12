'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Tabs } from '../../../components/ui';

const TABS = [
  { id: '/workspace/memberships', label: 'Membership Plans' },
  { id: '/workspace/memberships/expiry', label: 'Expiry Tracking' },
  { id: '/workspace/memberships/history', label: 'Membership History' },
  { id: '/workspace/memberships/automation', label: 'Expiry Automation' },
  { id: '/workspace/memberships/freeze', label: 'Freeze Management' },
  { id: '/workspace/memberships/reactivate', label: 'Reactivate Membership' },
  { id: '/workspace/memberships/access', label: 'Multi-Branch Access' },
];

// Shared cross-route tab strip for the Memberships module — every tab
// navigates to its own page rather than switching local state.
export default function MembershipsTabs() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Tabs
      className="border-b-0 bg-transparent"
      tabs={TABS}
      activeId={pathname}
      onChange={(path) => router.push(path)}
    />
  );
}
