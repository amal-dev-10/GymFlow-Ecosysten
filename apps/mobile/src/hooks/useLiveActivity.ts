import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '../providers/WorkspaceProvider';
import { membershipsApi, billingApi, InvoiceDto } from '../lib/api';
import {
  useNotificationsStore,
  LiveNotification,
  LiveTask,
} from '../store/notifications.store';

// ---------------------------------------------------------------------------
// Derives the real activity inbox for the active gym from live data:
//   • Memberships expiring within 7 days  → renewal alerts + tasks
//   • Subscriptions with outstanding dues → payment alerts + collect tasks
// Item ids are stable (keyed off the subscription id) so the store's persisted
// read/completed/dismissed overlays keep working across refreshes.
// ---------------------------------------------------------------------------

const EXPIRY_WINDOW_DAYS = 7;

function fmtCurrency(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function buildFeed(expiring: any[], dues: InvoiceDto[]): { notifications: LiveNotification[]; tasks: LiveTask[] } {
  const notifications: LiveNotification[] = [];
  const tasks: LiveTask[] = [];

  // --- Expiring memberships ---
  for (const sub of expiring) {
    const name = `${sub.member?.firstName || ''} ${sub.member?.lastName || ''}`.trim() || 'A member';
    const planName = sub.membershipPlan?.name || 'membership';
    const days = sub.daysUntilExpiry ?? 0;
    const when = days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
    const priority = days <= 1 ? 'high' : 'normal';

    notifications.push({
      id: `exp-${sub.id}`,
      category: 'membership',
      title: 'Membership expiring soon',
      description: `${name}'s ${planName} plan expires ${when}.`,
      time: sub.endDate || new Date().toISOString(),
      priority,
      actionType: 'renew-membership',
      memberId: sub.memberId,
      invoiceId: sub.id,
    });

    tasks.push({
      id: `renew-${sub.id}`,
      category: 'renew',
      title: `Renew: ${name}`,
      description: `${planName} plan expires ${when}.`,
      priority,
      dueDate: sub.endDate || new Date().toISOString(),
      memberId: sub.memberId,
      memberName: name,
      invoiceId: sub.id,
    });
  }

  // --- Outstanding dues ---
  for (const inv of dues) {
    const overdue = inv.status === 'Overdue';
    notifications.push({
      id: `due-${inv.id}`,
      category: 'payments',
      title: overdue ? 'Overdue payment' : 'Payment due',
      description: `${inv.memberName} has ${fmtCurrency(inv.outstanding)} outstanding on ${inv.invoiceNumber}.`,
      time: inv.dueDate || inv.createdAt,
      priority: overdue ? 'critical' : 'high',
      actionType: 'collect-payment',
      memberId: inv.memberId,
      invoiceId: inv.id,
    });

    tasks.push({
      id: `collect-${inv.id}`,
      category: 'collect',
      title: `Collect dues: ${inv.memberName}`,
      description: `${fmtCurrency(inv.outstanding)} outstanding${overdue ? ' (overdue)' : ''}.`,
      priority: overdue ? 'critical' : 'high',
      dueDate: inv.dueDate || inv.createdAt,
      memberId: inv.memberId,
      memberName: inv.memberName,
      invoiceId: inv.id,
    });
  }

  // Most urgent first, then soonest.
  const rank: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };
  notifications.sort((a, b) => rank[a.priority] - rank[b.priority] || new Date(a.time).getTime() - new Date(b.time).getTime());
  tasks.sort((a, b) => rank[a.priority] - rank[b.priority] || new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return { notifications, tasks };
}

export function useLiveActivity() {
  const { gymId } = useWorkspace();
  const gid = gymId || '';
  const syncLiveItems = useNotificationsStore((s) => s.syncLiveItems);

  const expiringQuery = useQuery({
    queryKey: ['liveActivity', 'expiring', gid],
    queryFn: () => membershipsApi.getExpiring(gid, EXPIRY_WINDOW_DAYS),
    enabled: !!gid,
  });

  const duesQuery = useQuery({
    queryKey: ['liveActivity', 'dues', gid],
    queryFn: () => billingApi.listPendingDues(gid),
    enabled: !!gid,
  });

  const expiring = expiringQuery.data;
  const dues = duesQuery.data;

  useEffect(() => {
    if (expiring === undefined || dues === undefined) return;
    const { notifications, tasks } = buildFeed(expiring, dues);
    syncLiveItems(notifications, tasks);
  }, [expiring, dues, syncLiveItems]);

  return {
    isLoading: expiringQuery.isLoading || duesQuery.isLoading,
    isFetching: expiringQuery.isFetching || duesQuery.isFetching,
    isError: expiringQuery.isError || duesQuery.isError,
    refetch: () => {
      expiringQuery.refetch();
      duesQuery.refetch();
    },
  };
}
