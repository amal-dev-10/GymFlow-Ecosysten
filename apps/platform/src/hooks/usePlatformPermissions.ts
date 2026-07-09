'use client';

import { useEffect, useState, useCallback } from 'react';
import { authApi } from '@/lib/api';

/**
 * PLT-008 authorization framework primitive for the frontend: fetches the
 * current user's effective permissions (computed server-side by
 * PlatformAuthorizationService) fresh from /v1/auth/me. Future modules
 * should call hasPermission(key) here instead of comparing platformRole to
 * a hardcoded string - see usePlatformRole.ts for the legacy pattern this
 * is meant to eventually replace.
 */
export function usePlatformPermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    authApi
      .getMe()
      .then((data) => setPermissions(data?.user?.effectivePermissions || []))
      .catch(() => setPermissions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    authApi
      .getMe()
      .then((data) => {
        if (!cancelled) setPermissions(data?.user?.effectivePermissions || []);
      })
      .catch(() => {
        if (!cancelled) setPermissions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasPermission = useCallback((key: string) => permissions.includes(key), [permissions]);

  return { permissions, loading, hasPermission, refetch };
}
