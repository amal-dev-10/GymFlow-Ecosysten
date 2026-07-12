'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Analytics HQ was merged into the unified Dashboard — this route now just
// forwards old links/bookmarks to the new location, preserving any gymId/orgId.
function RedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.get('gymId')) params.set('gymId', 'all');
    router.replace(`/workspace/dashboard?${params.toString()}`);
  }, [router, searchParams]);

  return null;
}

export default function AnalyticsRedirectPage() {
  return (
    <Suspense fallback={null}>
      <RedirectInner />
    </Suspense>
  );
}
