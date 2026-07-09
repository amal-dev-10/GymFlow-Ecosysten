'use client';

import { useCallback, useEffect, useState } from 'react';
import type { WidgetResult } from '@/types/dashboard';

/**
 * The single seam every dashboard widget fetches through. Today no
 * platform-wide backend endpoints exist (organization-wide MRR/ARR, system
 * health, deployments, etc. are not implemented in apps/api yet), so this
 * always resolves to `connected: false` after a brief simulated load - it
 * never fabricates numbers.
 *
 * To wire a widget to a real endpoint later: replace the body of the
 * `fetcher` passed in with a real `apiClient.get(...)` call returning data
 * shaped per the widget's type in `types/dashboard.ts`. No widget/UI code
 * needs to change - they already render real `data`, `loading`, and
 * `connected` states.
 */
export function usePlatformWidget<T>(
  widgetKey: string,
  fetcher?: () => Promise<T>
): WidgetResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      if (!fetcher) {
        // No real endpoint wired for this widget yet.
        if (!cancelled) {
          setData(null);
          setConnected(false);
          setLoading(false);
        }
        return;
      }
      try {
        const result = await fetcher();
        if (!cancelled) {
          setData(result);
          setConnected(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load widget data');
          setConnected(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetKey, tick]);

  return { data, loading, error, connected, refetch };
}

/**
 * Subscribes to a platform-wide WebSocket event once the backend exposes
 * one (e.g. a `/platform` socket namespace broadcasting health/metric
 * updates). Currently a no-op so widgets can call it now and get live
 * updates automatically the moment a real socket exists - no UI changes
 * required at that point.
 */
export function usePlatformRealtimeEvent(_eventName: string, _onEvent: (payload: unknown) => void) {
  useEffect(() => {
    // TODO: connect to a real `/platform` socket.io namespace once the
    // backend exposes platform-wide realtime events, mirroring
    // apps/web's useGlobalAttendanceNotifications pattern.
  }, [_eventName, _onEvent]);
}
