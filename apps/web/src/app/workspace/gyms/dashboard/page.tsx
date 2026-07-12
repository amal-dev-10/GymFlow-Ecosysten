'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Branch Dashboard was merged into the unified Dashboard — this route now
// just forwards old links/bookmarks to the new location, preserving gymId.
function RedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    router.replace(`/workspace/dashboard?${searchParams.toString()}`);
  }, [router, searchParams]);

  return null;
}

export default function GymDashboardRedirectPage() {
  return (
    <Suspense fallback={null}>
      <RedirectInner />
    </Suspense>
  );
}
