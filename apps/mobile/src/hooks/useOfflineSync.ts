import { useEffect, useRef } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { peek, dequeue, QueuedMutation } from '../lib/offlineQueue';
import { membersApi, attendanceApi, membershipsApi } from '../lib/api';
import { queryClient } from '../lib/queryClient';

/**
 * Watches for network reconnection and automatically flushes any queued
 * offline mutations (create/update member). After a successful flush it
 * invalidates the members query cache so lists pick up the new data.
 */
export function useOfflineSync() {
  const { isOffline } = useNetworkStatus();
  const flushing = useRef(false);

  useEffect(() => {
    if (isOffline || flushing.current) return;

    const flush = async () => {
      const queue = peek();
      if (queue.length === 0) return;

      flushing.current = true;
      for (const mutation of queue) {
        try {
          await executeMutation(mutation);
          dequeue(mutation.id);
        } catch {
          // Stop flushing on first failure — will retry on next reconnect
          break;
        }
      }
      flushing.current = false;

      // Invalidate query caches so screens pick up synced data
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['activeMembers'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceLogs'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceStats'] });
    };

    flush();
  }, [isOffline]);
}

async function executeMutation(m: QueuedMutation): Promise<void> {
  switch (m.type) {
    case 'create-member':
      await membersApi.create(m.payload);
      break;
    case 'update-member':
      await membersApi.update(m.payload.id, m.payload.data);
      break;
    case 'create-membership':
      await membershipsApi.purchaseMembership(m.payload);
      break;
    case 'freeze-membership':
      await membershipsApi.requestFreeze(m.payload);
      break;
    case 'check-in':
      await membersApi.checkIn(m.payload.memberId, m.payload.gymId, { method: m.payload.method, memberName: m.payload.memberName });
      break;
    case 'check-out':
      await membersApi.checkOut(m.payload.attendanceId || m.payload.memberId);
      break;
    case 'create-membership-plan':
      await membershipsApi.createPlan(m.payload);
      break;
  }
}
