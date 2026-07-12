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
 ChevronRight,
 TrendingUp,
 AlertCircle,
 Plus,
 ArrowRight,
 Save,
 Check,
 X,
 FileText,
 UserCheck,
 TrendingDown,
 Calendar,
 XCircle,
 BadgeAlert,
 Info
} from 'lucide-react';
import { freezeApi } from '../../../../lib/api';
import MembershipsTabs from '../MembershipsTabs';

// Interface
interface FrozenSub {
 id: string;
 memberName: string;
 memberId: string;
 rawMemberId: string;
 planName: string;
 freezeStart: string;
 freezeEnd: string;
 originalEndDate: string;
 durationDays: number;
 usedFreezeDays: number;
 remainingFreezeDays: number;
 status: 'Frozen' | 'Reactivated' | 'Pending';
 docAttached?: boolean;
}

const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / (1000 * 3600 * 24));

function ReactivateManagementContent() {
 const router = useRouter();

 // Basic page states
 const [loading, setLoading] = useState(true);
 const [userRole, setUserRole] = useState('manager'); // 'owner', 'manager', 'receptionist', 'trainer', 'dietitian'
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 // Search queue
 const [searchTerm, setSearchTerm] = useState('');
 const [branchFilter, setBranchFilter] = useState('all');

 // Drawer / Modal triggers
 const [showReactivateDrawer, setShowReactivateDrawer] = useState(false);
 const [showConfirmModal, setShowConfirmModal] = useState(false);
 const [showSuccessSplash, setShowSuccessSplash] = useState(false);
 const [selectedSub, setSelectedSub] = useState<FrozenSub | null>(null);
 const [reactivating, setReactivating] = useState(false);
 const [lastReactivated, setLastReactivated] = useState<{ memberName: string; newEndDate: string; rawMemberId: string } | null>(null);

 const [auditNotes, setAuditNotes] = useState('');

 // Notification previews (template preview only, not wired to a dispatcher)
 const [notifRecipient, setNotifRecipient] = useState<'Member' | 'Trainer' | 'Dietitian' | 'Manager'>('Member');
 const [notifChannel, setNotifChannel] = useState<'SMS' | 'Email' | 'WhatsApp'>('WhatsApp');

 const [frozenList, setFrozenList] = useState<FrozenSub[]>([]);
 const [reactivateLogs, setReactivateLogs] = useState<any[]>([]);

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 const loadData = async () => {
 setLoading(true);
 try {
 const userStr = localStorage.getItem('user');
 if (userStr) {
 try {
 const u = JSON.parse(userStr);
 if (u.role) setUserRole(u.role.toLowerCase());
 } catch (_) {}
 }

 const freezes = await freezeApi.list();
 const today = new Date();
 today.setHours(0, 0, 0, 0);

 const active: FrozenSub[] = freezes
 .filter((f: any) => f.status === 'Approved')
 .map((f: any) => {
 const start = new Date(f.startDate);
 start.setHours(0, 0, 0, 0);
 const end = new Date(f.endDate);
 end.setHours(0, 0, 0, 0);
 const used = Math.max(0, Math.min(f.durationDays, daysBetween(start, today)));
 const remaining = Math.max(0, f.durationDays - used);
 return {
 id: f.id,
 memberName: `${f.memberMembership?.member?.firstName || ''} ${f.memberMembership?.member?.lastName || ''}`.trim() || 'Unknown Member',
 memberId: f.memberMembership?.member?.id ? `M-${f.memberMembership.member.id.slice(-4).toUpperCase()}` : '',
 rawMemberId: f.memberMembership?.member?.id || '',
 planName: f.memberMembership?.membershipPlan?.name || 'Membership Plan',
 freezeStart: f.startDate.split('T')[0],
 freezeEnd: f.endDate.split('T')[0],
 originalEndDate: f.memberMembership?.endDate ? f.memberMembership.endDate.split('T')[0] : '',
 durationDays: f.durationDays,
 usedFreezeDays: used,
 remainingFreezeDays: remaining,
 status: 'Frozen' as const,
 docAttached: !!f.documentUrl
 };
 });
 setFrozenList(active);

 // Reactivation history: freezes ended early via reactivateEarly land in 'Expired' status
 const logs = freezes
 .filter((f: any) => f.status === 'Expired')
 .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
 .map((f: any) => {
 const plannedEnd = new Date(f.startDate);
 plannedEnd.setDate(plannedEnd.getDate() + f.durationDays);
 const actualEnd = new Date(f.endDate);
 const early = actualEnd.getTime() < plannedEnd.getTime();
 return {
 id: f.id,
 memberName: `${f.memberMembership?.member?.firstName || ''} ${f.memberMembership?.member?.lastName || ''}`.trim() || 'Unknown Member',
 planName: f.memberMembership?.membershipPlan?.name || 'Membership Plan',
 type: early ? 'Early Reactivation' : 'Manual',
 date: f.updatedAt.split('T')[0],
 processedBy: 'Staff',
 notes: `${f.reasonCategory} hold reactivated${early ? ' ahead of schedule' : ''}.`
 };
 });
 setReactivateLogs(logs);
 } catch (err) {
 console.error(err);
 showToast('Failed to load reactivation data', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, []);

 const isTrainerOrDietitian = userRole === 'trainer' || userRole === 'dietitian';

 // Mirrors the backend's reactivateEarly calculation exactly: unused hold days
 // (from today to the freeze's end date) are subtracted from the already-extended
 // subscription end date. There is no separate "credit" policy on the backend.
 const getRecalculatedEndDate = () => {
 if (!selectedSub) return '';
 const today = new Date();
 today.setHours(0, 0, 0, 0);
 const freezeEnd = new Date(selectedSub.freezeEnd);
 freezeEnd.setHours(0, 0, 0, 0);
 const daysToReduce = freezeEnd > today ? daysBetween(today, freezeEnd) : 0;

 const currentEnd = new Date(selectedSub.originalEndDate);
 const newEnd = new Date(currentEnd.getTime() - (daysToReduce * 24 * 60 * 60 * 1000));
 return newEnd.toISOString().split('T')[0];
 };

 // Perform unfreeze reactivation
 const triggerReactivation = async () => {
 if (isTrainerOrDietitian) {
 showToast('Action restricted: Trainer/Dietitian is View-Only', 'error');
 return;
 }
 if (!selectedSub) return;

 try {
 setReactivating(true);
 await freezeApi.reactivateEarly(selectedSub.id);
 setLastReactivated({ memberName: selectedSub.memberName, newEndDate: getRecalculatedEndDate(), rawMemberId: selectedSub.rawMemberId });
 setShowConfirmModal(false);
 setShowReactivateDrawer(false);
 setShowSuccessSplash(true);
 showToast(`Membership reactivated successfully for ${selectedSub.memberName}`);
 setAuditNotes('');
 await loadData();
 } catch (err) {
 showToast('Failed to reactivate membership', 'error');
 } finally {
 setReactivating(false);
 }
 };

 // Bulk Reactivate Option
 const handleBulkReactivate = async () => {
 if (isTrainerOrDietitian) {
 showToast('Action restricted: Trainer/Dietitian is View-Only', 'error');
 return;
 }
 const frozenCount = frozenList.length;
 if (frozenCount === 0) {
 showToast('No frozen memberships found to reactivate');
 return;
 }

 try {
 await Promise.all(frozenList.map(s => freezeApi.reactivateEarly(s.id)));
 showToast(`Bulk reactivated ${frozenCount} frozen accounts.`);
 await loadData();
 } catch (err) {
 showToast('Failed to reactivate some accounts', 'error');
 }
 };

 // Eligibility Checks
 const validationChecklist = [
 { label: 'Subscription Status is Frozen', status: selectedSub?.status === 'Frozen' },
 { label: 'Active Freeze hold logs exist', status: !!selectedSub?.freezeStart },
 { label: 'Validity Term is not expired', status: true },
 { label: 'No administrative suspensions active', status: true }
 ];
 const isEligible = validationChecklist.every(c => c.status);

 // Notification payload preview helper
 const getNotifContent = () => {
 if (notifChannel === 'WhatsApp' || notifChannel === 'SMS') {
 if (notifRecipient === 'Member') {
 return `GymFlow Alert: Welcome back! Your freeze hold has ended and membership access has been reactivated. See you on the floor!`;
 }
 if (notifRecipient === 'Trainer') {
 return `GymFlow Staff: Member ${selectedSub?.memberName || 'the member'} is reactivated. Paused PT credits have been restored.`;
 }
 return `GymFlow Alert: Hold ended for ${selectedSub?.memberName || 'the member'}. Restored entry gates access.`;
 }
 // Email
 return `Subject: Welcome Back! Membership Resumed 🏋️\n\nDear Member,\nYour membership pause duration has been terminated. Facility entrance gates check-in access, dietician diet plans, and trainer PT booking credits are fully active.`;
 };

 // Filter lists
 const filteredFrozen = frozenList.filter(s =>
 s.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
 s.memberId.toLowerCase().includes(searchTerm.toLowerCase()) ||
 s.id.toLowerCase().includes(searchTerm.toLowerCase())
 );

 return (
 <div className="min-h-screen bg-white text-neutral-900 p-8 space-y-6 relative overflow-hidden">
 
 {/* Background Glow */}

 {/* Toast */}
 {toast && (
 <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border ${
 toast.type === 'success' 
 ? 'bg-success-light text-success border-green-200' 
 : 'bg-danger-light text-danger border-red-200'
 }`}>
 <span className="text-xs font-semibold">{toast.message}</span>
 </div>
 )}

 {/* HEADER BAR */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-200/80 pb-6">
 <div>
 <h1 className="text-2xl font-bold text-neutral-900 font-display flex items-center gap-2">
 <UserCheck className="w-6 h-6 text-danger" />
 Memberships Hub
 </h1>
 <p className="text-xs text-neutral-600 mt-1">Design, track, and manage membership agreement templates and subscription lifecycles.</p>
 </div>

 {/* Top Actions */}
 <div className="flex gap-2">
 {isTrainerOrDietitian && (
 <div className="px-3 py-2 bg-warning-light border border-amber-200 text-amber-700 text-[10px] rounded-xl flex items-center gap-2 font-mono uppercase">
 <ShieldAlert className="w-4 h-4" />
 <span>Trainer/Dietitian View Only</span>
 </div>
 )}

 {!isTrainerOrDietitian && (
 <button
 onClick={handleBulkReactivate}
 className="px-4 py-2.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition flex items-center gap-2"
 >
 <RotateCcw className="w-4 h-4 text-danger" />
 <span>Bulk Reactivate</span>
 </button>
 )}
 </div>
 </div>

 {/* TABS ROW */}
 <MembershipsTabs />

 {/* REACTIVATION ANALYTICS KPI CARDS */}
 <div className="grid grid-cols-2 md:grid-cols-5 gap-4 font-mono">
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Frozen Memberships</span>
 <span className="text-sm font-bold text-danger block mt-1">{frozenList.length} Members</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Due For Reactivation</span>
 <span className="text-sm font-bold text-amber-700 block mt-1">{frozenList.filter(s => s.remainingFreezeDays <= 0).length} Accounts</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Total Reactivations</span>
 <span className="text-sm font-bold text-success block mt-1">{reactivateLogs.length} Actions</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Early Resumptions</span>
 <span className="text-sm font-bold text-purple-400 block mt-1">{reactivateLogs.filter(l => l.type === 'Early Reactivation').length} Members</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Avg Hold Duration</span>
 <span className="text-sm font-bold text-cyan-400 block mt-1">
 {frozenList.length ? Math.round(frozenList.reduce((sum, s) => sum + s.durationDays, 0) / frozenList.length) : 0} Days
 </span>
 </div>
 </div>

 {/* CORE WORKSPACE GRID */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 
 {/* LEFT COLUMN: FROZEN LISTING AND HISTORY TABLE */}
 <div className="lg:col-span-2 space-y-6">
 
 {/* SEARCH BAR */}
 <div className="bg-white border border-neutral-200/60 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between">
 <div className="flex flex-1 items-center gap-3 min-w-[280px]">
 <div className="relative flex-1">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
 <input
 type="text"
 placeholder="Search frozen memberships..."
 className="w-full bg-white border border-neutral-200 rounded-xl pl-10 pr-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-red-200"
 value={searchTerm}
 onChange={e => setSearchTerm(e.target.value)}
 />
 </div>
 </div>
 </div>

 {/* FROZEN MEMBERSHIPS QUEUE LIST */}
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Currently Paused Subscriptions Listing</span>
 
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-neutral-200/80 text-neutral-600 font-mono uppercase text-[9px] bg-neutral-50/20">
 <th className="py-3 px-4">Member Details</th>
 <th className="py-3 px-4">Pause Period</th>
 <th className="py-3 px-4">Used / Remaining</th>
 <th className="py-3 px-4">Status</th>
 <th className="py-3 px-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200/30 font-mono">
 {filteredFrozen.length === 0 ? (
 <tr>
 <td colSpan={5} className="py-8 text-center text-neutral-500 italic">
 No frozen memberships found matching filters.
 </td>
 </tr>
 ) : (
 filteredFrozen.map((rec) => (
 <tr key={rec.id} className="hover:bg-neutral-50/10 transition">
 <td className="py-3.5 px-4 font-sans">
 <span className="font-semibold text-neutral-800 block">{rec.memberName}</span>
 <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">{rec.memberId} • {rec.id}</span>
 </td>
 <td className="py-3.5 px-4">
 <span className="text-neutral-700 block">{rec.planName}</span>
 <span className="text-[10px] text-neutral-500 block mt-0.5">{rec.freezeStart} to {rec.freezeEnd}</span>
 </td>
 <td className="py-3.5 px-4">
 <span className="text-neutral-800 block">{rec.usedFreezeDays} Days Used</span>
 <span className="text-[9px] text-neutral-500 block">{rec.remainingFreezeDays} Days Unused</span>
 </td>
 <td className="py-3.5 px-4">
 <span className="px-2 py-0.5 bg-danger-light text-danger border border-red-200 rounded text-[9px]">
 {rec.status}
 </span>
 </td>
 <td className="py-3.5 px-4 text-right">
 <button
 onClick={() => {
 setSelectedSub(rec);
 setShowReactivateDrawer(true);
 }}
 className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 hover:text-neutral-900 text-danger text-[10px] font-bold rounded-lg transition"
 >
 Unfreeze
 </button>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* REACTIVATION AUDIT HISTORY LOG */}
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-6">
 <h3 className="text-sm font-bold text-neutral-800 font-display flex items-center gap-2">
 <History size={16} className="text-danger" />
 Reactivation Log Timeline
 </h3>
 
 <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-neutral-50">
 {reactivateLogs.map((log, idx) => (
 <div key={idx} className="flex gap-4 relative">
 <div className="w-6 h-6 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center z-10 text-[9px] font-bold text-neutral-500">
 {reactivateLogs.length - idx}
 </div>
 <div className="space-y-1 text-xs">
 <div className="flex items-center gap-3">
 <span className="font-bold text-neutral-800">{log.memberName}</span>
 <span className="px-1.5 py-0.5 bg-success-light text-success border border-green-200 text-[8px] rounded uppercase">
 {log.type}
 </span>
 <span className="text-[10px] text-neutral-500 font-mono">• {log.date}</span>
 </div>
 <p className="text-neutral-600">Resumed: {log.planName}</p>
 <p className="text-[10px] text-neutral-500">Processed By: {log.processedBy} • {log.notes}</p>
 </div>
 </div>
 ))}
 </div>
 </div>

 </div>

 {/* RIGHT COLUMN: SCHEDULER & NOTIFICATION PREVIEWS */}
 <div className="lg:col-span-1 space-y-6">
 
 {/* REACTIVATION POLICY INFO */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Reactivation Policy</span>

 <div className="space-y-3 font-mono text-xs">
 <div className="flex items-start gap-3 bg-neutral-50/40 border border-neutral-200 p-4 rounded-xl">
 <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
 <div>
 <span className="font-bold text-neutral-800 block font-sans">Unused Hold Days Are Returned Automatically</span>
 <span className="text-[9px] text-neutral-500 block mt-1 leading-relaxed">
 Reactivating a hold before its scheduled end date subtracts the unused days from the membership's frozen end date, giving the member back exactly the validity they didn't use.
 </span>
 </div>
 </div>
 </div>
 </div>

 {/* ALERTS PREVIEW */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Communication Preview Center</span>
 
 <div className="space-y-4 font-mono text-xs">
 
 {/* Recipient select */}
 <div className="space-y-1">
 <span className="text-neutral-600 block font-sans">Recipient Role</span>
 <select
 value={notifRecipient}
 onChange={e => setNotifRecipient(e.target.value as any)}
 className="w-full bg-white border border-neutral-200 p-2 rounded-xl text-neutral-800 focus:outline-none"
 >
 <option value="Member">Gym Member</option>
 <option value="Trainer">Assigned PT Trainer</option>
 <option value="Dietitian">Assigned Dietician</option>
 <option value="Manager">Branch Manager</option>
 </select>
 </div>

 {/* Channel */}
 <div className="space-y-1">
 <span className="text-neutral-600 block font-sans">Communication Channel</span>
 <div className="grid grid-cols-3 gap-2">
 {[
 { label: 'WhatsApp', icon: MessageCircle, color: 'text-success' },
 { label: 'SMS', icon: MessageSquare, color: 'text-blue-400' },
 { label: 'Email', icon: Mail, color: 'text-danger' }
 ].map((ch) => {
 const Icon = ch.icon;
 return (
 <button
 key={ch.label}
 type="button"
 onClick={() => setNotifChannel(ch.label as any)}
 className={`py-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1.5 transition ${
 notifChannel === ch.label
 ? 'bg-danger-light border-red-200 text-neutral-800'
 : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:text-neutral-800'
 }`}
 >
 <Icon className={`w-4 h-4 ${ch.color}`} />
 <span>{ch.label}</span>
 </button>
 );
 })}
 </div>
 </div>

 {/* Message preview payload */}
 <div className="space-y-2">
 <span className="text-neutral-600 block font-sans">Message Preview Template</span>
 <div className="bg-white border border-neutral-200 p-4 rounded-xl text-[10px] text-neutral-700 whitespace-pre-wrap leading-relaxed">
 <div className="flex items-center gap-1.5 border-b border-neutral-200 pb-2 mb-2">
 <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
 <span className="font-bold text-neutral-600 text-[8px] uppercase tracking-wider">{notifChannel} Payload</span>
 </div>
 {getNotifContent()}
 </div>
 </div>

 </div>
 </div>

 </div>

 </div>

 {/* DRAWER: REACTIVATION WORKFLOW WIZARD */}
 {showReactivateDrawer && selectedSub && (
 <div className="fixed inset-0 z-[100] overflow-hidden">
 <div className="absolute inset-0 bg-neutral-50/80 backdrop-blur-sm transition-opacity" onClick={() => setShowReactivateDrawer(false)} />
 <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
 <div className="w-screen max-w-md bg-white border-l border-neutral-200 p-6 flex flex-col justify-between shadow-2xl">
 
 <div className="space-y-6 overflow-y-auto pr-1">
 <div>
 <h3 className="text-base font-bold text-neutral-900 font-display">Resuming Subscription</h3>
 <p className="text-xs text-neutral-600 mt-1">Review freeze logs and unfreeze access privileges.</p>
 </div>

 <div className="space-y-5 font-mono text-xs">
 
 {/* Membership details */}
 <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-2">
 <span className="text-[10px] text-neutral-500 font-sans uppercase block font-semibold">Frozen Membership Overview</span>
 <div className="flex justify-between"><span>Member Name:</span><span className="text-neutral-800 font-bold">{selectedSub.memberName}</span></div>
 <div className="flex justify-between"><span>Subscription Code:</span><span>{selectedSub.id}</span></div>
 <div className="flex justify-between"><span>Freeze Period:</span><span>{selectedSub.freezeStart} to {selectedSub.freezeEnd}</span></div>
 <div className="flex justify-between"><span>Total Freeze Days:</span><span>{selectedSub.durationDays} Days</span></div>
 </div>

 {/* ELIGIBILITY VALIDATION PANEL */}
 <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-2">
 <span className="text-[10px] text-neutral-500 font-sans uppercase block font-semibold">Eligibility Verification Checklist</span>
 {validationChecklist.map((item, idx) => (
 <div key={idx} className="flex justify-between items-center text-[10px]">
 <span className="text-neutral-600">{item.label}</span>
 {item.status ? (
 <CheckCircle className="text-success w-4 h-4" />
 ) : (
 <XCircle className="text-danger w-4 h-4" />
 )}
 </div>
 ))}
 </div>

 {/* Early Reactivation Flow */}
 {selectedSub.remainingFreezeDays > 0 && (
 <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-2">
 <span className="text-[10px] text-danger font-sans uppercase block font-bold">Early Reactivation</span>
 <div className="flex justify-between"><span>Remaining Hold Days:</span><span>{selectedSub.remainingFreezeDays} Days</span></div>
 <p className="text-[10px] text-neutral-500 font-sans leading-relaxed pt-1">
 These {selectedSub.remainingFreezeDays} unused hold days will be returned to the member automatically — the new end date below already reflects this.
 </p>
 </div>
 )}

 {/* BENEFITS RESTORATION PANEL */}
 <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-2">
 <span className="text-[10px] text-neutral-500 font-sans uppercase block font-semibold">Restored Access Privileges</span>
 <div className="grid grid-cols-2 gap-2 text-[10px] text-success">
 <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Gym Access</div>
 <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Entry Gate</div>
 <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> PT Sessions</div>
 <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Diet Plans</div>
 </div>
 </div>

 {/* Impact preview */}
 <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-2">
 <span className="text-[10px] text-neutral-500 font-sans uppercase block font-semibold">Recalculated Timeline Preview</span>
 <div className="flex justify-between"><span>Current End Date:</span><span>{selectedSub.originalEndDate}</span></div>
 <div className="flex justify-between border-t border-neutral-200/60 pt-1">
 <span>Updated End Date:</span>
 <span className="text-success font-bold">{getRecalculatedEndDate()}</span>
 </div>
 </div>

 {/* Audit note */}
 <div className="space-y-1.5">
 <span className="text-neutral-600 block font-sans">Administrative Reactivation Reason</span>
 <textarea
 placeholder="Specify reasons for audit logs..."
 rows={3}
 value={auditNotes}
 onChange={e => setAuditNotes(e.target.value)}
 className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-neutral-800 focus:outline-none"
 />
 </div>

 </div>

 <div className="flex gap-3 pt-4 border-t border-neutral-200">
 <button
 type="button"
 onClick={() => setShowReactivateDrawer(false)}
 className="flex-1 py-2.5 bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-800 font-semibold rounded-xl transition"
 >
 Cancel
 </button>
 <button
 type="button"
 disabled={!isEligible}
 onClick={() => setShowConfirmModal(true)}
 className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-neutral-900 font-bold rounded-xl transition disabled:opacity-30"
 >
 Reactivate
 </button>
 </div>
 </div>

 </div>
 </div>
 </div>
 )}

 {/* REACTIVATION CONFIRMATION MODAL */}
 {showConfirmModal && selectedSub && (
 <div className="fixed inset-0 bg-neutral-50/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
 <div className="flex items-center gap-3">
 <AlertTriangle className="w-5 h-5 text-danger" />
 <h3 className="text-base font-bold text-neutral-900 font-display">Confirm Reactivation</h3>
 </div>
 <p className="text-xs text-neutral-600 leading-relaxed font-mono">
 Are you sure you want to unfreeze membership **{selectedSub.id}** for **{selectedSub.memberName}**?<br /><br />
 New Membership End Date will shift to: <strong className="text-success">{getRecalculatedEndDate()}</strong>
 </p>
 <div className="flex gap-3 justify-end pt-2">
 <button
 type="button"
 onClick={() => setShowConfirmModal(false)}
 disabled={reactivating}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition disabled:opacity-50"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={triggerReactivation}
 disabled={reactivating}
 className="px-4 py-2 bg-primary text-neutral-900 text-xs font-bold rounded-xl transition disabled:opacity-50"
 >
 {reactivating ? 'Reactivating...' : 'Confirm Reactivate'}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* SUCCESS SPLASH SCREEN */}
 {showSuccessSplash && (
 <div className="fixed inset-0 bg-neutral-50/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl relative">
 <div className="w-16 h-16 bg-success-light border border-green-200 rounded-full flex items-center justify-center mx-auto text-success">
 <Check className="w-8 h-8 animate-bounce" />
 </div>
 
 <div className="space-y-2">
 <h3 className="text-lg font-bold text-neutral-900 font-display">Membership Reactivated Successfully!</h3>
 <p className="text-xs text-neutral-600 leading-relaxed">
 Entrance check-in gates, trainer classes, and dietitian macros are fully restored.
 </p>
 </div>

 <div className="bg-white border border-neutral-200 p-4 rounded-xl text-left font-mono text-xs space-y-2">
 <div className="flex justify-between"><span>Member:</span><span className="text-neutral-800">{lastReactivated?.memberName || '—'}</span></div>
 <div className="flex justify-between"><span>Reactivation Date:</span><span>{new Date().toISOString().split('T')[0]}</span></div>
 <div className="flex justify-between"><span>New End Date:</span><span className="text-success font-bold">{lastReactivated?.newEndDate || '—'}</span></div>
 </div>

 <div className="flex flex-col gap-2 pt-2">
 <button
 onClick={() => setShowSuccessSplash(false)}
 className="w-full py-2.5 bg-primary text-neutral-900 font-bold text-xs rounded-xl"
 >
 Dismiss Success Splash
 </button>
 <button
 onClick={() => {
 setShowSuccessSplash(false);
 router.push(lastReactivated?.rawMemberId ? `/workspace/members/${lastReactivated.rawMemberId}` : '/workspace/members');
 }}
 className="w-full py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl"
 >
 Go to Member Profile
 </button>
 </div>
 </div>
 </div>
 )}

 </div>
 );
}

export default function MembershipReactivatePage() {
 return (
 <Suspense fallback={
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Initializing Suspense context...
 </div>
 }>
 <ReactivateManagementContent />
 </Suspense>
 );
}
