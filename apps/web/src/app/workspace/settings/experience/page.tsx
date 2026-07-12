'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Workspace Experience was moved into the Organization screen as a tab —
// this route now just forwards old links/bookmarks to the new location.
export default function WorkspaceExperienceRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/workspace/organization/details?tab=workspace');
  }, [router]);

  return null;
}
