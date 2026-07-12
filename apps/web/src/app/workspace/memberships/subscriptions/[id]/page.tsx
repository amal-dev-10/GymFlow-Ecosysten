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
 UserCheck,
 CreditCard,
 Download,
 Share2,
 Heart,
 TrendingUp,
 FileDown,
 Sliders
} from 'lucide-react';
import { gymApi, membershipsApi, orgApi, freezeApi } from '../../../../../lib/api';
import { Tabs } from '../../../../../components/ui';

export default function SubscriptionDetailsPage() {
 const router = useRouter();
 const params = useParams();
 const id = params.id as string;

 // Lifecycle & Fetch States
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [subscription, setSubscription] = useState<any>(null);
 const [branches, setBranches] = useState<any[]>([]);
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 // Real enriched data (attendance history, freeze holds, derived metrics)
 const [attendance, setAttendance] = useState<any[]>([]);
 const [freezes, setFreezes] = useState<any[]>([]);
 const [visitsLast30Days, setVisitsLast30Days] = useState(0);
 const [freezeDaysUsed, setFreezeDaysUsed] = useState(0);

 // Tab State
 const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'attendance' | 'benefits' | 'freezes' | 'upgrades' | 'documents' | 'timeline'>('overview');

 // Quick Action Drawer
 const [showDrawer, setShowDrawer] = useState(false);
 const [drawerAction, setDrawerAction] = useState<'renew' | 'freeze' | 'upgrade' | 'payment' | 'cancel' | null>(null);

 // Drawer Form Inputs
 const [freezeStartDate, setFreezeStartDate] = useState('');
 const [freezeEndDate, setFreezeEndDate] = useState('');
 const [freezeReason, setFreezeReason] = useState('Medical Leave');
 const [paymentAmount, setPaymentAmount] = useState('');
 const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card'>('UPI');
 const [renewalPlanId, setRenewalPlanId] = useState('');
 const [allPlans, setAllPlans] = useState<any[]>([]);

 // Localized Audited logs timeline
 const [timelineLogs, setTimelineLogs] = useState<any[]>([]);

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 const getBranchNames = (access: any) => {
 if (!access) return 'No Access';
 if (access === 'all') return 'All Branches';
 const accessArray = typeof access === 'string' ? access.split(',') : access;
 if (!Array.isArray(accessArray)) return 'No Access';
 return accessArray.map(id => {
 const b = branches.find(x => x.id === id.trim());
 return b ? b.name : 'Unknown Branch';
 }).join(', ');
 };

 const loadData = async () => {
 try {
 setLoading(true);
 const orgId = localStorage.getItem('organizationId') || '';

 // Branches (for access-tier labels) and plan catalog (for upgrades) in parallel
 // with the enriched subscription overview.
 const [branchList, plansList, overview] = await Promise.all([
 gymApi.list(orgId),
 membershipsApi.listPlans(),
 membershipsApi.getSubscriptionOverview(id),
 ]);

 setBranches(branchList || []);
 setAllPlans(plansList || []);

 setSubscription(overview.subscription);
 setAttendance(overview.attendance || []);
 setFreezes(overview.freezes || []);
 setVisitsLast30Days(overview.visitsLast30Days || 0);
 setFreezeDaysUsed(overview.freezeDaysUsed || 0);

 // Real audit-log timeline for this membership + its freezes.
 setTimelineLogs(
 (overview.timeline || []).map((log: any) => ({
 type: log.action,
 detail: log.details,
 user: log.user,
 date: new Date(log.createdAt).toLocaleDateString(),
 }))
 );

 } catch (err) {
 console.error(err);
 showToast('Failed to load subscription details', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [id]);

 // Handle Quick Actions submit — persists to the API, then re-fetches so the
 // page reflects the real server state (status, ledger, timeline).
 const handleDrawerActionSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!drawerAction) return;

 try {
 setSaving(true);

 if (drawerAction === 'freeze') {
 if (!freezeStartDate || !freezeEndDate) {
 showToast('Please specify freeze dates', 'error');
 return;
 }
 const startMs = new Date(freezeStartDate).getTime();
 const endMs = new Date(freezeEndDate).getTime();
 const durationDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 3600 * 24)));
 if (endMs <= startMs) {
 showToast('Freeze end date must be after the start date', 'error');
 return;
 }
 await freezeApi.requestFreeze({
 memberMembershipId: id,
 startDate: freezeStartDate,
 endDate: freezeEndDate,
 durationDays,
 reasonCategory: freezeReason,
 });
 showToast('Freeze request submitted successfully');
 } else if (drawerAction === 'payment') {
 const amt = parseFloat(paymentAmount) || 0;
 if (amt <= 0) {
 showToast('Please enter a valid payment amount', 'error');
 return;
 }
 await membershipsApi.updateSubscription(id, {
 amountPaid: (subscription.amountPaid || 0) + amt,
 outstandingDues: Math.max(0, (subscription.outstandingDues || 0) - amt),
 });
 showToast('Payment recorded successfully');
 } else if (drawerAction === 'cancel') {
 await membershipsApi.updateSubscription(id, { status: 'Cancelled' });
 showToast('Subscription cancelled');
 } else if (drawerAction === 'renew') {
 // Extend validity by one plan cycle from the current end date.
 const cycleDays = getPlanDurationDays(subscription.membershipPlan);
 const newEnd = new Date(new Date(subscription.endDate).getTime() + cycleDays * 24 * 3600 * 1000);
 await membershipsApi.updateSubscription(id, {
 endDate: newEnd.toISOString(),
 status: 'Active',
 });
 showToast('Subscription renewed successfully');
 } else if (drawerAction === 'upgrade') {
 const chosen = allPlans.find(p => p.id === renewalPlanId);
 if (!chosen) {
 showToast('Please select a valid plan for upgrade', 'error');
 return;
 }
 await membershipsApi.updateSubscription(id, { membershipPlanId: chosen.id });
 showToast(`Plan changed to ${chosen.name}`);
 }

 setShowDrawer(false);
 setPaymentAmount('');
 setRenewalPlanId('');
 await loadData();
 } catch (err) {
 console.error(err);
 showToast('Failed to execute requested change', 'error');
 } finally {
 setSaving(false);
 }
 };

 // Translate a plan's duration template into a day count for renewal math.
 const getPlanDurationDays = (plan: any): number => {
 if (!plan) return 30;
 const value = plan.durationValue || 1;
 const type = (plan.durationType || 'Monthly').toLowerCase();
 if (type.includes('year')) return value * 365;
 if (type.includes('month')) return value * 30;
 if (type.includes('week')) return value * 7;
 if (type.includes('day')) return value;
 return value * 30;
 };

 if (loading) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Fetching subscription 360° analytics...
 </div>
 );
 }

 if (!subscription) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500">
 Subscription agreement profile not found.
 </div>
 );
 }

 // Derived timeline math
 const start = new Date(subscription.startDate);
 const end = new Date(subscription.endDate);
 const today = new Date();
 const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
 const daysRemaining = Math.max(0, Math.round((end.getTime() - today.getTime()) / (1000 * 3600 * 24)));
 const basePrice = subscription.membershipPlan?.basePrice || 0;
 const tax = subscription.membershipPlan?.taxPercentage || 0;
 const joiningFee = subscription.membershipPlan?.joiningFee || 0;
 const totalPrice = Math.round((basePrice + joiningFee) * (1 + tax / 100));
 // Prefer the persisted ledger balance; fall back to price-minus-paid for
 // legacy rows created before outstandingDues was tracked.
 const balanceOutstanding = subscription.outstandingDues != null
 ? Math.max(0, subscription.outstandingDues)
 : Math.max(0, totalPrice - subscription.amountPaid);
 const freezeAllowance = subscription.membershipPlan?.freezeAllowanceDays || 30;
 const planBenefits: string[] = Array.isArray(subscription.membershipPlan?.benefits)
 ? subscription.membershipPlan.benefits
 : typeof subscription.membershipPlan?.benefits === 'string'
 ? subscription.membershipPlan.benefits.split(',').map((b: string) => b.trim()).filter(Boolean)
 : [];

 // Health index derived from real signals: active status, paid-up ledger, and
 // recent check-in activity. Purely computed — no hardcoded score.
 const isActive = (subscription.status || '').toLowerCase() === 'active';
 const healthScore = Math.max(
 5,
 Math.min(
 100,
 (isActive ? 40 : 0) +
 (balanceOutstanding === 0 ? 35 : 10) +
 Math.min(25, visitsLast30Days * 3)
 )
 );
 const healthLabel = healthScore >= 80 ? 'Excellent Health' : healthScore >= 55 ? 'Healthy' : healthScore >= 30 ? 'At Risk' : 'Critical';
 const healthColor = healthScore >= 80 ? 'text-success' : healthScore >= 55 ? 'text-neutral-700' : healthScore >= 30 ? 'text-amber-700' : 'text-danger';

 const getStatusBadge = (status: string) => {
 const s = status.toLowerCase();
 if (s === 'active') return 'bg-success-light text-success border-green-200';
 if (s === 'frozen') return 'bg-cyan-500/10 text-cyan-405 border-cyan-500/25';
 if (s === 'pending payment' || s === 'pending') return 'bg-warning-light text-amber-700 border-amber-200';
 if (s === 'cancelled') return 'bg-danger-light text-danger border-red-200';
 return 'bg-neutral-100/20 text-neutral-600 border-neutral-200/30'; // Expired
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
 onClick={() => router.push(`/workspace/members/${subscription.memberId}`)}
 className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 hover:text-neutral-800 transition"
 >
 <ChevronLeft size={16} />
 </button>
 <div>
 <div className="flex items-center gap-2.5">
 <h1 className="text-xl font-bold text-neutral-900 font-display">
 Subscription #{subscription.id.slice(0, 8).toUpperCase()}
 </h1>
 <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${getStatusBadge(subscription.status)}`}>
 {subscription.status}
 </span>
 </div>
 <p className="text-xs text-neutral-600 mt-1">
 Member: <strong className="text-neutral-800">{subscription.member?.firstName} {subscription.member?.lastName}</strong> • Plan: {subscription.membershipPlan?.name}
 </p>
 </div>
 </div>

 <div className="flex flex-wrap gap-2">
 <button
 onClick={() => router.push(`/workspace/memberships/subscriptions/${id}/status`)}
 className="px-3 py-2 bg-neutral-50 border border-neutral-200 hover:text-neutral-900 text-danger text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
 <Sliders size={13} />
 <span>Status Control</span>
 </button>

 <button
 onClick={() => router.push(`/workspace/memberships/subscriptions/${id}/renew`)}
 className="px-3 py-2 bg-neutral-50 border border-neutral-200 hover:text-neutral-900 text-neutral-700 text-xs font-semibold rounded-xl transition"
 >
 Renew
 </button>
 <button
 onClick={() => { setDrawerAction('freeze'); setShowDrawer(true); }}
 className="px-3 py-2 bg-neutral-50 border border-neutral-200 hover:text-neutral-900 text-neutral-700 text-xs font-semibold rounded-xl transition"
 >
 Freeze
 </button>
 <button
 onClick={() => { setDrawerAction('upgrade'); setShowDrawer(true); }}
 className="px-3 py-2 bg-neutral-50 border border-neutral-200 hover:text-neutral-900 text-neutral-700 text-xs font-semibold rounded-xl transition"
 >
 Upgrade Plan
 </button>
 <button
 onClick={() => { setDrawerAction('payment'); setShowDrawer(true); }}
 className="px-3 py-2 bg-success text-white text-xs font-semibold rounded-xl transition"
 >
 Record Payment
 </button>
 <button
 onClick={() => { setDrawerAction('cancel'); setShowDrawer(true); }}
 className="px-3 py-2 bg-danger-light border border-red-200 text-danger hover:bg-danger-light text-xs font-semibold rounded-xl transition"
 >
 Cancel Subscription
 </button>
 </div>
 </div>

 {/* KPI HIGHLIGHTS DASHBOARD */}
 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 font-mono">
 <div className="bg-white border border-neutral-200/80 p-4 rounded-2xl">
 <span className="text-[9px] text-neutral-500 uppercase block font-sans">Days Remaining</span>
 <span className="text-lg font-bold text-neutral-900 block mt-1">{daysRemaining} Days</span>
 </div>
 <div className="bg-white border border-neutral-200/80 p-4 rounded-2xl">
 <span className="text-[9px] text-neutral-500 uppercase block font-sans">Attendance (30d)</span>
 <span className="text-lg font-bold text-neutral-900 block mt-1">{visitsLast30Days} Visits</span>
 </div>
 <div className="bg-white border border-neutral-200/80 p-4 rounded-2xl">
 <span className="text-[9px] text-neutral-500 uppercase block font-sans">Amount Paid</span>
 <span className="text-lg font-bold text-success block mt-1">₹{subscription.amountPaid.toLocaleString()}</span>
 </div>
 <div className="bg-white border border-neutral-200/80 p-4 rounded-2xl">
 <span className="text-[9px] text-neutral-500 uppercase block font-sans">Outstanding Balance</span>
 <span className={`text-lg font-bold block mt-1 ${balanceOutstanding > 0 ? 'text-danger' : 'text-neutral-600'}`}>
 ₹{balanceOutstanding.toLocaleString()}
 </span>
 </div>
 <div className="bg-white border border-neutral-200/80 p-4 rounded-2xl">
 <span className="text-[9px] text-neutral-500 uppercase block font-sans">Freeze Days Used</span>
 <span className="text-lg font-bold text-neutral-900 block mt-1">{freezeDaysUsed} / {freezeAllowance} Days</span>
 </div>
 <div className="bg-white border border-neutral-200/80 p-4 rounded-2xl">
 <span className="text-[9px] text-neutral-500 uppercase block font-sans">Total Check-ins</span>
 <span className="text-lg font-bold text-neutral-900 block mt-1">{attendance.length} Visits</span>
 </div>
 </div>

 {/* MAIN LAYOUT */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 
 {/* TABS & WORKSPACE CONTENT (Col span 2) */}
 <div className="lg:col-span-2 space-y-6">
 
 {/* Tab buttons */}
 <Tabs
 tabs={[
 { id: 'overview', label: 'Overview' },
 { id: 'payments', label: 'Payments' },
 { id: 'attendance', label: 'Attendance' },
 { id: 'benefits', label: 'Benefits' },
 { id: 'freezes', label: 'Freeze History' },
 { id: 'upgrades', label: 'Upgrades & Changes' },
 { id: 'documents', label: 'Documents' },
 { id: 'timeline', label: 'Timeline Logs' }
 ]}
 activeId={activeTab}
 onChange={(id) => setActiveTab(id as any)}
 />

 {/* TAB 1: OVERVIEW */}
 {activeTab === 'overview' && (
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
 
 {/* Member Info */}
 <div className="space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase font-semibold block border-b border-neutral-200 pb-2">Member Information</span>
 <div className="space-y-2">
 <div className="flex justify-between"><span className="text-neutral-600">Name</span><span className="font-semibold text-neutral-800">{subscription.member?.firstName} {subscription.member?.lastName}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">Phone</span><span className="font-mono text-neutral-700">{subscription.member?.phoneNumber}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">Gender</span><span className="text-neutral-700">{subscription.member?.gender}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">Biological ID</span><span className="font-mono text-neutral-500">{subscription.member?.id}</span></div>
 </div>
 </div>

 {/* Subscription Meta */}
 <div className="space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase font-semibold block border-b border-neutral-200 pb-2">Subscription Info</span>
 <div className="space-y-2 font-mono">
 <div className="flex justify-between"><span className="text-neutral-600 font-sans">Start Date</span><span className="text-neutral-700">{new Date(subscription.startDate).toLocaleDateString()}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600 font-sans">End Date</span><span className="text-neutral-700">{new Date(subscription.endDate).toLocaleDateString()}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600 font-sans">Total Days</span><span className="text-neutral-700">{totalDays} Days</span></div>
 <div className="flex justify-between"><span className="text-neutral-600 font-sans">Status</span><span className="text-neutral-700 uppercase font-bold">{subscription.status}</span></div>
 </div>
 </div>
 </div>

 {/* Rules & Privileges */}
 <div className="space-y-3 pt-2">
 <span className="text-[10px] text-neutral-500 font-mono uppercase font-semibold block">Branch Access Privileges</span>
 <div className="bg-white border border-neutral-200 p-4 rounded-2xl text-xs space-y-2">
 <div className="flex justify-between">
 <span className="text-neutral-600">Access Tier</span>
 <span className="font-semibold text-neutral-800">
 {subscription.membershipPlan?.branchAccess === 'all' ? 'All Locations (Multi-Branch)' : 'Home Location Only'}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-600">Home Branch</span>
 <span className="font-semibold text-neutral-800">{getBranchNames(subscription.membershipPlan?.branchAccess)}</span>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* TAB 2: PAYMENTS */}
 {activeTab === 'payments' && (
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-800">Invoices & Billing History</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Historical ledger of receipts, taxes, and refunds.</p>
 </div>

 <div className="overflow-x-auto border border-neutral-200/60 rounded-2xl">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-neutral-200/80 text-neutral-600 font-mono uppercase text-[9px] bg-neutral-50/20">
 <th className="py-3 px-4">Invoice #</th>
 <th className="py-3 px-4">Date</th>
 <th className="py-3 px-4">Amount</th>
 <th className="py-3 px-4">Method</th>
 <th className="py-3 px-4">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200/30 font-mono">
 <tr className="hover:bg-neutral-50/10">
 <td className="py-3 px-4 text-neutral-800 font-bold">#INV-{subscription.id.slice(0, 6).toUpperCase()}</td>
 <td className="py-3 px-4 text-neutral-600">{new Date(subscription.startDate).toLocaleDateString()}</td>
 <td className="py-3 px-4 text-neutral-800 font-bold">₹{(subscription.amountPaid || 0).toLocaleString()}</td>
 <td className="py-3 px-4 text-neutral-600">Recorded</td>
 <td className="py-3 px-4">
 <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider bg-success-light text-success border-green-200">
 Paid
 </span>
 </td>
 </tr>
 {balanceOutstanding > 0 && (
 <tr className="hover:bg-neutral-50/10">
 <td className="py-3 px-4 text-neutral-800 font-bold">#DUE-{subscription.id.slice(0, 6).toUpperCase()}</td>
 <td className="py-3 px-4 text-neutral-600">{new Date(subscription.endDate).toLocaleDateString()}</td>
 <td className="py-3 px-4 text-neutral-800 font-bold">₹{balanceOutstanding.toLocaleString()}</td>
 <td className="py-3 px-4 text-neutral-600">—</td>
 <td className="py-3 px-4">
 <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider bg-warning-light text-amber-700 border-amber-200">
 Outstanding
 </span>
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 <div className="grid grid-cols-3 gap-4 text-xs">
 <div className="bg-neutral-50/40 border border-neutral-200 p-3 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase block">Plan Total</span>
 <span className="font-mono font-bold text-neutral-800 block mt-1">₹{totalPrice.toLocaleString()}</span>
 </div>
 <div className="bg-neutral-50/40 border border-neutral-200 p-3 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase block">Collected</span>
 <span className="font-mono font-bold text-success block mt-1">₹{(subscription.amountPaid || 0).toLocaleString()}</span>
 </div>
 <div className="bg-neutral-50/40 border border-neutral-200 p-3 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase block">Outstanding</span>
 <span className={`font-mono font-bold block mt-1 ${balanceOutstanding > 0 ? 'text-danger' : 'text-neutral-600'}`}>₹{balanceOutstanding.toLocaleString()}</span>
 </div>
 </div>
 </div>
 )}

 {/* TAB 3: ATTENDANCE */}
 {activeTab === 'attendance' && (
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-800">Access check-ins Log</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Historical check-in logs for workouts and facility entries.</p>
 </div>

 <div className="overflow-x-auto border border-neutral-200/60 rounded-2xl">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-neutral-200/80 text-neutral-600 font-mono uppercase text-[9px] bg-neutral-50/20">
 <th className="py-3 px-4">Check-in Date</th>
 <th className="py-3 px-4">Time</th>
 <th className="py-3 px-4">Location</th>
 <th className="py-3 px-4">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200/30 font-mono">
 {attendance.length === 0 && (
 <tr>
 <td colSpan={4} className="py-8 px-4 text-center text-neutral-500">
 No check-ins recorded for this member since the subscription started.
 </td>
 </tr>
 )}
 {attendance.map((a) => {
 const granted = a.status === 'Granted';
 return (
 <tr key={a.id} className="hover:bg-neutral-50/10">
 <td className="py-3.5 px-4 text-neutral-800">{new Date(a.checkInTime).toLocaleDateString()}</td>
 <td className="py-3.5 px-4 text-neutral-600">{new Date(a.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
 <td className="py-3.5 px-4 text-neutral-700">{a.gym?.name || 'Unknown Branch'}</td>
 <td className={`py-3.5 px-4 font-bold flex items-center gap-1 ${granted ? 'text-success' : 'text-danger'}`}>
 <CheckSquare size={12} /> {granted ? 'Granted' : 'Denied'}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* TAB 4: BENEFITS */}
 {activeTab === 'benefits' && (
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-800">Included Benefits & Services</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Entitlements bundled with the <strong>{subscription.membershipPlan?.name}</strong> plan.</p>
 </div>

 {planBenefits.length === 0 ? (
 <div className="p-8 text-center border border-dashed border-neutral-200 rounded-2xl text-xs text-neutral-500">
 No add-on benefits are configured on this membership plan.
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
 {planBenefits.map((benefit, idx) => (
 <div key={idx} className="bg-neutral-50/40 p-4 border border-neutral-200 rounded-2xl flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-success-light border border-green-200 flex items-center justify-center shrink-0">
 <Check size={14} className="text-success" />
 </div>
 <span className="font-semibold text-neutral-800">{benefit}</span>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* TAB 5: FREEZE HISTORY */}
 {activeTab === 'freezes' && (
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-800">Freeze Hold History</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Logs of approved freezes or vacation pauses.</p>
 </div>

 {freezes.length === 0 ? (
 <div className="p-8 text-center border border-dashed border-neutral-200 rounded-2xl text-xs text-neutral-500">
 No subscription freezes have been requested or processed for this cycle.
 </div>
 ) : (
 <div className="overflow-x-auto border border-neutral-200/60 rounded-2xl">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-neutral-200/80 text-neutral-600 font-mono uppercase text-[9px] bg-neutral-50/20">
 <th className="py-3 px-4">Period</th>
 <th className="py-3 px-4">Days</th>
 <th className="py-3 px-4">Reason</th>
 <th className="py-3 px-4">Status</th>
 <th className="py-3 px-4">Approved By</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200/30 font-mono">
 {freezes.map((f) => {
 const s = (f.status || '').toLowerCase();
 const badge = s === 'approved'
 ? 'bg-success-light text-success border-green-200'
 : s === 'rejected'
 ? 'bg-danger-light text-danger border-red-200'
 : s.includes('pending')
 ? 'bg-warning-light text-amber-700 border-amber-200'
 : 'bg-neutral-100/40 text-neutral-600 border-neutral-200';
 return (
 <tr key={f.id} className="hover:bg-neutral-50/10">
 <td className="py-3 px-4 text-neutral-700">{new Date(f.startDate).toLocaleDateString()} → {new Date(f.endDate).toLocaleDateString()}</td>
 <td className="py-3 px-4 text-neutral-800 font-bold">{f.durationDays}</td>
 <td className="py-3 px-4 text-neutral-600 font-sans">{f.reasonCategory}</td>
 <td className="py-3 px-4">
 <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${badge}`}>{f.status}</span>
 </td>
 <td className="py-3 px-4 text-neutral-600 font-sans">{f.approvedBy || '—'}</td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>
 )}

 {/* TAB 6: UPGRADES & CHANGES */}
 {activeTab === 'upgrades' && (
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-800">Plan Upgrades & Downgrades</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Historical record of subscription modifications and adjustments.</p>
 </div>

 {(() => {
 const changeLogs = timelineLogs.filter(l =>
 /status|cancel|renew|upgrade|plan|freeze/i.test(l.type || '')
 );
 if (changeLogs.length === 0) {
 return (
 <div className="p-8 text-center border border-dashed border-neutral-200 rounded-2xl text-xs text-neutral-500">
 No package upgrades or plan transfers have been recorded for this membership subscription.
 </div>
 );
 }
 return (
 <div className="space-y-3">
 {changeLogs.map((l, idx) => (
 <div key={idx} className="flex justify-between items-start bg-neutral-50/40 border border-neutral-200 p-4 rounded-2xl text-xs gap-3">
 <div className="flex items-start gap-3">
 <RefreshCw size={15} className="text-danger shrink-0 mt-0.5" />
 <div>
 <span className="font-bold text-neutral-800 block">{l.type}</span>
 <span className="text-[11px] text-neutral-600 block mt-0.5">{l.detail}</span>
 </div>
 </div>
 <span className="text-[9px] text-neutral-500 font-mono shrink-0">{l.date}</span>
 </div>
 ))}
 </div>
 );
 })()}
 </div>
 )}

 {/* TAB 7: DOCUMENTS */}
 {activeTab === 'documents' && (
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-800">Membership Documents & Agreement Terms</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Generate, view, and print signed digital agreement receipts.</p>
 </div>

 <div className="space-y-3">
 <div className="flex justify-between items-center bg-white border border-neutral-200 p-4 rounded-2xl text-xs">
 <div className="flex items-center gap-3">
 <FileText className="text-danger w-5 h-5" />
 <div>
 <span className="font-semibold text-neutral-800 block">Membership Agreement.pdf</span>
 <span className="text-[10px] text-neutral-500 block">Digitally Signed on {new Date(subscription.startDate).toLocaleDateString()}</span>
 </div>
 </div>
 <button
 onClick={() => showToast('Simulating agreement download...')}
 className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl hover:text-neutral-900 transition"
 >
 <Download size={14} />
 </button>
 </div>
 </div>
 </div>
 )}

 {/* TAB 8: TIMELINE */}
 {activeTab === 'timeline' && (
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-800">Subscription Timeline Log</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Chronological system events and administrative action tracking.</p>
 </div>

 {timelineLogs.length === 0 && (
 <div className="p-8 text-center border border-dashed border-neutral-200 rounded-2xl text-xs text-neutral-500">
 No audited events have been recorded for this subscription yet.
 </div>
 )}
 <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-neutral-50">
 {timelineLogs.map((log, idx) => (
 <div key={idx} className="flex gap-4 relative">
 <div className="w-6 h-6 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center z-10 text-[9px] font-bold text-danger">
 {timelineLogs.length - idx}
 </div>
 <div className="space-y-1 text-xs">
 <div className="flex items-center gap-3">
 <span className="font-bold text-neutral-800">{log.type}</span>
 <span className="text-[9px] text-neutral-500 font-mono">• {log.date}</span>
 </div>
 <p className="text-neutral-600">{log.detail}</p>
 <span className="text-[9px] text-neutral-500 font-mono block">Operator: {log.user}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 </div>

 {/* SIDEBAR KPI WIDGETS (Col span 1) */}
 <div className="lg:col-span-1 space-y-6 shrink-0">
 
 {/* SUBSCRIPTION HEALTH score WIDGET */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Subscription Health Index</span>
 
 <div className="flex items-center gap-4">
 <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-bold text-sm ${healthScore >= 55 ? 'border-green-200 bg-success-light' : 'border-amber-200 bg-warning-light'} ${healthColor}`}>
 {healthScore}%
 </div>
 <div className="text-xs">
 <span className={`font-bold block ${healthColor}`}>{healthLabel}</span>
 <p className="text-[11px] text-neutral-600 mt-0.5">
 {isActive ? 'Active membership' : `Status: ${subscription.status}`} · {visitsLast30Days} visits in 30d · {balanceOutstanding === 0 ? 'fully paid' : `₹${balanceOutstanding.toLocaleString()} due`}.
 </p>
 </div>
 </div>
 </div>

 {/* RENEWAL SUMMARY WIDGET */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Renewal Forecast</span>
 <div className="space-y-3 text-xs">
 <div className="flex justify-between"><span className="text-neutral-600">Expiry Date</span><span className="font-mono text-neutral-800">{new Date(subscription.endDate).toLocaleDateString()}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">Days Remaining</span><span className={`font-semibold ${daysRemaining <= 7 ? 'text-danger' : 'text-neutral-700'}`}>{daysRemaining} Days</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">Renewal Price</span><span className="font-mono font-semibold text-neutral-800">₹{totalPrice.toLocaleString()}</span></div>

 <button
 onClick={() => router.push(`/workspace/memberships/subscriptions/${id}/renew`)}
 className="w-full mt-2 py-2 bg-primary text-neutral-900 text-[10px] font-semibold rounded-xl transition uppercase"
 >
 Renew Membership Now
 </button>
 </div>
 </div>

 {/* OUTSTANDING BALANCES WIDGET */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Outstanding Balance Summary</span>
 <div className="space-y-3.5 text-xs">
 <div className="flex justify-between">
 <span className="text-neutral-600">Remaining Balance</span>
 <span className={`font-mono font-bold ${balanceOutstanding > 0 ? 'text-danger' : 'text-neutral-700'}`}>
 ₹{balanceOutstanding.toLocaleString()}
 </span>
 </div>
 {balanceOutstanding > 0 ? (
 <button
 onClick={() => { setDrawerAction('payment'); setShowDrawer(true); }}
 className="w-full py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-[10px] font-semibold rounded-xl transition uppercase"
 >
 Record Payment
 </button>
 ) : (
 <div className="flex gap-2 bg-success-light border border-green-200 p-2.5 rounded-xl text-[10px] text-success">
 <CheckCircle size={13} className="shrink-0 mt-0.5" />
 <span>Subscription fully paid for this active period.</span>
 </div>
 )}
 </div>
 </div>

 </div>

 </div>

 {/* QUICK ACTION DRAWER (SLIDE-OVER) */}
 {showDrawer && drawerAction && (
 <div className="fixed inset-0 z-[100] overflow-hidden">
 <div className="absolute inset-0 bg-neutral-50/80 backdrop-blur-sm transition-opacity" onClick={() => setShowDrawer(false)} />
 <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
 <div className="w-screen max-w-md bg-white border-l border-neutral-200/80 p-6 flex flex-col justify-between shadow-2xl">
 <div className="space-y-6">
 <div>
 <h3 className="text-base font-bold text-neutral-900 font-display capitalize">
 {drawerAction} Subscription Agreement
 </h3>
 <p className="text-xs text-neutral-600 mt-1">
 Execute operational state adjustments for Subscription #{subscription.id.slice(0, 8).toUpperCase()}.
 </p>
 </div>

 <form onSubmit={handleDrawerActionSubmit} className="space-y-4 text-xs">
 
 {/* Freeze form fields */}
 {drawerAction === 'freeze' && (
 <div className="space-y-3 animate-slide-in">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Freeze Start Date</label>
 <input
 type="date"
 required
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-neutral-900"
 value={freezeStartDate}
 onChange={e => setFreezeStartDate(e.target.value)}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Freeze End Date</label>
 <input
 type="date"
 required
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-neutral-900"
 value={freezeEndDate}
 onChange={e => setFreezeEndDate(e.target.value)}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Reason Category</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-neutral-900"
 value={freezeReason}
 onChange={e => setFreezeReason(e.target.value)}
 >
 <option value="Medical Leave">Medical Leave</option>
 <option value="Vacation Pause">Vacation Pause</option>
 <option value="Business Trip">Business Trip</option>
 <option value="Personal Reasons">Personal Reasons</option>
 </select>
 </div>
 </div>
 )}

 {/* Payment form fields */}
 {drawerAction === 'payment' && (
 <div className="space-y-3 animate-slide-in">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Payment Amount (₹)</label>
 <input
 type="number"
 required
 max={balanceOutstanding}
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900 font-mono"
 placeholder={`Max: ₹${balanceOutstanding}`}
 value={paymentAmount}
 onChange={e => setPaymentAmount(e.target.value)}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Payment Method</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900"
 value={paymentMethod}
 onChange={e => setPaymentMethod(e.target.value as any)}
 >
 <option value="UPI">UPI Transfer</option>
 <option value="Cash">Cash</option>
 <option value="Card">Credit/Debit Card</option>
 </select>
 </div>
 </div>
 )}

 {/* Upgrade form fields */}
 {drawerAction === 'upgrade' && (
 <div className="space-y-3 animate-slide-in">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Select New Plan</label>
 <select
 required
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900"
 value={renewalPlanId}
 onChange={e => setRenewalPlanId(e.target.value)}
 >
 <option value="">Select Upgrade Plan Option</option>
 {allPlans.filter(p => p.id !== subscription.membershipPlanId).map(p => (
 <option key={p.id} value={p.id}>{p.name} (₹{p.basePrice.toLocaleString()})</option>
 ))}
 </select>
 </div>
 </div>
 )}

 {/* Cancel form warnings */}
 {drawerAction === 'cancel' && (
 <div className="flex gap-2.5 bg-danger-light border border-red-200 p-3.5 rounded-2xl text-xs text-danger">
 <AlertTriangle size={16} className="shrink-0 mt-0.5" />
 <span>Warning: Terminating this subscription is permanent. Existing checkout histories and invoice ledger details will not be deleted, but member access privileges will be revoked.</span>
 </div>
 )}

 {/* Renew Form details */}
 {drawerAction === 'renew' && (
 <div className="bg-neutral-50/30 border border-neutral-200 p-4 rounded-xl space-y-1 text-xs">
 <span className="font-bold text-neutral-800">Extend subscription?</span>
 <p className="text-[11px] text-neutral-600">Extends validity for another term matching template durations.</p>
 </div>
 )}

 <div className="flex gap-3 pt-4 border-t border-neutral-200 mt-6">
 <button
 type="button"
 onClick={() => setShowDrawer(false)}
 className="flex-1 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 font-semibold rounded-xl transition"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={saving}
 className="flex-1 py-2 bg-primary text-neutral-900 font-semibold rounded-xl transition"
 >
 {saving ? 'Processing...' : 'Confirm Action'}
 </button>
 </div>
 </form>
 </div>
 </div>
 </div>
 </div>
 )}

 </div>
 );
}
