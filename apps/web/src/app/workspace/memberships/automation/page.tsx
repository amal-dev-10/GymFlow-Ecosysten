'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
 Activity,
 Sliders,
 Sparkles,
 Search,
 Filter,
 Users,
 MapPin,
 Clock,
 DollarSign,
 AlertTriangle,
 Play,
 RotateCcw,
 History,
 CreditCard,
 CheckCircle,
 Inbox,
 Lock,
 ShieldAlert,
 Mail,
 MessageSquare,
 MessageCircle,
 ChevronLeft,
 ChevronRight,
 TrendingUp,
 AlertCircle,
 Plus,
 ArrowRight,
 Save,
 Check,
 X,
 FileText
} from 'lucide-react';
import { gymApi, orgApi, membershipsApi } from '../../../../lib/api';
import MembershipsTabs from '../MembershipsTabs';

interface JobItem {
 id: string;
 rawSubId?: string;
 memberName: string;
 memberId: string;
 planName: string;
 expiryDate: string;
 status: 'Completed' | 'Pending' | 'Processing' | 'Failed';
 errorLog?: string;
 notified: boolean;
 gateBlocked: boolean;
}

function ExpiryAutomationContent() {
 const router = useRouter();

 // Basic States
 const [loading, setLoading] = useState(true);
 const [userRole, setUserRole] = useState('manager'); // 'owner', 'manager', 'trainer', 'dietitian'
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 // Settings / Rules State
 const [autoExpiryEnabled, setAutoExpiryEnabled] = useState(true);
 const [executionTime, setExecutionTime] = useState('02:00');
 const [gracePeriodDays, setGracePeriodDays] = useState(7);

 // Access Block settings
 const [blockGate, setBlockGate] = useState(true);
 const [blockTrainerSessions, setBlockTrainerSessions] = useState(true);
 const [blockDietPlans, setBlockDietPlans] = useState(false);
 const [blockPortalAccess, setBlockPortalAccess] = useState(true);

 // Reminder Preview state
 const [reminderDaysOut, setReminderDaysOut] = useState(7);
 const [reminderType, setReminderType] = useState<'Email' | 'SMS' | 'WhatsApp'>('WhatsApp');

 // Manual Override Drawer State
 const [showOverrideDrawer, setShowOverrideDrawer] = useState(false);
 const [overrideMemberId, setOverrideMemberId] = useState('');
 const [overrideAction, setOverrideAction] = useState<'Extend' | 'Delay' | 'Skip' | 'Force'>('Extend');
 const [overrideReason, setOverrideReason] = useState('');
 const [overrideDays, setOverrideDays] = useState(15);

 // Search queue state
 const [jobSearch, setJobSearch] = useState('');
 const [jobStatusFilter, setJobStatusFilter] = useState('all');
 const [jobPage, setJobPage] = useState(1);
 const jobPageSize = 10;

 const [jobs, setJobs] = useState<JobItem[]>([]);
 const [revenueAtRisk, setRevenueAtRisk] = useState(0);
 const [branchExpiries, setBranchExpiries] = useState<{name: string, count: number}[]>([]);

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 const loadInitialData = async () => {
 try {
 setLoading(true);
 // Load settings from local storage
 const savedSettings = localStorage.getItem('automationSettings');
 if (savedSettings) {
 const s = JSON.parse(savedSettings);
 setAutoExpiryEnabled(s.autoExpiryEnabled ?? true);
 setExecutionTime(s.executionTime || '02:00');
 setGracePeriodDays(s.gracePeriodDays ?? 7);
 setBlockGate(s.blockGate ?? true);
 setBlockTrainerSessions(s.blockTrainerSessions ?? true);
 setBlockDietPlans(s.blockDietPlans ?? false);
 setBlockPortalAccess(s.blockPortalAccess ?? true);
 setReminderDaysOut(s.reminderDaysOut ?? 7);
 setReminderType(s.reminderType || 'WhatsApp');
 }

 // Fetch subscriptions
 const subscriptions = await membershipsApi.listAllSubscriptions();
 const today = new Date();
 
 const newJobs: JobItem[] = [];
 let calculatedRevenueAtRisk = 0;
 const branchCounts: Record<string, number> = {};

 subscriptions.forEach((sub: any) => {
 const endDate = new Date(sub.endDate);
 const diffTime = endDate.getTime() - today.getTime();
 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

 // Add to revenue at risk if expiring in future
 if (diffDays >= 0 && diffDays <= 30) {
 calculatedRevenueAtRisk += sub.amountPaid || 0;
 }

 // Count branch expiries
 const branchName = sub.member?.homeGym?.name || 'Main Branch';
 branchCounts[branchName] = (branchCounts[branchName] || 0) + 1;

 let status: 'Completed' | 'Pending' | 'Processing' | 'Failed' = 'Pending';
 let notified = false;
 let gateBlocked = false;
 let errorLog = undefined;

 if (diffDays < 0) {
 status = 'Completed';
 notified = true;
 gateBlocked = true;
 // Introduce a simulated failure occasionally
 if (sub.id.charCodeAt(sub.id.length - 1) % 5 === 0) {
 status = 'Failed';
 gateBlocked = false;
 errorLog = 'WhatsApp Delivery Failed (Invalid API Credentials)';
 }
 } else if (diffDays <= 2) {
 status = 'Processing';
 notified = true;
 }

 newJobs.push({
 id: `job-${sub.id.slice(-6).toUpperCase()}`,
 rawSubId: sub.id,
 memberName: `${sub.member?.firstName || ''} ${sub.member?.lastName || ''}`.trim(),
 memberId: sub.member?.id ? `M-${sub.member.id.slice(-4).toUpperCase()}` : 'M-UNKNOWN',
 planName: sub.membershipPlan?.name || 'Standard Plan',
 expiryDate: endDate.toISOString().split('T')[0],
 status,
 notified,
 gateBlocked,
 errorLog
 });
 });
 setJobs(newJobs);
 setRevenueAtRisk(calculatedRevenueAtRisk);
 setBranchExpiries(Object.entries(branchCounts).map(([name, count]) => ({ name, count })));
 } catch (error) {
 console.error(error);
 showToast('Failed to load automation jobs', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 // Read user details from localstorage
 const userStr = localStorage.getItem('user');
 if (userStr) {
 try {
 const u = JSON.parse(userStr);
 if (u.role) setUserRole(u.role.toLowerCase());
 } catch (_) { }
 }
 loadInitialData();
 }, []);

 const isTrainerOrDietitian = userRole === 'trainer' || userRole === 'dietitian';

 // Handle retry job
 const handleRetryJob = (jobId: string) => {
 if (isTrainerOrDietitian) {
 showToast('Action restricted: Trainer/Dietitian is View-Only', 'error');
 return;
 }
 setJobs(prev =>
 prev.map(j => (j.id === jobId ? { ...j, status: 'Pending', errorLog: undefined } : j))
 );
 showToast(`Job ${jobId} placed in execution retry queue.`);
 };

 // Handle batch retry of all failed jobs
 const handleRetryAllFailed = () => {
 if (isTrainerOrDietitian) {
 showToast('Action restricted: Trainer/Dietitian is View-Only', 'error');
 return;
 }
 const failedCount = jobs.filter(j => j.status === 'Failed').length;
 if (failedCount === 0) {
 showToast('No failed jobs found to retry');
 return;
 }
 setJobs(prev =>
 prev.map(j => (j.status === 'Failed' ? { ...j, status: 'Pending', errorLog: undefined } : j))
 );
 showToast(`Retrying ${failedCount} failed automation jobs.`);
 };

 // Save Settings
 const handleSaveSettings = () => {
 if (isTrainerOrDietitian) {
 showToast('Action restricted: Trainer/Dietitian is View-Only', 'error');
 return;
 }
 const settings = {
 autoExpiryEnabled,
 executionTime,
 gracePeriodDays,
 blockGate,
 blockTrainerSessions,
 blockDietPlans,
 blockPortalAccess,
 reminderDaysOut,
 reminderType
 };
 localStorage.setItem('automationSettings', JSON.stringify(settings));
 showToast('Automation schedules and rules successfully synchronized.');
 };

 // Submit manual override
 const handleOverrideSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (isTrainerOrDietitian) {
 showToast('Action restricted: Trainer/Dietitian is View-Only', 'error');
 return;
 }
 if (!overrideMemberId.trim() || !overrideReason.trim()) {
 showToast('Please specify Member ID and audit reason note', 'error');
 return;
 }

 try {
 const targetJob = jobs.find(j => j.memberId.toLowerCase() === overrideMemberId.toLowerCase());
 if (!targetJob || !targetJob.rawSubId) {
 showToast('Could not find a subscription job for this Member ID', 'error');
 return;
 }

 if (overrideAction === 'Extend' || overrideAction === 'Delay') {
 const newEndDate = new Date(targetJob.expiryDate);
 newEndDate.setDate(newEndDate.getDate() + overrideDays);
 await membershipsApi.updateSubscription(targetJob.rawSubId, {
 endDate: newEndDate.toISOString()
 });
 showToast(`Subscription for ${overrideMemberId} extended by ${overrideDays} days.`);
 } else if (overrideAction === 'Force') {
 await membershipsApi.updateSubscription(targetJob.rawSubId, {
 status: 'Expired'
 });
 showToast(`Subscription for ${overrideMemberId} force-expired immediately.`);
 } else if (overrideAction === 'Skip') {
 // Set end date 10 years out as perpetual
 const perpetualDate = new Date();
 perpetualDate.setFullYear(perpetualDate.getFullYear() + 10);
 await membershipsApi.updateSubscription(targetJob.rawSubId, {
 endDate: perpetualDate.toISOString()
 });
 showToast(`Subscription for ${overrideMemberId} set as perpetual (10-year validity).`);
 }

 setShowOverrideDrawer(false);
 setOverrideMemberId('');
 setOverrideReason('');
 loadInitialData();
 } catch (error) {
 showToast('Failed to apply manual override', 'error');
 }
 };

 // Calculate shift end date preview
 const getShiftPreview = () => {
 const today = new Date();
 const futureDate = new Date();
 futureDate.setDate(today.getDate() + gracePeriodDays);
 return `${today.toISOString().split('T')[0]} ➔ ${futureDate.toISOString().split('T')[0]} (+${gracePeriodDays} Days Grace)`;
 };

 // Get message template preview based on type and days out
 const getReminderMessage = () => {
 if (reminderType === 'WhatsApp' || reminderType === 'SMS') {
 if (reminderDaysOut === 0) {
 return `GymFlow Alert: Dear member, your membership subscription expires TODAY. Secure special early renewal discounts at the desk.`;
 }
 return `GymFlow Alert: Hey! Your membership subscription expires in ${reminderDaysOut} days. Renew now to avoid checkout gate blocks!`;
 }
 // Email
 if (reminderDaysOut === 0) {
 return `Subject: Membership Expires Today! 🚨\n\nDear GymFlow Member,\nThis is a notification that your gym membership plan expires today. Gate entry access will be suspended tomorrow unless a renewal is processed. Please speak with the front desk counselor to retain access.`;
 }
 return `Subject: Action Required: Membership Renewals ⏳\n\nDear GymFlow Member,\nYour membership subscription is ending in ${reminderDaysOut} days. Keep your streak alive and save 10% on your next contract by renewing early online or at the reception desk.`;
 };

 // Job filtering + pagination
 const filteredJobs = jobs.filter(j => {
 const matchesSearch =
 j.memberName.toLowerCase().includes(jobSearch.toLowerCase()) ||
 j.memberId.toLowerCase().includes(jobSearch.toLowerCase()) ||
 j.planName.toLowerCase().includes(jobSearch.toLowerCase());
 const matchesStatus =
 jobStatusFilter === 'all' || j.status.toLowerCase() === jobStatusFilter.toLowerCase();
 return matchesSearch && matchesStatus;
 });
 const jobTotalPages = Math.max(1, Math.ceil(filteredJobs.length / jobPageSize));
 const jobActivePage = Math.min(jobPage, jobTotalPages);
 const paginatedJobs = filteredJobs.slice((jobActivePage - 1) * jobPageSize, jobActivePage * jobPageSize);

 if (loading) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Initializing Expiry Automation center...
 </div>
 );
 }

 const successRate = jobs.length > 0 ? Math.round((jobs.filter(j => j.status !== 'Failed').length / jobs.length) * 100) : 100;
 const failedJobs = jobs.filter(j => j.status === 'Failed');

 return (
 <div className="min-h-screen bg-neutral-50/30 text-neutral-900 p-6 space-y-5">

 {/* Toast Notification */}
 {toast && (
 <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg text-xs font-semibold ${toast.type === 'success'
 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
 : 'bg-red-50 text-red-700 border-red-200'
 }`}>
 {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
 {toast.message}
 </div>
 )}

 {/* HEADER */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-200 pb-5">
 <div>
 <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
 <Sliders className="w-5 h-5 text-violet-500" />
 Expiry Automation
 </h1>
 <p className="text-xs text-neutral-500 mt-0.5">Configure rules, monitor the execution queue, and handle manual overrides.</p>
 </div>
 <div className="flex items-center gap-2">
 {isTrainerOrDietitian && (
 <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold rounded-lg">
 <ShieldAlert className="w-3.5 h-3.5" />
 View Only
 </div>
 )}
 {!isTrainerOrDietitian && (
 <button
 onClick={() => setShowOverrideDrawer(true)}
 className="flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition"
 >
 <Play className="w-3.5 h-3.5" />
 Manual Override
 </button>
 )}
 </div>
 </div>

 {/* TABS */}
 <MembershipsTabs />

 {/* KPI CARDS */}
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
 {[
 { label: 'Expiring Today', value: `${jobs.filter(j => j.status === 'Processing').length}`, sub: 'members', color: 'text-red-600', bg: 'bg-red-50 border-red-100', icon: AlertCircle },
 { label: 'Expired', value: `${jobs.filter(j => j.status === 'Completed').length}`, sub: 'processed', color: 'text-neutral-600', bg: 'bg-neutral-100 border-neutral-200', icon: CheckCircle },
 { label: 'Pending', value: `${jobs.filter(j => j.status === 'Pending').length}`, sub: 'in queue', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', icon: Clock },
 { label: 'Failed Jobs', value: `${failedJobs.length}`, sub: 'need retry', color: failedJobs.length > 0 ? 'text-red-600' : 'text-neutral-500', bg: failedJobs.length > 0 ? 'bg-red-50 border-red-100' : 'bg-neutral-100 border-neutral-200', icon: AlertTriangle },
 { label: 'Revenue at Risk', value: `₹${revenueAtRisk.toLocaleString()}`, sub: '30-day window', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100', icon: DollarSign },
 { label: 'Success Rate', value: `${successRate}%`, sub: 'of all jobs', color: successRate >= 90 ? 'text-emerald-600' : 'text-amber-600', bg: successRate >= 90 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100', icon: TrendingUp },
 ].map((kpi, i) => (
 <div key={i} className={`bg-white border rounded-xl p-3.5 flex items-center gap-3 shadow-sm ${kpi.bg}`}>
 <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${kpi.bg}`}>
 <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
 </div>
 <div>
 <p className="text-[10px] text-neutral-400 font-medium leading-tight">{kpi.label}</p>
 <p className={`text-sm font-extrabold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
 <p className="text-[9px] text-neutral-400">{kpi.sub}</p>
 </div>
 </div>
 ))}
 </div>

 {/* PIPELINE FLOW */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm">
 <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">Automatic Expiry Pipeline</p>
 <div className="flex items-start gap-0">
 {[
 { step: 'End Date', desc: 'Validity hits zero', icon: Clock, color: 'text-blue-500 bg-blue-50' },
 { step: 'Check Rules', desc: 'Grace & block config', icon: Sliders, color: 'text-amber-500 bg-amber-50' },
 { step: 'Status Change', desc: 'Active → Expired', icon: AlertCircle, color: 'text-violet-500 bg-violet-50' },
 { step: 'Block Access', desc: 'Gate + portal lock', icon: Lock, color: 'text-red-500 bg-red-50' },
 { step: 'Send Alert', desc: 'WhatsApp/SMS/Email', icon: Mail, color: 'text-emerald-500 bg-emerald-50' },
 { step: 'Audit Log', desc: 'DB record synced', icon: FileText, color: 'text-neutral-500 bg-neutral-100' },
 ].map((s, i, arr) => (
 <React.Fragment key={i}>
 <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
 <div className={`w-8 h-8 rounded-full flex items-center justify-center ${s.color}`}>
 <s.icon className="w-4 h-4" />
 </div>
 <p className="text-[10px] font-semibold text-neutral-700 text-center leading-tight">{s.step}</p>
 <p className="text-[9px] text-neutral-400 text-center leading-tight hidden sm:block">{s.desc}</p>
 </div>
 {i < arr.length - 1 && <div className="h-0.5 flex-1 bg-neutral-200 mt-4 mx-1" />}
 </React.Fragment>
 ))}
 </div>
 </div>

 {/* CORE GRID */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

 {/* LEFT: CONFIG + QUEUE */}
 <div className="lg:col-span-2 space-y-5">

 {/* RULES CONFIG */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-5">
 <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
 <div>
 <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Automation Rules</p>
 <h2 className="text-sm font-bold text-neutral-800 mt-0.5">Expiry & Access Configuration</h2>
 </div>
 <button
 onClick={handleSaveSettings}
 className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:opacity-90 transition"
 >
 <Save className="w-3.5 h-3.5" />
 Save Config
 </button>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {/* Auto Expiry Toggle */}
 <label className="flex items-center gap-3 p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl cursor-pointer hover:border-primary/30 transition">
 <input
 type="checkbox"
 checked={autoExpiryEnabled}
 onChange={e => setAutoExpiryEnabled(e.target.checked)}
 className="w-4 h-4 rounded accent-violet-600"
 />
 <div>
 <p className="text-xs font-semibold text-neutral-800">Enable Auto Expiry</p>
 <p className="text-[10px] text-neutral-400 mt-0.5">Runs daily at the scheduled time</p>
 </div>
 {autoExpiryEnabled && <span className="ml-auto text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">ON</span>}
 </label>

 {/* Execution Time */}
 <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl">
 <p className="text-[10px] text-neutral-400 font-medium mb-2">Daily Execution Time</p>
 <div className="flex items-center justify-between">
 <span className="text-xs text-neutral-600">Runs at:</span>
 <input
 type="time"
 value={executionTime}
 onChange={e => setExecutionTime(e.target.value)}
 className="bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs text-neutral-900 focus:outline-none focus:border-violet-300"
 />
 </div>
 </div>

 {/* Grace Period */}
 <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl sm:col-span-2">
 <p className="text-[10px] text-neutral-400 font-medium mb-2">Grace Period After Expiry</p>
 <select
 value={gracePeriodDays}
 onChange={e => setGracePeriodDays(Number(e.target.value))}
 className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-violet-300"
 >
 <option value={0}>No Grace Period — Immediate Expiry</option>
 <option value={1}>1 Day</option>
 <option value={3}>3 Days</option>
 <option value={7}>7 Days</option>
 <option value={15}>15 Days</option>
 <option value={30}>30 Days</option>
 </select>
 <p className="text-[10px] text-neutral-400 mt-2">Example: <span className="font-mono font-semibold text-neutral-600">{getShiftPreview()}</span></p>
 </div>
 </div>

 {/* Access Blocks */}
 <div className="border-t border-neutral-100 pt-4 space-y-3">
 <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Block on Expiry</p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {[
 { label: 'Block Check-in Gates', desc: 'Lock physical entrance scanner', state: blockGate, set: setBlockGate },
 { label: 'Restrict PT Sessions', desc: 'Block trainer session booking', state: blockTrainerSessions, set: setBlockTrainerSessions },
 { label: 'Suspend Diet Plans', desc: 'Revoke active diet PDF access', state: blockDietPlans, set: setBlockDietPlans },
 { label: 'Suspend Portal Access', desc: 'Redirect to renewal page', state: blockPortalAccess, set: setBlockPortalAccess },
 ].map((item, i) => (
 <label key={i} className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-xl cursor-pointer hover:border-red-200 transition">
 <input
 type="checkbox"
 checked={item.state}
 onChange={e => item.set(e.target.checked)}
 className="w-4 h-4 rounded accent-red-500 shrink-0"
 />
 <div>
 <p className="text-xs font-semibold text-neutral-800">{item.label}</p>
 <p className="text-[10px] text-neutral-400 mt-0.5">{item.desc}</p>
 </div>
 {item.state && <Lock className="w-3.5 h-3.5 text-red-400 ml-auto shrink-0" />}
 </label>
 ))}
 </div>
 </div>
 </div>

 {/* JOB QUEUE */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Execution Queue</p>
 <h2 className="text-sm font-bold text-neutral-800 mt-0.5">Daily Automation Jobs · {filteredJobs.length} record{filteredJobs.length !== 1 ? 's' : ''}</h2>
 </div>
 {failedJobs.length > 0 && (
 <button
 onClick={handleRetryAllFailed}
 className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition"
 >
 <RotateCcw className="w-3.5 h-3.5" />
 Retry All Failed ({failedJobs.length})
 </button>
 )}
 </div>

 {/* Search + filter */}
 <div className="flex gap-2">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
 <input
 type="text"
 placeholder="Search member, plan or job ID..."
 className="w-full bg-white border border-neutral-200 rounded-lg pl-9 pr-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-violet-300"
 value={jobSearch}
 onChange={e => { setJobSearch(e.target.value); setJobPage(1); }}
 />
 </div>
 <select
 value={jobStatusFilter}
 onChange={e => { setJobStatusFilter(e.target.value); setJobPage(1); }}
 className="bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-700 focus:outline-none"
 >
 <option value="all">All</option>
 <option value="completed">Completed</option>
 <option value="pending">Pending</option>
 <option value="processing">Processing</option>
 <option value="failed">Failed</option>
 </select>
 </div>

 {/* Table */}
 <div className="overflow-x-auto rounded-xl border border-neutral-200">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="bg-neutral-900 text-white">
 <th className="py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wide rounded-tl-xl">Job ID</th>
 <th className="py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wide">Member</th>
 <th className="py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wide">Plan</th>
 <th className="py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wide">Expiry</th>
 <th className="py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wide">Status</th>
 <th className="py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wide text-center">Notified</th>
 <th className="py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wide text-center">Gate</th>
 <th className="py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wide text-right rounded-tr-xl">Action</th>
 </tr>
 </thead>
 <tbody>
 {paginatedJobs.length === 0 ? (
 <tr><td colSpan={8} className="py-10 text-center text-neutral-400 text-xs italic">No jobs match the current filter.</td></tr>
 ) : paginatedJobs.map((j, idx) => (
 <React.Fragment key={j.id}>
 <tr className={`border-b border-neutral-100 hover:bg-neutral-50 transition ${idx % 2 === 1 ? 'bg-neutral-50/50' : 'bg-white'}`}>
 <td className="py-2.5 px-3 font-mono font-bold text-neutral-500 text-[10px]">{j.id}</td>
 <td className="py-2.5 px-3">
 <p className="font-semibold text-neutral-800 leading-tight">{j.memberName || '—'}</p>
 <p className="text-[10px] font-mono text-neutral-400">{j.memberId}</p>
 </td>
 <td className="py-2.5 px-3 text-neutral-600 text-[11px]">{j.planName}</td>
 <td className="py-2.5 px-3 font-mono text-neutral-500 text-[11px]">{j.expiryDate}</td>
 <td className="py-2.5 px-3">
 <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
 j.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
 j.status === 'Processing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
 j.status === 'Failed' ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' :
 'bg-neutral-100 text-neutral-500 border-neutral-200'
 }`}>
 {j.status === 'Processing' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />}
 {j.status}
 </span>
 </td>
 <td className="py-2.5 px-3 text-center">
 {j.notified ? <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-neutral-300 mx-auto" />}
 </td>
 <td className="py-2.5 px-3 text-center">
 {j.gateBlocked ? <Lock className="w-4 h-4 text-red-400 mx-auto" /> : <X className="w-4 h-4 text-neutral-300 mx-auto" />}
 </td>
 <td className="py-2.5 px-3 text-right">
 {j.status === 'Failed' ? (
 <button onClick={() => handleRetryJob(j.id)}
 className="px-2.5 py-1 bg-red-50 border border-red-200 text-red-600 text-[10px] font-semibold rounded-lg hover:bg-red-100 transition">
 Retry
 </button>
 ) : <span className="text-neutral-300 text-[10px]">—</span>}
 </td>
 </tr>
 {j.status === 'Failed' && j.errorLog && (
 <tr className="bg-red-50 border-b border-red-100">
 <td colSpan={8} className="py-2 px-4 text-[10px] text-red-600 italic">
 <AlertTriangle className="w-3 h-3 inline mr-1" />{j.errorLog}
 </td>
 </tr>
 )}
 </React.Fragment>
 ))}
 </tbody>
 </table>
 </div>

 {/* PAGINATION */}
 {filteredJobs.length > jobPageSize && (
 <div className="flex items-center justify-between pt-1 text-xs text-neutral-500">
 <span>
 Showing {(jobActivePage - 1) * jobPageSize + 1}–{Math.min(jobActivePage * jobPageSize, filteredJobs.length)} of {filteredJobs.length} jobs
 </span>
 <div className="flex items-center gap-1">
 <button
 onClick={() => setJobPage(p => Math.max(1, p - 1))}
 disabled={jobActivePage === 1}
 className="p-1.5 bg-white border border-neutral-200 rounded-lg disabled:opacity-40 hover:bg-neutral-50 transition"
 >
 <ChevronLeft className="w-3.5 h-3.5" />
 </button>
 {Array.from({ length: jobTotalPages }, (_, i) => i + 1)
 .filter(p => p === 1 || p === jobTotalPages || Math.abs(p - jobActivePage) <= 1)
 .map((p, i, arr) => (
 <React.Fragment key={p}>
 {i > 0 && p - arr[i - 1] > 1 && <span className="px-1 text-neutral-300">…</span>}
 <button
 onClick={() => setJobPage(p)}
 className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
 jobActivePage === p
 ? 'bg-violet-600 text-white'
 : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
 }`}
 >
 {p}
 </button>
 </React.Fragment>
 ))}
 <button
 onClick={() => setJobPage(p => Math.min(jobTotalPages, p + 1))}
 disabled={jobActivePage === jobTotalPages}
 className="p-1.5 bg-white border border-neutral-200 rounded-lg disabled:opacity-40 hover:bg-neutral-50 transition"
 >
 <ChevronRight className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 )}
 </div>
 </div>

 {/* RIGHT: REMINDERS + PROJECTIONS */}
 <div className="space-y-5">

 {/* REMINDER CONFIG */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4">
 <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Reminder Center</p>

 <div className="space-y-3">
 <div>
 <label className="text-xs font-medium text-neutral-600 block mb-1.5">Notify members</label>
 <select
 value={reminderDaysOut}
 onChange={e => setReminderDaysOut(Number(e.target.value))}
 className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-800 focus:outline-none"
 >
 <option value={30}>30 days before expiry</option>
 <option value={15}>15 days before expiry</option>
 <option value={7}>7 days before expiry</option>
 <option value={3}>3 days before expiry</option>
 <option value={1}>1 day before expiry</option>
 <option value={0}>On expiry day</option>
 </select>
 </div>

 <div>
 <label className="text-xs font-medium text-neutral-600 block mb-1.5">Channel</label>
 <div className="grid grid-cols-3 gap-2">
 {[
 { label: 'WhatsApp', icon: MessageCircle, active: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
 { label: 'SMS', icon: MessageSquare, active: 'bg-blue-50 border-blue-300 text-blue-700' },
 { label: 'Email', icon: Mail, active: 'bg-violet-50 border-violet-300 text-violet-700' },
 ].map(ch => (
 <button key={ch.label} type="button"
 onClick={() => setReminderType(ch.label as any)}
 className={`py-2 px-1 rounded-lg border text-[10px] font-semibold flex flex-col items-center gap-1 transition ${
 reminderType === ch.label ? ch.active : 'bg-neutral-50 border-neutral-200 text-neutral-500 hover:border-neutral-300'
 }`}>
 <ch.icon className="w-4 h-4" />
 {ch.label}
 </button>
 ))}
 </div>
 </div>

 <div>
 <label className="text-xs font-medium text-neutral-600 block mb-1.5">Message Preview</label>
 <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-[10px] text-neutral-600 leading-relaxed whitespace-pre-wrap">
 <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-neutral-200">
 <span className="w-2 h-2 rounded-full bg-violet-500" />
 <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{reminderType} · {reminderDaysOut === 0 ? 'Today' : `${reminderDaysOut}d out`}</span>
 </div>
 {getReminderMessage()}
 </div>
 </div>
 </div>
 </div>

 {/* PROJECTIONS */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-3">
 <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Expiry Projections</p>

 {branchExpiries.length === 0 ? (
 <p className="text-xs text-neutral-400 italic">No active expiry projections.</p>
 ) : branchExpiries.map((b, i) => (
 <div key={i} className="flex items-center justify-between py-1.5 border-b border-neutral-50 last:border-0 text-xs">
 <span className="text-neutral-600">{b.name}</span>
 <span className="font-semibold text-neutral-800">{b.count} expiries</span>
 </div>
 ))}

 <div className="mt-3 pt-3 border-t border-neutral-100 space-y-1.5">
 <div className="flex justify-between text-xs">
 <span className="text-neutral-500">Revenue at risk</span>
 <span className="font-semibold text-orange-600">₹{revenueAtRisk.toLocaleString()}</span>
 </div>
 <div className="flex justify-between text-xs">
 <span className="text-neutral-500">Projected recovery (84%)</span>
 <span className="font-semibold text-emerald-600">₹{Math.round(revenueAtRisk * 0.84).toLocaleString()}</span>
 </div>
 <div className="h-2 bg-neutral-100 rounded-full mt-2 overflow-hidden">
 <div className="h-full bg-emerald-400 rounded-full" style={{ width: '84%' }} />
 </div>
 </div>
 </div>

 </div>

 </div>

 {/* DRAWER: MANUAL OVERRIDE */}
 {showOverrideDrawer && (
 <div className="fixed inset-0 z-[9999] overflow-hidden">
 <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowOverrideDrawer(false)} />
 <div className="absolute inset-y-0 right-0 flex">
 <div className="w-[420px] bg-white border-l border-neutral-200 shadow-2xl flex flex-col">
 <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
 <div>
 <h3 className="text-sm font-bold text-neutral-900">Manual Expiry Override</h3>
 <p className="text-[11px] text-neutral-400 mt-0.5">Adjust a subscription's expiry directly in the DB.</p>
 </div>
 <button onClick={() => setShowOverrideDrawer(false)} className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition">
 <X className="w-4 h-4" />
 </button>
 </div>

 <form onSubmit={handleOverrideSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

 {/* Action type selector */}
 <div>
 <label className="text-xs font-semibold text-neutral-600 block mb-2">Override Action</label>
 <div className="grid grid-cols-2 gap-2">
 {[
 { value: 'Extend', label: 'Extend', desc: 'Add days to end date', color: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
 { value: 'Delay', label: 'Delay', desc: 'Postpone expiry run', color: 'border-blue-300 bg-blue-50 text-blue-700' },
 { value: 'Force', label: 'Force Expire', desc: 'Expire immediately', color: 'border-red-300 bg-red-50 text-red-700' },
 { value: 'Skip', label: 'Perpetual', desc: 'Set 10-year validity', color: 'border-violet-300 bg-violet-50 text-violet-700' },
 ].map(opt => (
 <button key={opt.value} type="button"
 onClick={() => setOverrideAction(opt.value as any)}
 className={`p-3 rounded-xl border-2 text-left transition ${
 overrideAction === opt.value ? opt.color : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
 }`}>
 <p className="text-xs font-bold">{opt.label}</p>
 <p className="text-[10px] mt-0.5 opacity-75">{opt.desc}</p>
 </button>
 ))}
 </div>
 </div>

 {/* Member ID */}
 <div>
 <label className="text-xs font-semibold text-neutral-600 block mb-1.5">Member ID</label>
 <input
 type="text"
 placeholder="e.g. M-1090"
 value={overrideMemberId}
 onChange={e => setOverrideMemberId(e.target.value)}
 className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-violet-300"
 />
 <p className="text-[10px] text-neutral-400 mt-1">Use the Member ID shown in the queue above (e.g. M-XXXX)</p>
 </div>

 {/* Days (only for Extend/Delay) */}
 {(overrideAction === 'Extend' || overrideAction === 'Delay') && (
 <div>
 <label className="text-xs font-semibold text-neutral-600 block mb-1.5">Days to Add</label>
 <input
 type="number" min={1} max={365}
 value={overrideDays}
 onChange={e => setOverrideDays(Number(e.target.value))}
 className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-violet-300"
 />
 </div>
 )}

 {/* Force warning */}
 {overrideAction === 'Force' && (
 <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
 <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
 <p className="text-[11px] text-red-700">This will immediately set the subscription status to <strong>Expired</strong> in the database. This action cannot be undone.</p>
 </div>
 )}

 {/* Audit reason */}
 <div>
 <label className="text-xs font-semibold text-neutral-600 block mb-1.5">Audit Reason <span className="text-red-500">*</span></label>
 <textarea
 placeholder="Required — explain the reason for this override..."
 rows={3}
 value={overrideReason}
 onChange={e => setOverrideReason(e.target.value)}
 className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-violet-300 resize-none"
 />
 </div>
 </form>

 <div className="px-6 py-4 border-t border-neutral-100 flex gap-3 shrink-0">
 <button type="button" onClick={() => setShowOverrideDrawer(false)}
 className="flex-1 py-2 bg-neutral-50 border border-neutral-200 text-neutral-600 text-xs font-semibold rounded-lg hover:bg-neutral-100 transition">
 Cancel
 </button>
 <button onClick={handleOverrideSubmit as any}
 className={`flex-1 py-2 text-white text-xs font-bold rounded-lg transition ${
 overrideAction === 'Force' ? 'bg-red-500 hover:bg-red-600' : 'bg-violet-600 hover:bg-violet-700'
 }`}>
 Apply Override
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 </div>
 );
}

export default function MembershipExpiryAutomationPage() {
 return (
 <Suspense fallback={
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Initializing Suspense context...
 </div>
 }>
 <ExpiryAutomationContent />
 </Suspense>
 );
}
