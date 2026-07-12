'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WorkspaceRedirect() {
 const router = useRouter();

 useEffect(() => {
 if (typeof window !== 'undefined') {
 const orgId = localStorage.getItem('organizationId') || '';
 const params = new URLSearchParams(window.location.search);
 if (orgId && !params.has('orgId')) {
 params.set('orgId', orgId);
 }
 router.replace(`/workspace/dashboard?${params.toString()}`);
 }
 }, [router]);

 return (
 <div className="min-h-screen bg-background flex items-center justify-center">
 <div className="animate-pulse text-xs text-neutral-500 font-mono">Redirecting to your dashboard...</div>
 </div>
 );
}
