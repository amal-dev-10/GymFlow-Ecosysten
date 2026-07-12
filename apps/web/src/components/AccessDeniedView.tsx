'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, HelpCircle } from 'lucide-react';

interface AccessDeniedViewProps {
 requiredPermission?: string;
}

export default function AccessDeniedView({ requiredPermission }: AccessDeniedViewProps) {
 const router = useRouter();

 return (
 <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] text-center p-6 animate-fade-in relative">
 <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
 </div>

 <div className="relative z-10 space-y-6 max-w-md">
 {/* Animated Icon Container */}
 <div className="w-16 h-16 rounded-3xl bg-danger-light border border-red-200 flex items-center justify-center text-danger mx-auto shadow-lg hover:scale-[1.05] transition-transform">
 <ShieldAlert size={32} className="animate-pulse" />
 </div>

 <div className="space-y-2">
 <h2 className="text-xl font-black text-neutral-900 tracking-tight">Access Denied</h2>
 <p className="text-xs text-neutral-600 leading-relaxed">
 You do not have the necessary permissions to access this page. Please contact your system administrator to adjust your role assignments.
 </p>
 {requiredPermission && (
 <span className="inline-block mt-2 text-[10px] font-bold text-danger bg-danger-light border border-red-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
 Requires: {requiredPermission}
 </span>
 )}
 </div>

 <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
 <button
 onClick={() => router.push('/workspace')}
 className="px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-100 hover:border-neutral-200 text-xs font-bold text-neutral-700 hover:text-neutral-900 flex items-center justify-center gap-1.5 transition-all"
 >
 <ArrowLeft size={13} />
 <span>Return to Dashboard</span>
 </button>
 <button
 onClick={() => alert('Contacting system administrator... Request logged.')}
 className="px-4 py-2.5 rounded-xl bg-primary hover:scale-[1.02] active:scale-[0.98] text-xs font-black text-white flex items-center justify-center gap-1.5 transition-all shadow-lg"
 >
 <HelpCircle size={13} />
 <span>Contact Administrator</span>
 </button>
 </div>
 </div>
 </div>
 );
}
