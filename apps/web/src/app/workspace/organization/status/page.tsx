'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectToStatusTab() {
 const router = useRouter();

 useEffect(() => {
 router.replace('/workspace/organization/details?tab=status');
 }, [router]);

 return (
 <div className="p-8 text-center text-xs text-neutral-500">
 Redirecting to Organization Status Control tab...
 </div>
 );
}
