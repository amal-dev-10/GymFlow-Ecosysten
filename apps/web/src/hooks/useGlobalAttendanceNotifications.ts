'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { playBeep } from '../lib/beep';
import { useNotify } from '../context/notifications';

/**
 * Workspace-wide attendance listener. Joins the socket room for every
 * branch in the organization (not just the one branch a single page might
 * be scoped to) so a check-in from any source - the reception terminal,
 * the device simulator, or real hardware later - surfaces a toast + beep
 * no matter which page in the workspace the operator is currently on.
 */
export function useGlobalAttendanceNotifications(gymIds: string[]) {
  const { notify } = useNotify();
  const queryClient = useQueryClient();
  const gymIdsKey = gymIds.join(',');
  const socketRef = useRef<import('socket.io-client').Socket | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !gymIdsKey) return;

    let cancelled = false;

    (async () => {
      const { io } = await import('socket.io-client');
      if (cancelled) return;

      const token = localStorage.getItem('token');
      const socket = io('http://localhost:5000/attendance', { auth: { token } });
      socketRef.current = socket;

      const joinAll = () => gymIdsKey.split(',').forEach((gymId) => socket.emit('join:gym', { gymId }));

      socket.on('connect', joinAll);
      socket.io.on('reconnect', joinAll);

      socket.on('attendance:check-in', (record: any) => {
        queryClient.invalidateQueries({ queryKey: ['attendance'] });
        queryClient.invalidateQueries({ queryKey: ['gym', 'occupancy'] });
        queryClient.invalidateQueries({ queryKey: ['devices'] });
        notify(
          `${record?.memberName || 'Member'} checked in via ${record?.method || 'scan'}${record?.deviceUsed ? ` (${record.deviceUsed})` : ''}.`,
          'success'
        );
        playBeep(true);
      });

      socket.on('attendance:check-out', (record: any) => {
        queryClient.invalidateQueries({ queryKey: ['attendance'] });
        queryClient.invalidateQueries({ queryKey: ['gym', 'occupancy'] });
        notify(`${record?.memberName || 'Member'} checked out.`, 'info');
      });

      // Fires for EVERY check-in attempt (Granted/Warning/Denied), from any
      // source - terminal, mobile app, or a biometric device. 'Granted' is
      // already covered by attendance:check-in above; this is what actually
      // surfaces a Denied attempt (or a Warning-flagged grant) to staff
      // anywhere in the workspace - previously nothing subscribed to this
      // event at all, so a denial was invisible outside the exact page that
      // triggered it.
      socket.on('membership:validation', (payload: any) => {
        if (!payload || payload.status === 'Granted') return;
        queryClient.invalidateQueries({ queryKey: ['attendance'] });
        queryClient.invalidateQueries({ queryKey: ['gym', 'occupancy'] });
        const who = payload.memberName || 'A member';
        if (payload.status === 'Denied') {
          notify(`${who} was denied entry${payload.reason ? `: ${payload.reason}` : '.'}`, 'error');
          playBeep(false);
        } else if (payload.status === 'Warning') {
          notify(`${who} checked in with a warning${payload.reason ? `: ${payload.reason}` : '.'}`, 'error');
        }
      });

      socket.on('alert', (alert: any) => {
        notify(typeof alert === 'string' ? alert : alert?.message || 'Attendance alert received', 'error');
        playBeep(false);
      });
    })();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [gymIdsKey, notify, queryClient]);
}
