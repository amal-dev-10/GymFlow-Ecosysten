'use client';

import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api';
import type { PlatformRole } from '@/types/plans';

const WRITE_ROLES: PlatformRole[] = ['SUPER_ADMIN', 'FINANCE'];

/**
 * Fetches the current user's platform staff role fresh from /v1/auth/me
 * (rather than trusting stale localStorage) so write-action gating in the
 * UI always matches what PlatformAdminGuard will actually allow server-side.
 */
export function usePlatformRole() {
  const [role, setRole] = useState<PlatformRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authApi
      .getMe()
      .then((data) => {
        if (!cancelled) setRole(data?.user?.platformRole || null);
      })
      .catch(() => {
        if (!cancelled) setRole(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { role, loading, canWrite: role ? WRITE_ROLES.includes(role) : false };
}
