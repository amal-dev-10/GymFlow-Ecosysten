'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OrganizationSettingsRedirectPage() {
 const router = useRouter();

 useEffect(() => {
 router.replace('/workspace/organization/details?tab=settings');
 }, [router]);

 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Redirecting to Organization settings...
 </div>
 );
}
