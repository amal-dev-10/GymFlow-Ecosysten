'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, ArrowLeft, Sparkles, TrendingDown } from 'lucide-react';

export default function ExpensesComingSoon() {
 const router = useRouter();

 return (
 <div className="min-h-screen bg-white text-neutral-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
 {/* Background radial glowing gradients */}

 <div className="max-w-md w-full text-center space-y-8 relative z-10 animate-fade-in">
 {/* Glow Icon container */}
 <div className="relative w-24 h-24 mx-auto flex items-center justify-center bg-neutral-50/40 border border-neutral-200/80 rounded-3xl shadow-2xl">
 <div className="absolute inset-0 bg-primary-light rounded-3xl blur-md opacity-75 animate-pulse" />
 <DollarSign className="w-12 h-12 text-amber-700 relative z-10 animate-bounce" />
 </div>

 {/* Text details */}
 <div className="space-y-3">
 <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-warning-light border border-amber-200 text-amber-700 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full">
 <Sparkles className="w-3.5 h-3.5" />
 <span>Under Construction</span>
 </div>
 <h1 className="text-3xl font-black text-neutral-900 font-display tracking-tight">
 Expenses Tracking
 </h1>
 <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
 We are designing a robust expense log system, tax calculator tools, and operating cost summaries to help maintain accurate financial audits.
 </p>
 </div>

 {/* Feature projection lists */}
 <div className="bg-white border border-neutral-200 p-5 rounded-3xl space-y-3 font-mono text-[11px] text-neutral-700 text-left">
 <div className="flex items-center gap-2.5">
 <span className="w-1.5 h-1.5 rounded-full bg-warning" />
 <span>Operating Cost & Rent Ledger Books</span>
 </div>
 <div className="flex items-center gap-2.5">
 <span className="w-1.5 h-1.5 rounded-full bg-warning" />
 <span>Salary & Staff Compensation Audit System</span>
 </div>
 <div className="flex items-center gap-2.5">
 <span className="w-1.5 h-1.5 rounded-full bg-warning" />
 <span>Tax Bracket Analysis & CSV Exporters</span>
 </div>
 </div>

 {/* Action button */}
 <div className="flex justify-center gap-3">
 <button
 onClick={() => router.push('/workspace')}
 className="px-5 py-2.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 hover:text-neutral-900 text-neutral-700 text-xs font-semibold rounded-xl transition flex items-center gap-2"
 >
 <ArrowLeft className="w-4 h-4" />
 <span>Back to Dashboard</span>
 </button>
 </div>
 </div>
 </div>
 );
}
