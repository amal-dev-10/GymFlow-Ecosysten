'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, MapPin, ArrowRight, Settings, AlertTriangle } from 'lucide-react';
import { gymApi, orgApi } from '../../../lib/api';

export default function WorkspaceSettingsWrapperPage() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const [loading, setLoading] = useState(true);
 const [branches, setBranches] = useState<any[]>([]);
 const [selectedBranchId, setSelectedBranchId] = useState<string>('');

 useEffect(() => {
 const loadGyms = async () => {
 try {
 const orgId = localStorage.getItem('organizationId');
 if (!orgId) {
 router.push('/organizations');
 return;
 }

 const gymList = await gymApi.list(orgId);
 setBranches(gymList || []);

 // Detect current gym from URL parameter or localStorage
 const gymIdParam = searchParams.get('gymId');
 const activeGymName = localStorage.getItem('activeGymName') || 'All Gyms';

 let detectedId = '';
 if (gymIdParam && gymIdParam !== 'all') {
 detectedId = gymIdParam;
 } else if (activeGymName !== 'All Gyms') {
 const matched = gymList.find((g: any) => g.name === activeGymName);
 if (matched) {
 detectedId = matched.id;
 }
 }

 setSelectedBranchId(detectedId);
 } catch (err) {
 console.error('Failed to load branches', err);
 } finally {
 setLoading(false);
 }
 };

 loadGyms();
 }, [searchParams, router]);

 useEffect(() => {
 if (selectedBranchId) {
 router.replace(`/workspace/gyms/edit?id=${selectedBranchId}`);
 }
 }, [selectedBranchId, router]);

 if (loading) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Loading settings...
 </div>
 );
 }

 // If a specific branch is selected, render redirecting screen
 if (selectedBranchId) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Redirecting to branch settings...
 </div>
 );
 }

 // If"All Gyms" is active, show the prompt to select a branch via the switcher context
 return (
 <div className="min-h-screen bg-white text-neutral-900 p-8 flex flex-col justify-center items-center">
 <div className="bg-neutral-50/20 border border-neutral-200/60 rounded-3xl p-10 max-w-lg text-center backdrop-blur-md shadow-2xl space-y-6">
 <div className="mx-auto w-16 h-16 rounded-2xl bg-primary-light border border-red-200 flex items-center justify-center text-danger shadow-lg">
 <MapPin size={28} />
 </div>
 <div className="space-y-2">
 <h2 className="text-xl font-bold text-neutral-900 font-display">Select a Branch</h2>
 <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
 Branch-specific settings are configured per branch. Please select a specific gym branch from the branch switcher in the sidebar to configure its details.
 </p>
 </div>
 <div className="border-t border-neutral-200/60 pt-6 text-[10px] text-neutral-500 font-mono">
 Currently viewing organization-wide context
 </div>
 </div>
 </div>
 );
}
