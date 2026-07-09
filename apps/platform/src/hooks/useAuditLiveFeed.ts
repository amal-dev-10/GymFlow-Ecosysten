'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { platformAuditApi } from '@/lib/api';
import type { AuditEventRowDTO } from '@/types/audit';

const POLL_INTERVAL_MS = 6000;
const FEED_SIZE = 40;

/**
 * PLT-010 Live Activity Feed: short-interval polling rather than a new
 * WebSocket namespace (confirmed tradeoff - no frontend socket.io-client
 * dependency existed, and the backend's only realtime gateway is
 * attendance-scoped). "Live" in the sense that matters for an admin
 * console: the feed refreshes on its own without a manual reload.
 */
export function useAuditLiveFeed(paused = false) {
  const [events, setEvents] = useState<AuditEventRowDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  const poll = useCallback(() => {
    platformAuditApi
      .list({ limit: FEED_SIZE, sortDir: 'desc' })
      .then((res) => {
        const fresh = res.data.filter((e) => !knownIds.current.has(e.id));
        res.data.forEach((e) => knownIds.current.add(e.id));
        setEvents(res.data);
        if (!firstLoad.current && fresh.length) {
          setNewIds(new Set(fresh.map((e) => e.id)));
          setTimeout(() => setNewIds(new Set()), 2500);
        }
        firstLoad.current = false;
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    poll();
    if (paused) return;
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [poll, paused]);

  return { events, loading, newIds, refetch: poll };
}
