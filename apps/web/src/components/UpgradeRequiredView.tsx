'use client';

import React from 'react';
import { Sparkles, Check, ArrowRight } from 'lucide-react';

interface UpgradeRequiredViewProps {
 requiredPlan?: string;
}

export default function UpgradeRequiredView({ requiredPlan = 'Pro Plan' }: UpgradeRequiredViewProps) {
 return (
 <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] text-center p-6 animate-fade-in relative">
 <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
 </div>

 <div className="relative z-10 space-y-6 max-w-md w-full">
 {/* Sparkles Icon Container */}
 <div className="w-16 h-16 rounded-3xl bg-primary-light border border-primary/20 flex items-center justify-center text-primary mx-auto shadow-lg hover:scale-[1.05] transition-transform">
 <Sparkles size={32} className="animate-spin-slow" />
 </div>

 <div className="space-y-2">
 <h2 className="text-xl font-black text-neutral-900 tracking-tight">Feature Locked</h2>
 <p className="text-xs text-neutral-600 leading-relaxed">
 This module requires a subscription upgrade. Unlock advanced financial analytics, multiple branch locations, and staff permissions by upgrading your plan.
 </p>
 <span className="inline-block mt-2 text-[10px] font-bold text-primary bg-primary-light border border-primary/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
 Required Tier: {requiredPlan}
 </span>
 </div>

 {/* Plan Benefits Checklist */}
 <div className="bg-neutral-50/60 border border-neutral-100 rounded-2xl p-4 text-left space-y-3">
 <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Included in {requiredPlan}:</span>
 {[
 'Unlimited Gym Branch Locations',
 'Full Billing Ledger & Invoice Management',
 'Granular Staff Roles & Permission Guards',
 'Advanced AI-driven Member Attendance Analysis'
 ].map((benefit, i) => (
 <div key={i} className="flex items-start gap-2.5 text-xs text-neutral-700">
 <div className="w-4 h-4 rounded bg-primary-light border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
 <Check size={10} />
 </div>
 <span>{benefit}</span>
 </div>
 ))}
 </div>

 <button
 onClick={() => alert('Redirecting to Stripe Billing Portal/Upgrade Checkout...')}
 className="w-full py-3 rounded-xl bg-primary hover:scale-[1.01] active:scale-[0.99] text-xs font-black text-white flex items-center justify-center gap-1.5 transition-all shadow-lg"
 >
 <span>Upgrade to {requiredPlan}</span>
 <ArrowRight size={13} />
 </button>
 </div>
 </div>
 );
}
