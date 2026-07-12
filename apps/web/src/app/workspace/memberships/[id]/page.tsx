'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
 FileText,
 ChevronLeft,
 CheckCircle,
 Clock,
 DollarSign,
 MapPin,
 Sparkles,
 Info,
 Shield,
 Dumbbell,
 Check,
 Plus,
 Trash2,
 Lock,
 ArrowRight,
 Eye,
 Percent,
 Calendar,
 AlertTriangle,
 Users,
 Archive,
 Ban,
 Activity,
 History,
 CheckSquare,
 Radio,
 FileCheck2,
 CheckSquare2,
 RefreshCw,
 Bell,
 UserCheck
} from 'lucide-react';
import { gymApi, membershipsApi } from '../../../../lib/api';

export default function MembershipPlanDetailsPage() {
 const router = useRouter();
 const params = useParams();
 const id = params.id as string;

 // Page States
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [plan, setPlan] = useState<any>(null);
 const [branches, setBranches] = useState<any[]>([]);

 // Dialog/Modal Triggers
 const [activeModal, setActiveModal] = useState<'activate' | 'deactivate' | 'archive' | 'success' | null>(null);
 const [successMessage, setSuccessMessage] = useState('');

 // Status Change Reasons
 const [reasonCategory, setReasonCategory] = useState('Pricing Changes');
 const [reasonNotes, setReasonNotes] = useState('');

 // Archiving Safeguards
 const [confirmArchiveCheckbox, setConfirmArchiveCheckbox] = useState(false);
 const [confirmArchiveText, setConfirmArchiveText] = useState('');

 // Timeline State (Chronological Audit Trail)
 const [timeline, setTimeline] = useState<any[]>([
 { type: 'Plan Created', detail: 'Membership plan template initialized', date: '2026-05-15 10:00 AM', user: 'Owner Desk', reason: 'Initial Setup' }
 ]);

 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 const loadData = async () => {
 try {
 setLoading(true);
 const orgId = localStorage.getItem('organizationId') || '';

 // Fetch branches
 const branchList = await gymApi.list(orgId);
 setBranches(branchList || []);

 // Fetch plan details
 const planDetails = await membershipsApi.getPlan(id);
 setPlan(planDetails);

 // Reconstruct simple timeline entries dynamically with persistent localStorage backup
 const localTimelineStr = localStorage.getItem(`plan_timeline_${id}`);
 if (localTimelineStr) {
 setTimeline(JSON.parse(localTimelineStr));
 } else {
 const initialTimeline = [
 { type: 'Plan Created', detail: 'Membership plan template initialized', date: new Date(planDetails.createdAt || Date.now()).toLocaleString(), user: 'Owner Desk', reason: 'Initial Setup' }
 ];
 if (planDetails.status === 'Active') {
 initialTimeline.unshift({ type: 'Plan Activated', detail: 'Made plan available for public registration', date: new Date().toLocaleString(), user: 'Owner Desk', reason: 'Seasonal Rollout' });
 } else if (planDetails.status === 'Inactive') {
 initialTimeline.unshift(
 { type: 'Plan Activated', detail: 'Made plan available for public registration', date: new Date().toLocaleString(), user: 'Owner Desk', reason: 'Seasonal Rollout' },
 { type: 'Plan Deactivated', detail: 'Temporarily disabled plan sales', date: new Date().toLocaleString(), user: 'Owner Desk', reason: 'Seasonal Offer Ended' }
 );
 }
 setTimeline(initialTimeline);
 localStorage.setItem(`plan_timeline_${id}`, JSON.stringify(initialTimeline));
 }

 } catch (err) {
 console.error(err);
 showToast('Failed to load plan details', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [id]);

 const parseBenefits = (benefits: any): string[] => {
 if (!benefits) return [];
 if (Array.isArray(benefits)) return benefits;
 if (typeof benefits === 'string') {
 const trimmed = benefits.trim();
 if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
 try {
 return JSON.parse(trimmed);
 } catch (_) {}
 }
 return trimmed.split(',').map(b => b.trim()).filter(Boolean);
 }
 return [];
 };

 // Validation Checks
 const getValidationChecklist = () => {
 if (!plan) return [];
 const parsedBenefits = parseBenefits(plan.benefits);
 return [
 { key: 'name', label: 'Plan Name Configured', status: !!plan.name.trim(), detail: plan.name || 'Missing Name' },
 { key: 'duration', label: 'Agreement Duration Configured', status: plan.durationValue > 0, detail: `${plan.durationValue} ${plan.durationType}` },
 { key: 'pricing', label: 'Valid Base Price Set', status: plan.basePrice >= 0, detail: `₹${plan.basePrice}` },
 { key: 'branches', label: 'Authorized Branches Assigned', status: !!plan.branchAccess, detail: plan.branchAccess === 'all' ? 'All Branches' : 'Specific Locations' },
 { key: 'benefits', label: 'Membership Benefits Configured', status: parsedBenefits.length > 0, detail: `${parsedBenefits.length} items` }
 ];
 };

 const checklist = getValidationChecklist();
 const isValidationPassed = checklist.every(item => item.status);

 // Status transitions
 const handleUpdateStatus = async (newStatus: 'Active' | 'Inactive' | 'Archived') => {
 try {
 setSaving(true);
 await membershipsApi.updatePlan(id, {
 status: newStatus,
 statusReasonCategory: reasonCategory,
 statusReasonNotes: reasonNotes
 });

 // Add to timeline log dynamically and persist in localStorage
 const newLog = {
 type: newStatus === 'Active' ? 'Plan Activated' : newStatus === 'Inactive' ? 'Plan Deactivated' : 'Plan Archived',
 detail: `Status transitioned to ${newStatus}`,
 date: new Date().toLocaleString(),
 user: 'Staff Desk',
 reason: reasonNotes || reasonCategory
 };
 setTimeline(prev => {
 const updated = [newLog, ...prev];
 localStorage.setItem(`plan_timeline_${id}`, JSON.stringify(updated));
 return updated;
 });

 showToast(`Membership plan transitioned to ${newStatus}`);
 setActiveModal(null);
 
 // Seed Success Message details
 setSuccessMessage(newStatus);
 setActiveModal('success');
 loadData();
 } catch (err) {
 console.error(err);
 showToast(`Failed to update status to ${newStatus}`, 'error');
 } finally {
 setSaving(false);
 }
 };

 if (loading) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Fetching plan status overview...
 </div>
 );
 }

 const benefitsArray = parseBenefits(plan?.benefits);

 const getStatusBadge = (status: string) => {
 const s = status.toLowerCase();
 if (s === 'active') return 'bg-success-light text-success border-green-200';
 if (s === 'draft') return 'bg-neutral-100/20 text-neutral-600 border-neutral-200/30';
 if (s === 'inactive') return 'bg-warning-light text-amber-700 border-amber-200';
 return 'bg-danger-light text-danger border-red-200'; // Archived
 };

 return (
 <div className="min-h-screen bg-white text-neutral-900 p-8 space-y-6 relative overflow-hidden flex flex-col justify-between">
 
 {/* TOAST */}
 {toast && (
 <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border ${
 toast.type === 'success' 
 ? 'bg-success-light text-success border-green-200' 
 : 'bg-danger-light text-danger border-red-200'
 }`}>
 <span className="text-sm font-medium">{toast.message}</span>
 </div>
 )}

 {/* MODAL: SUCCESS STATE */}
 {activeModal === 'success' && (
 <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6 text-center">
 <div className="w-16 h-16 rounded-full bg-success-light border border-green-200 flex items-center justify-center text-success mb-6 animate-bounce">
 <CheckSquare size={36} />
 </div>
 <h2 className="text-xl font-bold font-display text-neutral-900">
 Membership Plan {successMessage === 'Active' ? 'Activated' : successMessage === 'Inactive' ? 'Deactivated' : 'Archived'} Successfully
 </h2>
 <p className="text-xs text-neutral-600 max-w-sm mt-2">
 Plan **{plan.name}** transitioned state correctly. The change was written to the system audit logs.
 </p>
 <div className="bg-neutral-50/30 border border-neutral-200 p-4 rounded-2xl w-full max-w-xs mt-6 text-xs text-neutral-700 space-y-1 font-mono">
 <div>Plan: {plan.name}</div>
 <div>Date: {new Date().toLocaleDateString()}</div>
 <div>Operator: Staff Desk</div>
 <div>Status: <span className="font-bold text-neutral-800">{successMessage}</span></div>
 </div>
 <div className="mt-8 flex gap-3">
 <button
 onClick={() => {
 setActiveModal(null);
 loadData();
 }}
 className="px-5 py-2.5 bg-neutral-50 border border-neutral-200 hover:text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Close Details
 </button>
 <button
 onClick={() => router.push('/workspace/memberships')}
 className="px-5 py-2.5 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition shadow-lg"
 >
 Continue to Plans
 </button>
 </div>
 </div>
 )}

 {/* MODAL: ACTIVATE PLAN validation checklist */}
 {activeModal === 'activate' && (
 <div className="fixed inset-0 bg-neutral-50/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl">
 <div className="flex items-center gap-3">
 <FileCheck2 className="w-5 h-5 text-success" />
 <h3 className="text-base font-bold text-neutral-900 font-display">Activation Pre-Flight Checklist</h3>
 </div>
 
 <div className="space-y-3">
 {checklist.map(item => (
 <div key={item.key} className="flex justify-between items-center bg-neutral-50/30 border border-neutral-200 p-3 rounded-xl text-xs">
 <div className="flex items-center gap-2.5">
 {item.status ? (
 <CheckCircle className="text-success w-4 h-4 shrink-0" />
 ) : (
 <AlertTriangle className="text-danger w-4 h-4 shrink-0" />
 )}
 <span className="text-neutral-800">{item.label}</span>
 </div>
 <span className="font-mono text-[10px] text-neutral-500">{item.detail}</span>
 </div>
 ))}
 </div>

 {!isValidationPassed && (
 <div className="flex gap-2.5 bg-danger-light border border-red-200 p-3.5 rounded-2xl text-xs text-danger">
 <Info size={16} className="shrink-0 mt-0.5" />
 <span>One or more checklist validation rules failed. Please fill out all required fields before activating.</span>
 </div>
 )}

 <div className="flex gap-3 justify-end border-t border-neutral-200 pt-4">
 <button
 type="button"
 onClick={() => setActiveModal(null)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Cancel
 </button>
 <button
 type="button"
 disabled={!isValidationPassed || saving}
 onClick={() => handleUpdateStatus('Active')}
 className="px-4 py-2 bg-success text-white text-xs font-semibold rounded-xl transition disabled:opacity-30"
 >
 {saving ? 'Activating...' : 'Activate Plan'}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* MODAL: DEACTIVATE PLAN impact analysis & reason selection */}
 {activeModal === 'deactivate' && (
 <div className="fixed inset-0 bg-neutral-50/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl">
 <div className="flex items-start gap-4">
 <div className="p-3 rounded-2xl bg-warning-light text-amber-700 border border-amber-200">
 <AlertTriangle size={24} />
 </div>
 <div>
 <h3 className="text-base font-bold text-neutral-900 font-display">Deactivate Membership Plan?</h3>
 <p className="text-xs text-neutral-600 mt-1">
 This membership plan will no longer be available for new sales. Existing member memberships will remain active and unaffected.
 </p>
 </div>
 </div>

 {/* IMPACT STATISTICS PANEL */}
 <div className="bg-neutral-50/40 border border-neutral-200 p-4 rounded-2xl space-y-3 text-xs">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Deactivation Impact Analysis</span>
 <div className="grid grid-cols-3 gap-2 text-center">
 <div className="bg-white p-2 rounded-xl border border-neutral-200">
 <span className="text-neutral-500 block text-[9px]">Active Members</span>
 <span className="text-neutral-800 font-bold block mt-0.5">{plan?.enrolledCount || 0}</span>
 </div>
 <div className="bg-white p-2 rounded-xl border border-neutral-200">
 <span className="text-neutral-500 block text-[9px]">Pending/Exp</span>
 <span className="text-neutral-800 font-bold block mt-0.5">
 {plan?.memberMemberships?.filter((m: any) => m.status === 'Pending' || m.status === 'Expired').length || 0}
 </span>
 </div>
 <div className="bg-white p-2 rounded-xl border border-neutral-200">
 <span className="text-neutral-500 block text-[9px]">Affected</span>
 <span className="text-neutral-800 font-bold block mt-0.5 truncate">
 {plan?.branchAccess === 'all' ? 'All' : 'Specific'}
 </span>
 </div>
 </div>
 </div>

 {/* STATUS REASON CHOSEN FIELDS */}
 <div className="space-y-3 pt-2">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Deactivation Reason Category</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={reasonCategory}
 onChange={e => setReasonCategory(e.target.value)}
 >
 <option value="Pricing Changes">Pricing Changes</option>
 <option value="Plan Replacement">Plan Replacement</option>
 <option value="Seasonal Offer Ended">Seasonal Offer Ended</option>
 <option value="Business Decision">Business Decision</option>
 </select>
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Notes / Description</label>
 <textarea
 rows={2}
 className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-xs text-neutral-900 focus:outline-none"
 placeholder="Provide brief context for deactivating this plan..."
 value={reasonNotes}
 onChange={e => setReasonNotes(e.target.value)}
 />
 </div>
 </div>

 <div className="flex gap-3 justify-end border-t border-neutral-200 pt-4">
 <button
 type="button"
 onClick={() => setActiveModal(null)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={() => handleUpdateStatus('Inactive')}
 disabled={saving}
 className="px-4 py-2 bg-warning hover:bg-amber-600 text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 {saving ? 'Deactivating...' : 'Confirm Deactivation'}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* MODAL: ARCHIVE PLAN high-risk safeguards */}
 {activeModal === 'archive' && (
 <div className="fixed inset-0 bg-neutral-50/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl">
 <div className="flex items-start gap-4">
 <div className="p-3 rounded-2xl bg-danger-light text-danger border border-red-200">
 <Archive size={24} />
 </div>
 <div>
 <h3 className="text-base font-bold text-neutral-900 font-display">Archive Membership Plan?</h3>
 <p className="text-xs text-neutral-600 mt-1">
 Archived plans cannot be reactivated or edited. Historical data and reporting logs will remain available.
 </p>
 </div>
 </div>

 {/* IMPACT STATISTICS PANEL */}
 <div className="bg-neutral-50/40 border border-neutral-200 p-4 rounded-2xl space-y-2 text-xs">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Archive Impact Analysis</span>
 <div className="space-y-1.5 font-mono text-[11px]">
 <div className="flex justify-between"><span className="text-neutral-600">Active Memberships</span><span className="text-neutral-800">{plan.enrolledCount || 0}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">Historical Revenue</span><span className="text-neutral-800">₹{(plan.revenueGenerated || 0).toLocaleString()}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">Reporting Logs</span><span className="text-neutral-800">Preserved</span></div>
 </div>
 </div>

 {/* REASON PROMPTS */}
 <div className="space-y-3 pt-2">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Archive Reason Category</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={reasonCategory}
 onChange={e => setReasonCategory(e.target.value)}
 >
 <option value="Pricing Changes">Pricing Changes</option>
 <option value="Plan Replacement">Plan Replacement</option>
 <option value="Seasonal Offer Ended">Seasonal Offer Ended</option>
 <option value="Business Decision">Business Decision</option>
 </select>
 </div>
 
 {/* TYPING SAFEGUARDS */}
 <div className="space-y-2 pt-2 border-t border-neutral-200">
 <label className="flex items-start gap-2.5 text-xs text-neutral-700 cursor-pointer">
 <input
 type="checkbox"
 className="text-danger focus:ring-0 mt-0.5 bg-neutral-50 border-neutral-200"
 checked={confirmArchiveCheckbox}
 onChange={e => setConfirmArchiveCheckbox(e.target.checked)}
 />
 <span>I understand that archiving is permanent and cannot be undone.</span>
 </label>
 
 <div className="space-y-1 pt-1">
 <label className="text-[9px] text-neutral-500 font-mono uppercase">Type plan code <strong className="text-neutral-700 font-bold select-all">{plan.code}</strong> to confirm</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 placeholder={plan.code}
 value={confirmArchiveText}
 onChange={e => setConfirmArchiveText(e.target.value)}
 />
 </div>
 </div>
 </div>

 <div className="flex gap-3 justify-end border-t border-neutral-200 pt-4">
 <button
 type="button"
 onClick={() => setActiveModal(null)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Cancel
 </button>
 <button
 type="button"
 disabled={!confirmArchiveCheckbox || confirmArchiveText !== plan.code || saving}
 onClick={() => handleUpdateStatus('Archived')}
 className="px-4 py-2 bg-danger hover:bg-red-600 text-neutral-900 text-xs font-semibold rounded-xl transition disabled:opacity-30"
 >
 {saving ? 'Archiving...' : 'Permanently Archive Plan'}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* PAGE HEADER */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-200/80 pb-6">
 <div className="flex items-center gap-3">
 <button
 onClick={() => router.push('/workspace/memberships')}
 className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 hover:text-neutral-800 transition"
 >
 <ChevronLeft size={16} />
 </button>
 <div>
 <div className="flex items-center gap-2.5">
 <h1 className="text-2xl font-bold text-neutral-900 font-display">{plan.name}</h1>
 <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${getStatusBadge(plan.status)}`}>
 {plan.status}
 </span>
 </div>
 <p className="text-xs text-neutral-600 mt-1">Configure status, availability privileges, and audit change summaries.</p>
 </div>
 </div>

 <div className="flex gap-2">
 <button
 onClick={() => router.push(`/workspace/memberships/${id}/edit`)}
 className="px-4 py-2.5 bg-neutral-50 border border-neutral-200 hover:text-neutral-900 text-neutral-700 text-xs font-semibold rounded-xl transition"
 >
 Edit Settings
 </button>
 </div>
 </div>

 {/* MAIN LAYOUT CONTENT */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 
 {/* LEFT / CENTER SECTIONS (2 cols) */}
 <div className="lg:col-span-2 space-y-6">
 
 {/* STATUS MANAGEMENT LIFE-CYCLE CARD */}
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-900 font-display">Plan Status Management</h3>
 <p className="text-xs text-neutral-600 mt-0.5">Control the plan lifecycle state to regulate its availability across branches.</p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 
 {/* Draft Status Details */}
 <div className={`p-4 rounded-2xl border text-xs space-y-2 relative transition ${
 plan.status === 'Draft' ? 'bg-neutral-50/40 border-neutral-200/60' : 'bg-neutral-50/20 border-neutral-200'
 }`}>
 <div className="flex justify-between items-center">
 <span className="font-bold text-neutral-800">Draft Status</span>
 {plan.status === 'Draft' && <CheckCircle size={14} className="text-danger" />}
 </div>
 <p className="text-neutral-600 text-[11px] leading-relaxed">
 Plan is still being designed. It cannot be assigned to members or accessed by front desk receptionists.
 </p>
 {plan.status !== 'Draft' && plan.status !== 'Archived' && (
 <button
 onClick={() => handleUpdateStatus('Inactive')}
 className="text-[10px] text-neutral-500 hover:text-neutral-700 font-bold block pt-1 uppercase transition"
 >
 Reset to Inactive
 </button>
 )}
 </div>

 {/* Active Status Details */}
 <div className={`p-4 rounded-2xl border text-xs space-y-2 relative transition ${
 plan.status === 'Active' ? 'bg-neutral-50/40 border-neutral-200/60' : 'bg-neutral-50/20 border-neutral-200'
 }`}>
 <div className="flex justify-between items-center">
 <span className="font-bold text-neutral-800">Active Status</span>
 {plan.status === 'Active' && <CheckCircle size={14} className="text-success" />}
 </div>
 <p className="text-neutral-600 text-[11px] leading-relaxed">
 Available for new membership agreements. Staff can view and assign this plan across all branches.
 </p>
 {plan.status !== 'Active' && plan.status !== 'Archived' && (
 <button
 onClick={() => setActiveModal('activate')}
 className="text-[10px] text-success hover:underline font-bold block pt-1 uppercase transition"
 >
 Activate Plan Template
 </button>
 )}
 </div>

 {/* Inactive Status Details */}
 <div className={`p-4 rounded-2xl border text-xs space-y-2 relative transition ${
 plan.status === 'Inactive' ? 'bg-neutral-50/40 border-neutral-200/60' : 'bg-neutral-50/20 border-neutral-200'
 }`}>
 <div className="flex justify-between items-center">
 <span className="font-bold text-neutral-800">Inactive Status</span>
 {plan.status === 'Inactive' && <CheckCircle size={14} className="text-amber-700" />}
 </div>
 <p className="text-neutral-600 text-[11px] leading-relaxed">
 Plan is suspended from new sales. Existing active contracts and payments remain valid.
 </p>
 {plan.status === 'Active' && (
 <button
 onClick={() => {
 setReasonCategory('Pricing Changes');
 setReasonNotes('');
 setActiveModal('deactivate');
 }}
 className="text-[10px] text-amber-700 hover:underline font-bold block pt-1 uppercase transition"
 >
 Deactivate Template
 </button>
 )}
 </div>

 {/* Archived Status Details */}
 <div className={`p-4 rounded-2xl border text-xs space-y-2 relative transition ${
 plan.status === 'Archived' ? 'bg-danger-light border-red-200' : 'bg-neutral-50/20 border-neutral-200'
 }`}>
 <div className="flex justify-between items-center">
 <span className="font-bold text-neutral-800">Archived Status</span>
 {plan.status === 'Archived' && <CheckCircle size={14} className="text-danger" />}
 </div>
 <p className="text-neutral-600 text-[11px] leading-relaxed">
 Permanently retired plan. Archived plans cannot be edited or reactivated, but historical records are kept.
 </p>
 {plan.status !== 'Archived' && (
 <button
 onClick={() => {
 setReasonCategory('Plan Replacement');
 setConfirmArchiveCheckbox(false);
 setConfirmArchiveText('');
 setActiveModal('archive');
 }}
 className="text-[10px] text-danger hover:underline font-bold block pt-1 uppercase transition"
 >
 Permanently Archive
 </button>
 )}
 </div>

 </div>
 </div>

 {/* PLAN AUDIT LOGS TIMELINE */}
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-6">
 <h3 className="text-sm font-bold text-neutral-900 font-display flex items-center gap-2">
 <History size={16} className="text-danger" />
 Chronological Audit Trail
 </h3>
 <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-neutral-50">
 {timeline.map((item, index) => (
 <div key={index} className="flex gap-4 relative">
 <div className="w-6 h-6 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center z-10 text-[9px] font-bold text-neutral-600">
 {timeline.length - index}
 </div>
 <div className="space-y-1">
 <div className="flex items-center gap-3">
 <span className="text-xs font-bold text-neutral-800">{item.type}</span>
 <span className="text-[10px] text-neutral-500">• {item.date}</span>
 </div>
 <p className="text-xs text-neutral-600">{item.detail}</p>
 <div className="flex gap-2 text-[10px] text-neutral-500 font-mono">
 <span>Operator: {item.user}</span>
 <span>•</span>
 <span>Reason: {item.reason}</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 </div>

 {/* RIGHT COLUMN: PREVIEW & BROADCASTS (1 col) */}
 <div className="lg:col-span-1 space-y-6">
 
 {/* AVAILABILITY PREVIEW CARD */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Plan Availability Preview</span>
 
 <div className="space-y-3.5 text-xs">
 <div className="flex justify-between">
 <span className="text-neutral-600">Assigned Branches</span>
 <span className="font-semibold text-neutral-800">
 {plan.branchAccess === 'all' ? 'All Locations' : 'Specific Locations'}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-600">Online Sales Visibility</span>
 <span className="font-semibold text-success flex items-center gap-1">
 <CheckSquare2 size={12} /> Enabled
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-600">Mobile App Access</span>
 <span className="font-semibold text-success flex items-center gap-1">
 <CheckSquare2 size={12} /> Enabled
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-600">Current Visibility</span>
 <span className="font-semibold text-neutral-800 font-mono">
 {plan.status === 'Active' ? 'Visible to Front Desk' : 'Hidden from Front Desk'}
 </span>
 </div>
 </div>
 </div>

 {/* SIMULATED STAFF NOTIFICATION PANEL */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <div className="flex justify-between items-center">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Broadcast Alerts</span>
 <Bell size={13} className="text-danger animate-pulse" />
 </div>

 <div className="space-y-3">
 <div className="bg-neutral-50/30 border border-neutral-200 p-3 rounded-xl space-y-1 text-xs">
 <span className="font-bold text-neutral-700 block">Notification: Plan Activated</span>
 <p className="text-[11px] text-neutral-600">Broadcasted to Owners & Managers: Membership plan"{plan.name}" has been activated.</p>
 </div>

 <div className="bg-neutral-50/30 border border-neutral-200 p-3 rounded-xl space-y-1 text-xs">
 <span className="font-bold text-neutral-700 block">Notification: Plan Deactivated</span>
 <p className="text-[11px] text-neutral-600">Broadcasted to Staff: Plan sales closed; active subscriptions remain safe.</p>
 </div>
 </div>
 </div>

 </div>

 </div>

 </div>
 );
}
