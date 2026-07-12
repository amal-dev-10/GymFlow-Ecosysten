'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
 MapPin, 
 Building2, 
 Plus, 
 ArrowRight, 
 Phone, 
 Mail, 
 Activity, 
 Clock, 
 Users 
} from 'lucide-react';
import { gymApi, orgApi } from '../../../lib/api';
import { handleApiError } from '../../../lib/api/client';

export default function GymBranchesIndexPage() {
 const router = useRouter();
 const [branches, setBranches] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [orgName, setOrgName] = useState('Organization');
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 3000);
 };

 const loadData = async () => {
 try {
 setLoading(true);
 const orgId = localStorage.getItem('organizationId');
 if (!orgId) {
 router.push('/organizations');
 return;
 }
 
 const orgs = await orgApi.list();
 const currentOrg = orgs.find((o: any) => o.id === orgId);
 if (currentOrg) {
 setOrgName(currentOrg.name);
 }

 const list = await gymApi.list(orgId);
 setBranches(list || []);
 } catch (err) {
 console.error(err);
 showToast('Failed to load gym branches.', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, []);

 if (loading) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Loading Gym Branches...
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-white text-neutral-900 p-8 space-y-6">
 
 {/* Toast Notification */}
 {toast && (
 <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 border ${
 toast.type === 'success' 
 ? 'bg-success-light text-success border-green-200' 
 : 'bg-danger-light text-danger border-red-200'
 }`}>
 <span className="text-sm font-medium">{toast.message}</span>
 </div>
 )}

 {/* HEADER */}
 <div className="flex items-center justify-between border-b border-neutral-200/80 pb-6">
 <div>
 <div className="flex items-center gap-2 text-xs text-danger font-semibold uppercase tracking-wider mb-1">
 <Building2 className="w-3.5 h-3.5" />
 <span>{orgName}</span>
 </div>
 <h1 className="text-2xl font-bold text-neutral-900 font-display">Gym Branches</h1>
 <p className="text-sm text-neutral-600 mt-1">Manage physical locations, track active statuses, and configure local check-in parameters.</p>
 </div>
 <button
 type="button"
 onClick={() => router.push('/workspace/gyms/create')}
 className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-neutral-900 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-lg"
 >
 <Plus className="w-4 h-4" />
 Register New Branch
 </button>
 </div>

 {/* BRANCHES LIST GRID */}
 {branches.length === 0 ? (
 <div className="bg-white border border-neutral-200 border-dashed rounded-3xl p-16 text-center max-w-xl mx-auto flex flex-col items-center">
 <MapPin className="text-neutral-500 mb-4" size={40} />
 <h3 className="text-base font-bold text-neutral-900">No Branches Configured</h3>
 <p className="text-xs text-neutral-600 mt-1 max-w-xs leading-relaxed">
 This organization has no physical gym branches registered. Select"Register New Branch" to add your first branch.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {branches.map((b) => {
 const s = b.settings || {};
 const status = s.status || 'Active';
 return (
 <div key={b.id} className="bg-neutral-50/20 border border-neutral-200 hover:border-red-200 rounded-3xl p-6 shadow-xl transition-all duration-300 flex flex-col justify-between min-h-[200px] backdrop-blur-md">
 <div>
 <div className="flex justify-between items-start">
 <div className="w-10 h-10 rounded-xl bg-danger-light border border-red-200 flex items-center justify-center text-danger">
 <MapPin size={18} />
 </div>
 <span className={`px-2 py-0.5 border text-[9px] font-bold rounded-full ${
 status === 'Active' ? 'bg-success-light border-green-200 text-success' :
 status === 'Temporarily Closed' ? 'bg-danger-light border-red-200 text-danger' :
 'bg-warning-light border-amber-200 text-amber-700'
 }`}>
 {status}
 </span>
 </div>

 <h3 className="text-sm font-bold text-neutral-900 mt-4">{b.name}</h3>
 {b.code && <span className="text-[10px] text-danger font-mono mt-1 block uppercase">{b.code}</span>}
 <p className="text-xs text-neutral-600 mt-2 leading-relaxed truncate max-w-full">{b.address || 'No address specified'}</p>
 </div>

 <div className="border-t border-neutral-200/60 pt-4 mt-6 flex items-center justify-between text-[11px]">
 <div className="flex gap-3">
 <button
 onClick={() => router.push(`/workspace/gyms/edit?id=${b.id}`)}
 className="text-neutral-600 font-bold hover:text-neutral-800"
 >
 Edit Settings
 </button>
 <button
 onClick={() => router.push(`/workspace/gyms/edit?id=${b.id}&tab=media`)}
 className="text-neutral-600 font-bold hover:text-neutral-800"
 >
 Media
 </button>
 </div>
 <button
 onClick={() => {
 localStorage.setItem('activeGymName', b.name);
 showToast(`Switched active branch to '${b.name}'.`, 'success');
 }}
 className="text-danger font-bold hover:underline flex items-center gap-1"
 >
 <span>Load Branch</span>
 <ArrowRight size={12} />
 </button>
 </div>
 </div>
 );
 })}
 </div>
 )}

 </div>
 );
}
