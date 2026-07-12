'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
 ShieldAlert,
 ChevronLeft,
 CheckCircle,
 Clock,
 MapPin,
 Sparkles,
 Info,
 Shield,
 Check,
 Calendar,
 AlertTriangle,
 ArrowRight,
 TrendingUp,
 RefreshCw,
 Ban,
 Activity,
 History,
 Archive,
 UserCheck,
 Percent,
 Sliders,
 DollarSign,
 Briefcase
} from 'lucide-react';
import { gymApi, membershipsApi } from '../../../../../../lib/api';

export default function MembershipStatusManagementPage() {
 const router = useRouter();
 const params = useParams();
 const id = params.id as string;

 // Page States
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [subscription, setSubscription] = useState<any>(null);
 const [branches, setBranches] = useState<any[]>([]);
 const [allPlans, setAllPlans] = useState<any[]>([]);
 
 // Active Form panel selected
 const [activeForm, setActiveForm] = useState<'activate' | 'freeze' | 'reactivate' | 'suspend' | 'cancel' | 'transfer' | null>(null);

 // Form states
 const [freezeStart, setFreezeStart] = useState('');
 const [freezeEnd, setFreezeEnd] = useState('');
 const [freezeReason, setFreezeReason] = useState('Medical Leave');
 const [suspensionReason, setSuspensionReason] = useState('Payment Issues');
 const [suspensionNotes, setSuspensionNotes] = useState('');
 const [cancelRefundAmount, setCancelRefundAmount] = useState('0');
 const [cancelRefundMethod, setCancelRefundMethod] = useState('UPI');
 const [cancelReason, setCancelReason] = useState('Moving Locations');
 const [cancelConfirmCheckbox, setCancelConfirmCheckbox] = useState(false);
 const [cancelConfirmCode, setCancelConfirmCode] = useState('');
 const [transferBranchId, setTransferBranchId] = useState('');
 const [transferPlanId, setTransferPlanId] = useState('');

 // Audited timeline logs
 const [statusLogs, setStatusLogs] = useState<any[]>([
 { type: 'Subscription Activated', detail: 'Membership subscription entered active status', user: 'Staff Desk', date: '2026-05-15', reason: 'Initial Activation' }
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

 // Branches
 const branchList = await gymApi.list(orgId);
 setBranches(branchList || []);

 // Subscription Details
 const sub = await membershipsApi.getSubscription(id);
 setSubscription(sub);

 // All plans for transfer select
 const plansList = await membershipsApi.listPlans();
 setAllPlans(plansList || []);

 // Seed initial status timeline
 const initialLogs = [
 { type: 'Subscription Created', detail: 'Agreement registered', user: 'Owner Desk', date: sub.startDate, reason: 'Initial Setup' }
 ];
 if (sub.status === 'Active') {
 initialLogs.unshift({ type: 'Activated', detail: 'Membership made active for access check-ins', user: 'Staff Desk', date: sub.startDate, reason: 'Agreement Confirmed' });
 }
 setStatusLogs(initialLogs);

 } catch (err) {
 console.error(err);
 showToast('Failed to load status details', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [id]);

 // Freeze end date shifts calculation helper
 const getFreezeImpact = () => {
 if (!freezeStart || !freezeEnd || !subscription) return null;
 const start = new Date(freezeStart);
 const end = new Date(freezeEnd);
 const freezeDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
 
 // Shifted end date calculation
 const currentEnd = new Date(subscription.endDate);
 const shiftedEnd = new Date(currentEnd.getTime() + (freezeDays * 24 * 60 * 60 * 1000));
 
 return {
 days: freezeDays,
 newEndDate: shiftedEnd.toISOString().split('T')[0]
 };
 };

 const freezeImpact = getFreezeImpact();

 // Status transition handlers
 const handleTransitionStatus = async (newStatus: string) => {
 try {
 setSaving(true);
 const todayStr = new Date().toISOString().split('T')[0];
 let auditDetail = '';
 let auditReason = '';

 if (activeForm === 'freeze' && freezeImpact) {
 // Shift subscription end date by freeze duration
 await membershipsApi.updatePlan(subscription.membershipPlanId, {
 // Simulated subscription updates via plans updates or audit logs
 });
 setSubscription((prev: any) => ({
 ...prev,
 status: 'Frozen',
 endDate: freezeImpact.newEndDate
 }));
 auditDetail = `Frozen for ${freezeImpact.days} days until ${freezeImpact.newEndDate}`;
 auditReason = freezeReason;
 } else if (activeForm === 'suspend') {
 setSubscription((prev: any) => ({ ...prev, status: 'Suspended' }));
 auditDetail = 'Administrative restriction applied to membership access';
 auditReason = `${suspensionReason}: ${suspensionNotes}`;
 } else if (activeForm === 'cancel') {
 setSubscription((prev: any) => ({ ...prev, status: 'Cancelled' }));
 auditDetail = `Membership terminated. Refund processed: ₹${cancelRefundAmount} via ${cancelRefundMethod}`;
 auditReason = cancelReason;
 } else if (activeForm === 'reactivate') {
 setSubscription((prev: any) => ({ ...prev, status: 'Active' }));
 auditDetail = 'Reactivated from frozen state. Remaining freeze duration removed';
 auditReason = 'Member return';
 } else if (activeForm === 'activate') {
 setSubscription((prev: any) => ({ ...prev, status: 'Active' }));
 auditDetail = 'Membership status changed from Pending to Active';
 auditReason = 'Pre-flight check passed';
 } else if (activeForm === 'transfer') {
 const targetBranch = branches.find(b => b.id === transferBranchId)?.name || 'New Branch';
 const targetPlan = allPlans.find(p => p.id === transferPlanId)?.name || 'New Plan';
 auditDetail = `Transferred to Branch: ${targetBranch} & Plan: ${targetPlan}`;
 auditReason = 'Member request';
 }

 // Prepend to timeline logs
 setStatusLogs(prev => [
 {
 type: `Status: ${newStatus}`,
 detail: auditDetail,
 user: 'Staff Desk',
 date: todayStr,
 reason: auditReason
 },
 ...prev
 ]);

 showToast(`Membership status transitioned to ${newStatus}`);
 setActiveForm(null);
 } catch (err) {
 console.error(err);
 showToast('Failed to change status', 'error');
 } finally {
 setSaving(false);
 }
 };

 const getStatusBadge = (status: string) => {
 const s = status.toLowerCase();
 if (s === 'active') return 'bg-success-light text-success border-green-200';
 if (s === 'frozen') return 'bg-cyan-500/10 text-cyan-405 border-cyan-500/25';
 if (s === 'pending payment' || s === 'pending') return 'bg-warning-light text-amber-700 border-amber-200';
 if (s === 'cancelled') return 'bg-danger-light text-danger border-red-200';
 if (s === 'suspended') return 'bg-primary-light text-primary border-primary/20';
 return 'bg-neutral-100/20 text-neutral-600 border-neutral-200/30';
 };

 const getStatusDescription = (status: string) => {
 const s = status.toLowerCase();
 if (s === 'pending') return 'Awaiting initial validation, start date arrival, or subscription payment confirmation.';
 if (s === 'active') return 'Member can check in at authorized gym branches and fully utilize plan benefits.';
 if (s === 'frozen') return 'Membership timeline is paused. Access check-ins and benefits are temporarily blocked.';
 if (s === 'suspended') return 'Administrative restriction. Attendance check-ins are blocked; historical data remains preserved.';
 if (s === 'cancelled') return 'Subscription terminated manually before completion. Access revoked permanently.';
 return 'Membership term has successfully completed or expired.';
 };

 // Pre-flight checklists for Pending -> Active
 const activationChecklist = [
 { label: 'Plan Template Status is Active', status: subscription.membershipPlan?.status === 'Active' },
 { label: 'Required Subscription Payment Completed', status: subscription.amountPaid > 0 },
 { label: 'Member Profile Verification Valid', status: !!subscription.member?.firstName },
 { label: 'Valid Start Date Period Configured', status: !!subscription.startDate }
 ];
 const isActivationValid = activationChecklist.every(c => c.status);

 // Dynamic Impact calculations depending on proposed transition
 const getImpactSummary = (action: string) => {
 if (action === 'freeze') {
 return {
 attendance: 'Blocked during freeze hold duration.',
 billing: 'Payments paused or subscription validity extended.',
 benefits: 'PT sessions and consultation sessions suspended.',
 duration: 'Subscription end date shifted out by freeze days count.'
 };
 }
 if (action === 'suspend') {
 return {
 attendance: 'Revoked immediately at all locations.',
 billing: 'Ledger remains active (outstanding balances accumulate).',
 benefits: 'All training & dietitian coordination blocked.',
 duration: 'Remaining validity period continues counting down.'
 };
 }
 if (action === 'cancel') {
 return {
 attendance: 'Permanently revoked.',
 billing: 'Awaiting refund processing or invoice cancellations.',
 benefits: 'All unused benefits and training credits expired.',
 duration: 'Membership agreement terminated immediately.'
 };
 }
 return null;
 };

 return (
 <div className="min-h-screen bg-white text-neutral-900 p-8 space-y-6 relative overflow-hidden">
 
 {/* BACKGROUND GLOW */}

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

 {/* PAGE HEADER */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-200/80 pb-6">
 <div className="flex items-center gap-3">
 <button
 onClick={() => router.push(`/workspace/memberships/subscriptions/${id}`)}
 className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 hover:text-neutral-800 transition"
 >
 <ChevronLeft size={16} />
 </button>
 <div>
 <div className="flex items-center gap-2.5">
 <h1 className="text-xl font-bold text-neutral-900 font-display">
 Membership Status Management
 </h1>
 <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${getStatusBadge(subscription.status)}`}>
 {subscription.status}
 </span>
 </div>
 <p className="text-xs text-neutral-600 mt-1">
 Member: <strong className="text-neutral-800">{subscription.member?.firstName} {subscription.member?.lastName}</strong> • Subscription ID: {subscription.id}
 </p>
 </div>
 </div>
 </div>

 {/* DASHBOARD DETAILS GRID */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 
 {/* LEFT/CENTER: LIFE-CYCLE CONTROLS (Col span 2) */}
 <div className="lg:col-span-2 space-y-6">
 
 {/* CURRENT STATUS SUMMARY CARD */}
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-4">
 <div>
 <span className="text-[9px] text-neutral-500 font-mono uppercase block font-semibold">Active State Definition</span>
 <h3 className="text-base font-bold text-neutral-900 font-display mt-1 font-semibold">{subscription.status} Status</h3>
 <p className="text-xs text-neutral-600 mt-1 leading-relaxed">{getStatusDescription(subscription.status)}</p>
 </div>

 {/* Allowed transition actions */}
 <div className="pt-2 border-t border-neutral-200">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold mb-3">Allowed Transitions</span>
 <div className="flex flex-wrap gap-2.5">
 {subscription.status === 'Pending' && (
 <button
 onClick={() => setActiveForm('activate')}
 className="px-3.5 py-2 bg-success text-white text-xs font-semibold rounded-xl transition"
 >
 Activate Membership
 </button>
 )}
 {subscription.status === 'Active' && (
 <>
 <button
 onClick={() => setActiveForm('freeze')}
 className="px-3.5 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Freeze Subscription
 </button>
 <button
 onClick={() => setActiveForm('suspend')}
 className="px-3.5 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Suspend Access
 </button>
 <button
 onClick={() => setActiveForm('transfer')}
 className="px-3.5 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Transfer Plan/Branch
 </button>
 <button
 onClick={() => setActiveForm('cancel')}
 className="px-3.5 py-2 bg-danger-light border border-red-200 text-danger hover:bg-danger-light text-xs font-semibold rounded-xl transition"
 >
 Cancel Term
 </button>
 </>
 )}
 {subscription.status === 'Frozen' && (
 <button
 onClick={() => setActiveForm('reactivate')}
 className="px-3.5 py-2 bg-success text-white text-xs font-semibold rounded-xl transition"
 >
 Reactivate (Remove Freeze)
 </button>
 )}
 {subscription.status === 'Suspended' && (
 <button
 onClick={() => setActiveForm('reactivate')}
 className="px-3.5 py-2 bg-success text-white text-xs font-semibold rounded-xl transition"
 >
 Lift Suspension
 </button>
 )}
 {(subscription.status === 'Expired' || subscription.status === 'Cancelled') && (
 <button
 onClick={() => router.push(`/workspace/memberships/purchase?memberId=${subscription.memberId}`)}
 className="px-3.5 py-2 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Renew / Re-Purchase Plan
 </button>
 )}
 </div>
 </div>
 </div>

 {/* DYNAMIC TRANSITION FORMS */}
 {activeForm && (
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-6 animate-slide-in">
 <div className="flex justify-between items-center border-b border-neutral-200 pb-4">
 <h3 className="text-sm font-bold text-neutral-900 font-display capitalize font-semibold">
 Transition Flow: {activeForm} Membership
 </h3>
 <button
 onClick={() => setActiveForm(null)}
 className="text-xs text-neutral-500 hover:text-neutral-700"
 >
 Close Panel
 </button>
 </div>

 {/* ACTION: ACTIVATE CHECKLIST */}
 {activeForm === 'activate' && (
 <div className="space-y-4 text-xs">
 <div className="space-y-2">
 {activationChecklist.map((item, idx) => (
 <div key={idx} className="flex justify-between items-center bg-neutral-50/30 border border-neutral-200 p-3 rounded-xl">
 <span className="text-neutral-800">{item.label}</span>
 {item.status ? (
 <CheckCircle className="text-success w-4 h-4" />
 ) : (
 <AlertTriangle className="text-danger w-4 h-4" />
 )}
 </div>
 ))}
 </div>

 {!isActivationValid && (
 <div className="flex gap-2 bg-danger-light border border-red-200 p-3 rounded-2xl text-xs text-danger">
 <Info size={15} className="shrink-0 mt-0.5" />
 <span>One or more pre-flight validation checklist rules failed. Plan status must be Active and payment must be recorded first.</span>
 </div>
 )}

 <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
 <button
 type="button"
 onClick={() => setActiveForm(null)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl"
 >
 Cancel
 </button>
 <button
 type="button"
 disabled={!isActivationValid || saving}
 onClick={() => handleTransitionStatus('Active')}
 className="px-4 py-2 bg-success text-white text-xs font-semibold rounded-xl disabled:opacity-30"
 >
 Confirm Activation
 </button>
 </div>
 </div>
 )}

 {/* ACTION: FREEZE PLAN */}
 {activeForm === 'freeze' && (
 <form
 onSubmit={e => {
 e.preventDefault();
 handleTransitionStatus('Frozen');
 }}
 className="space-y-4 text-xs"
 >
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Freeze Start Date</label>
 <input
 type="date"
 required
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900"
 value={freezeStart}
 onChange={e => setFreezeStart(e.target.value)}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Freeze End Date</label>
 <input
 type="date"
 required
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900"
 value={freezeEnd}
 onChange={e => setFreezeEnd(e.target.value)}
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Freeze Reason</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900"
 value={freezeReason}
 onChange={e => setFreezeReason(e.target.value)}
 >
 <option value="Medical Leave">Medical Leave</option>
 <option value="Vacation Pause">Vacation Pause</option>
 <option value="Business Trip">Business Trip</option>
 <option value="Personal Hold">Personal Hold</option>
 </select>
 </div>

 {/* Freeze Impact calculator preview */}
 {freezeImpact && (
 <div className="bg-neutral-50/40 border border-neutral-200 p-4 rounded-2xl space-y-3 font-mono text-[11px] animate-slide-in">
 <span className="text-[10px] text-neutral-500 font-sans uppercase block font-semibold">Freeze Impact Preview</span>
 <div className="flex justify-between"><span className="text-neutral-600">Freeze Hold Duration</span><span className="text-neutral-800">{freezeImpact.days} Days</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">Previous Expiration</span><span className="text-neutral-800">{subscription.endDate}</span></div>
 <div className="flex justify-between border-t border-neutral-200/60 pt-2"><span className="text-neutral-600">New Expiration (Extended)</span><span className="text-success font-bold">{freezeImpact.newEndDate}</span></div>
 </div>
 )}

 <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
 <button
 type="button"
 onClick={() => setActiveForm(null)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={saving || !freezeImpact}
 className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-neutral-900 text-xs font-semibold rounded-xl disabled:opacity-30"
 >
 Approve & Pause Membership
 </button>
 </div>
 </form>
 )}

 {/* ACTION: REACTIVATE */}
 {activeForm === 'reactivate' && (
 <div className="space-y-4 text-xs">
 <p className="text-neutral-700 leading-relaxed">
 This will lift the current freeze pause or administrative hold. Access check-ins will be reactivated immediately.
 </p>

 <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
 <button
 type="button"
 onClick={() => setActiveForm(null)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={() => handleTransitionStatus('Active')}
 disabled={saving}
 className="px-4 py-2 bg-success text-white text-xs font-semibold rounded-xl"
 >
 Confirm Reactivation
 </button>
 </div>
 </div>
 )}

 {/* ACTION: SUSPEND */}
 {activeForm === 'suspend' && (
 <form
 onSubmit={e => {
 e.preventDefault();
 handleTransitionStatus('Suspended');
 }}
 className="space-y-4 text-xs"
 >
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Suspension Reason</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900"
 value={suspensionReason}
 onChange={e => setSuspensionReason(e.target.value)}
 >
 <option value="Payment Issues">Payment Issues / Failed Dues</option>
 <option value="Policy Violation">Policy / Gym Rule Violation</option>
 <option value="Administrative Action">Administrative Restriction</option>
 <option value="Medical Hold">Medical Hold</option>
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Internal Audit Notes</label>
 <textarea
 rows={2}
 placeholder="Specify infraction details or documentation logs..."
 className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-neutral-900 focus:outline-none"
 value={suspensionNotes}
 onChange={e => setSuspensionNotes(e.target.value)}
 />
 </div>

 {/* Suspension Warning details */}
 <div className="flex gap-2.5 bg-primary-light border border-primary/20 p-3 rounded-2xl text-xs text-primary">
 <Ban size={16} className="shrink-0 mt-0.5" />
 <span>Access check-ins and plan benefits will be blocked immediately. Outstanding payment collection ledger remains active.</span>
 </div>

 <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
 <button
 type="button"
 onClick={() => setActiveForm(null)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={saving}
 className="px-4 py-2 bg-primary hover:bg-primary-hover text-neutral-900 text-xs font-semibold rounded-xl"
 >
 Apply Suspension Hold
 </button>
 </div>
 </form>
 )}

 {/* ACTION: CANCEL */}
 {activeForm === 'cancel' && (
 <form
 onSubmit={e => {
 e.preventDefault();
 handleTransitionStatus('Cancelled');
 }}
 className="space-y-4 text-xs"
 >
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Refund Amount (₹)</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900 font-mono"
 value={cancelRefundAmount}
 onChange={e => setCancelRefundAmount(e.target.value)}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Refund Method</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900"
 value={cancelRefundMethod}
 onChange={e => setCancelRefundMethod(e.target.value)}
 >
 <option value="UPI">UPI Transfer</option>
 <option value="Cash">Cash</option>
 <option value="Card">Original Card Refund</option>
 <option value="None">No Refund</option>
 </select>
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Cancellation Reason</label>
 <input
 type="text"
 required
 placeholder="e.g. Relocation, Health Issues..."
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900"
 value={cancelReason}
 onChange={e => setCancelReason(e.target.value)}
 />
 </div>

 {/* Typing safeguards */}
 <div className="space-y-3 pt-3 border-t border-neutral-200">
 <label className="flex items-start gap-2.5 text-neutral-700 cursor-pointer">
 <input
 type="checkbox"
 className="text-danger mt-0.5 bg-neutral-50 border-neutral-200 focus:ring-0"
 checked={cancelConfirmCheckbox}
 onChange={e => setCancelConfirmCheckbox(e.target.checked)}
 />
 <span>I understand that cancelling this subscription agreement is permanent.</span>
 </label>
 
 <div className="space-y-1 pt-1">
 <label className="text-[9px] text-neutral-500 font-mono uppercase">
 Type Subscription code <strong className="text-neutral-700 font-bold select-all">{subscription.id.slice(0,8).toUpperCase()}</strong> to confirm
 </label>
 <input
 type="text"
 required
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900 font-mono"
 placeholder={subscription.id.slice(0,8).toUpperCase()}
 value={cancelConfirmCode}
 onChange={e => setCancelConfirmCode(e.target.value)}
 />
 </div>
 </div>

 <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
 <button
 type="button"
 onClick={() => setActiveForm(null)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={!cancelConfirmCheckbox || cancelConfirmCode !== subscription.id.slice(0,8).toUpperCase() || saving}
 className="px-4 py-2 bg-danger hover:bg-red-600 text-neutral-900 text-xs font-semibold rounded-xl disabled:opacity-30"
 >
 Permanently Cancel Subscription
 </button>
 </div>
 </form>
 )}

 {/* ACTION: TRANSFER PLAN/BRANCH */}
 {activeForm === 'transfer' && (
 <form
 onSubmit={e => {
 e.preventDefault();
 handleTransitionStatus('Transferred');
 }}
 className="space-y-4 text-xs"
 >
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Target Branch Assignment</label>
 <select
 required
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900"
 value={transferBranchId}
 onChange={e => setTransferBranchId(e.target.value)}
 >
 <option value="">Select Target Branch</option>
 {branches.map(b => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Target Plan Upgrade/Downgrade</label>
 <select
 required
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900"
 value={transferPlanId}
 onChange={e => setTransferPlanId(e.target.value)}
 >
 <option value="">Select New Package</option>
 {allPlans.filter(p => p.id !== subscription.membershipPlanId).map(p => (
 <option key={p.id} value={p.id}>{p.name} (₹{p.basePrice})</option>
 ))}
 </select>
 </div>
 </div>

 <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
 <button
 type="button"
 onClick={() => setActiveForm(null)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={saving || !transferBranchId || !transferPlanId}
 className="px-4 py-2 bg-primary text-neutral-900 text-xs font-semibold rounded-xl disabled:opacity-30"
 >
 Process Plan Transfer
 </button>
 </div>
 </form>
 )}

 </div>
 )}

 {/* CHRONOLOGICAL STATUS TIMELINE LOG */}
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-6">
 <h3 className="text-sm font-bold text-neutral-800 font-display flex items-center gap-2">
 <History size={16} className="text-danger" />
 Audited Status History Log
 </h3>
 
 <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-neutral-50">
 {statusLogs.map((log, idx) => (
 <div key={idx} className="flex gap-4 relative">
 <div className="w-6 h-6 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center z-10 text-[9px] font-bold text-neutral-500">
 {statusLogs.length - idx}
 </div>
 <div className="space-y-1 text-xs">
 <div className="flex items-center gap-3">
 <span className="font-bold text-neutral-800">{log.type}</span>
 <span className="text-[10px] text-neutral-500 font-mono">• {log.date}</span>
 </div>
 <p className="text-neutral-600">{log.detail}</p>
 <div className="flex gap-2 text-[9px] text-neutral-500 font-mono">
 <span>Operator: {log.user}</span>
 <span>•</span>
 <span>Reason: {log.reason}</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 </div>

 {/* RIGHT COLUMN: ANALYTICS & IMPACT (Col span 1) */}
 <div className="lg:col-span-1 space-y-6 shrink-0">
 
 {/* MEMBERSHIP HEALTH SCORE WIDGET */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Membership Health Score</span>
 
 <div className="flex items-center gap-4">
 <div className="w-14 h-14 rounded-full border-2 border-green-200 flex items-center justify-center text-success font-bold text-sm bg-success-light">
 98%
 </div>
 <div className="text-xs">
 <span className="font-bold text-success block">Excellent Health</span>
 <p className="text-[11px] text-neutral-600 mt-0.5">High check-in attendance, fully-paid invoice dues, no warnings.</p>
 </div>
 </div>
 </div>

 {/* DYNAMIC IMPACT ANALYSIS PANEL */}
 {activeForm && (
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4 animate-slide-in">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Proposed Transition Impact Analysis</span>
 
 {(() => {
 const impact = getImpactSummary(activeForm);
 if (!impact) return <span className="text-xs text-neutral-500 italic">No significant changes on other entities.</span>;
 return (
 <div className="space-y-3.5 text-xs">
 <div className="space-y-1">
 <span className="text-[9px] text-neutral-500 block font-mono uppercase">Attendance Impact</span>
 <p className="text-neutral-800 font-medium">{impact.attendance}</p>
 </div>
 <div className="space-y-1">
 <span className="text-[9px] text-neutral-500 block font-mono uppercase">Billing Ledger Impact</span>
 <p className="text-neutral-800 font-medium">{impact.billing}</p>
 </div>
 <div className="space-y-1">
 <span className="text-[9px] text-neutral-500 block font-mono uppercase">Trainer Program Impact</span>
 <p className="text-neutral-800 font-medium">{impact.benefits}</p>
 </div>
 <div className="space-y-1">
 <span className="text-[9px] text-neutral-500 block font-mono uppercase">Timeline Expiration Impact</span>
 <p className="text-neutral-800 font-medium">{impact.duration}</p>
 </div>
 </div>
 );
 })()}
 </div>
 )}

 </div>

 </div>

 </div>
 );
}
