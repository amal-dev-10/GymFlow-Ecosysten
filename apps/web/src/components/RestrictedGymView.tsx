'use client';

import React from 'react';
import { MapPin, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAccessControl } from '../context/access-control';

interface RestrictedGymViewProps {
 currentGymName: string;
 onSwitchToAllowed: (gymName: string) => void;
 gymsList: { id: string; name: string }[];
}

export default function RestrictedGymView({ currentGymName, onSwitchToAllowed, gymsList }: RestrictedGymViewProps) {
 const { gymAccess } = useAccessControl();

 const allowedGyms = gymsList.filter(g => gymAccess === 'all' || gymAccess.includes(g.id));

 return (
 <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] text-center p-6 animate-fade-in relative">
 <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
 </div>

 <div className="relative z-10 space-y-6 max-w-md w-full">
 {/* Branch Limit Icon Container */}
 <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 mx-auto shadow-lg shadow-indigo-500/5 hover:scale-[1.05] transition-transform">
 <MapPin size={32} className="animate-bounce" />
 </div>

 <div className="space-y-2">
 <h2 className="text-xl font-black text-neutral-900 tracking-tight">Restricted Branch Access</h2>
 <p className="text-xs text-neutral-600 leading-relaxed">
 Your staff account is restricted. You are not authorized to view the data or configurations for <b className="text-neutral-900">'{currentGymName}'</b>.
 </p>
 </div>

 {/* Allowed Branches List */}
 <div className="bg-neutral-50/60 border border-neutral-100 rounded-2xl p-4 text-left space-y-3">
 <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Your Authorized Gym Locations:</span>
 {allowedGyms.length === 0 ? (
 <span className="text-xs text-neutral-500 italic block text-center">No assigned gym branches. Contact manager.</span>
 ) : (
 <div className="space-y-2">
 {allowedGyms.map((g) => (
 <button
 key={g.id}
 onClick={() => onSwitchToAllowed(g.name)}
 className="w-full p-2.5 bg-white hover:bg-neutral-50 border border-neutral-100 hover:border-neutral-200 rounded-xl flex items-center justify-between transition-colors text-left"
 >
 <div className="flex items-center gap-2 text-xs text-neutral-800 font-bold">
 <MapPin size={11} className="text-indigo-400" />
 <span>{g.name}</span>
 </div>
 <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">Switch Branch</span>
 </button>
 ))}
 </div>
 )}
 </div>

 <button
 onClick={() => {
 if (allowedGyms.length > 0) {
 onSwitchToAllowed(allowedGyms[0].name);
 } else {
 onSwitchToAllowed('All Gyms');
 }
 }}
 className="w-full py-2.5 rounded-xl border border-neutral-100 hover:bg-neutral-50 text-xs font-bold text-neutral-700 flex items-center justify-center gap-1.5 transition-colors"
 >
 <ArrowLeft size={13} />
 <span>Switch to Primary Branch</span>
 </button>
 </div>
 </div>
 );
}
