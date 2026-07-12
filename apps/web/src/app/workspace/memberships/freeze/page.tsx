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
 PauseCircle,
 Upload,
 Download,
 Trash2,
 HelpCircle,
 CheckSquare,
 XCircle,
 Info
} from 'lucide-react';
import { gymApi, freezeApi, membershipsApi } from '../../../../lib/api';
import MembershipsTabs from '../MembershipsTabs';

// Interface definitions
interface FreezeRecord {
 id: string;
 memberMembershipId: string;
 memberName: string;
 memberId: string;
 subscriptionCode: string;
 planName: string;
 freezeStart: string;
 freezeEnd: string;
 durationDays: number;
 reason: string;
 status: string;
 approvedBy?: string;
 createdDate: string;
 documentName?: string;
}

function FreezeManagementContent() {
 const router = useRouter();

 // Basic States
 const [loading, setLoading] = useState(true);
 const [userRole, setUserRole] = useState('manager');
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 // Search & Filters
 const [searchTerm, setSearchTerm] = useState('');
 const [statusFilter, setStatusFilter] = useState('all');

 // Modals & Drawers States
 const [showRequestDrawer, setShowRequestDrawer] = useState(false);
 const [showApprovalDrawer, setShowApprovalDrawer] = useState(false);
 const [selectedRecord, setSelectedRecord] = useState<FreezeRecord | null>(null);

 // Form State
 const [selectedMemberId, setSelectedMemberId] = useState('');
 const [freezeStart, setFreezeStart] = useState('');
 const [freezeEnd, setFreezeEnd] = useState('');
 const [freezeReasonCategory, setFreezeReasonCategory] = useState('Medical');
 const [freezeReasonNotes, setFreezeReasonNotes] = useState('');
 const [attachedDocName, setAttachedDocName] = useState<string | null>(null);

 // Rejection Workflow State
 const [rejectionReason, setRejectionReason] = useState('');
 const [rejectionNotes, setRejectionNotes] = useState('');

 // Notification Preview State
 const [notifStage, setNotifStage] = useState<'Requested' | 'Approved' | 'Rejected' | 'Reactivated'>('Approved');
 const [notifChannel, setNotifChannel] = useState<'SMS' | 'Email' | 'WhatsApp'>('WhatsApp');

 const [branches, setBranches] = useState<any[]>([]);
 const [freezeRecords, setFreezeRecords] = useState<FreezeRecord[]>([]);
 const [membersDB, setMembersDB] = useState<Record<string, any>>({});

 const selectedMemberData = membersDB[selectedMemberId];

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 const loadData = async () => {
 setLoading(true);
 try {
 const orgId = localStorage.getItem('organizationId') || '';
 const userStr = localStorage.getItem('user');
 if (userStr) {
 try {
 const u = JSON.parse(userStr);
 if (u.role) setUserRole(u.role.toLowerCase());
 } catch (_) {}
 }

 const branchList = await gymApi.list(orgId);
 setBranches(branchList || []);

 const subscriptions = await membershipsApi.listAllSubscriptions();
 const mDB: Record<string, any> = {};
 subscriptions.forEach((s: any) => {
 mDB[s.id] = {
 name: `${s.member?.firstName || ''} ${s.member?.lastName || ''}`.trim(),
 subCode: `SUB-${s.id.slice(-4).toUpperCase()}`,
 plan: s.membershipPlan?.name || 'Standard Package',
 status: s.status,
 endDate: s.endDate,
 maxFreeze: 30, // Mocked policy
 usedFreeze: 0 // Mocked usage
 };
 });
 setMembersDB(mDB);

 if (subscriptions.length > 0) {
 setSelectedMemberId(subscriptions[0].id);
 setFreezeStart(new Date().toISOString().split('T')[0]);
 const end = new Date();
 end.setDate(end.getDate() + 15);
 setFreezeEnd(end.toISOString().split('T')[0]);
 }

 const freezes = await freezeApi.list();
 setFreezeRecords(freezes.map((f: any) => ({
 id: f.id,
 memberMembershipId: f.memberMembershipId,
 memberName: `${f.memberMembership?.member?.firstName || ''} ${f.memberMembership?.member?.lastName || ''}`.trim(),
 memberId: f.memberMembership?.member?.id ? `M-${f.memberMembership.member.id.slice(-4).toUpperCase()}` : '',
 subscriptionCode: `SUB-${f.memberMembershipId.slice(-4).toUpperCase()}`,
 planName: f.memberMembership?.membershipPlan?.name || '',
 freezeStart: f.startDate.split('T')[0],
 freezeEnd: f.endDate.split('T')[0],
 durationDays: f.durationDays,
 reason: `${f.reasonCategory} (${f.reasonNotes || 'No notes'})`,
 status: f.status,
 approvedBy: f.approvedBy,
 createdDate: f.createdAt.split('T')[0],
 documentUrl: f.documentUrl
 })));

 } catch (err) {
 console.error(err);
 showToast('Failed to load freeze management data', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, []);

 const isTrainerOrDietitian = userRole === 'trainer' || userRole === 'dietitian';
 const isReceptionistOnly = userRole === 'receptionist';

 // Calculate duration from start / end dates
 const calculateDuration = () => {
 if (!freezeStart || !freezeEnd) return 0;
 const start = new Date(freezeStart);
 const end = new Date(freezeEnd);
 return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
 };

 const currentDuration = calculateDuration();

 // Shift End Date calculation helper
 const getShiftedEndDate = () => {
 if (!selectedMemberData) return '';
 const currentEnd = new Date(selectedMemberData.endDate);
 const duration = currentDuration;
 const shiftedEnd = new Date(currentEnd.getTime() + (duration * 24 * 60 * 60 * 1000));
 return shiftedEnd.toISOString().split('T')[0];
 };

 // Submit freeze request
 const handleRequestSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (isTrainerOrDietitian) {
 showToast('Action restricted: Trainer/Dietitian is View-Only', 'error');
 return;
 }
 
 // Check remaining days eligibility
 const remainingFreeze = selectedMemberData.maxFreeze - selectedMemberData.usedFreeze;
 if (currentDuration > remainingFreeze) {
 showToast(`Exceeds remaining freeze allowance: ${remainingFreeze} days left`, 'error');
 return;
 }

 try {
 await freezeApi.requestFreeze({
 memberMembershipId: selectedMemberId,
 startDate: new Date(freezeStart).toISOString(),
 endDate: new Date(freezeEnd).toISOString(),
 durationDays: currentDuration,
 reasonCategory: freezeReasonCategory,
 reasonNotes: freezeReasonNotes,
 documentUrl: attachedDocName || undefined
 });
 showToast(`Freeze hold request submitted for member ${selectedMemberData.name}`);
 setShowRequestDrawer(false);
 setFreezeReasonNotes('');
 setAttachedDocName(null);
 loadData(); // Reload list
 } catch (err) {
 showToast('Failed to submit freeze request', 'error');
 }
 };

 // Direct approval
 const handleApproveRequest = async (id: string) => {
 if (isTrainerOrDietitian || isReceptionistOnly) {
 showToast(`Access Denied: ${userRole} cannot approve request`, 'error');
 return;
 }
 try {
 await freezeApi.approve(id, `${userRole.toUpperCase()} Desk`);
 showToast(`Freeze hold request ${id} approved successfully`);
 setShowApprovalDrawer(false);
 loadData();
 } catch (err) {
 showToast('Failed to approve freeze request', 'error');
 }
 };

 // Rejection handler
 const handleRejectRequest = async (id: string) => {
 if (isTrainerOrDietitian || isReceptionistOnly) {
 showToast(`Access Denied: ${userRole} cannot reject request`, 'error');
 return;
 }
 if (!rejectionReason.trim()) {
 showToast('Please specify a rejection reason', 'error');
 return;
 }
 try {
 await freezeApi.reject(id, `${userRole.toUpperCase()} Desk`, rejectionReason);
 showToast(`Freeze request ${id} rejected. Reason: ${rejectionReason}`);
 setShowApprovalDrawer(false);
 setRejectionReason('');
 setRejectionNotes('');
 loadData();
 } catch (err) {
 showToast('Failed to reject freeze request', 'error');
 }
 };

 // Early reactivation
 const handleEarlyReactivate = async (record: FreezeRecord) => {
 if (isTrainerOrDietitian) {
 showToast('Action restricted: Trainer/Dietitian is View-Only', 'error');
 return;
 }
 try {
 await freezeApi.reactivateEarly(record.id);
 showToast(`Membership reactivated early. Unused freeze hold days added back to active validity.`);
 loadData();
 } catch (err) {
 showToast('Failed to reactivate membership early', 'error');
 }
 };

 // Bulk options
 const handleBulkApprove = async () => {
 if (isTrainerOrDietitian || isReceptionistOnly) {
 showToast(`Access Denied: ${userRole} cannot approve request`, 'error');
 return;
 }
 const pending = freezeRecords.filter(r => r.status === 'Pending Approval');
 if (pending.length === 0) {
 showToast('No pending freeze requests found');
 return;
 }
 try {
 await Promise.all(pending.map(r => freezeApi.approve(r.id, 'Bulk Action')));
 showToast(`Approved ${pending.length} pending requests in bulk`);
 loadData();
 } catch (err) {
 showToast('Failed to approve some requests', 'error');
 }
 };

 // Document attachment mock actions
 const handleMockUpload = () => {
 setAttachedDocName('uploaded_cert_audit.pdf');
 showToast('Document uploaded successfully');
 };

 const handleMockDeleteDoc = () => {
 setAttachedDocName(null);
 showToast('Attached document deleted');
 };

 // Live filter jobs
 const filteredRecords = freezeRecords.filter(r => {
 const matchesSearch =
 r.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
 r.memberId.toLowerCase().includes(searchTerm.toLowerCase()) ||
 r.id.toLowerCase().includes(searchTerm.toLowerCase());
 const matchesStatus =
 statusFilter === 'all' || r.status.toLowerCase() === statusFilter.toLowerCase();
 return matchesSearch && matchesStatus;
 });

 // KPI Metrics calculations
 const activeFreezes = freezeRecords.filter(r => r.status === 'Approved');
 const activeFreezesCount = activeFreezes.length;
 const pendingRequestsCount = freezeRecords.filter(r => r.status === 'Pending Approval').length;
 const averageDays = Math.round(
 freezeRecords.reduce((acc, r) => acc + r.durationDays, 0) / (freezeRecords.length || 1)
 );
 
 // Dynamic Revenue Impact
 const AVG_DAILY_RATE = 120; // Mock average daily revenue per member
 const frozenRevenue = activeFreezes.reduce((acc, r) => acc + (r.durationDays * AVG_DAILY_RATE), 0);
 const protectedRevenue = Object.values(membersDB).filter(m => m.status === 'active').length * 30 * AVG_DAILY_RATE;
 
 const today = new Date();
 today.setHours(0, 0, 0, 0);
 const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
 const reactivationsNext7Days = activeFreezes.filter(r => {
 const end = new Date(r.freezeEnd);
 return end >= today && end <= nextWeek;
 }).length;

 // Notification center preview helpers
 const getNotifContent = () => {
 const start = freezeStart || '2026-06-20';
 const end = freezeEnd || '2026-07-05';
 
 if (notifChannel === 'WhatsApp' || notifChannel === 'SMS') {
 if (notifStage === 'Requested') return `GymFlow Update: Your freeze request is pending verification. Period: ${start} to ${end}.`;
 if (notifStage === 'Approved') return `GymFlow: Good news! Your freeze request is approved. Access resumes on ${end}. Expiry extended.`;
 if (notifStage === 'Rejected') return `GymFlow Update: Your freeze request was declined. Contact the front desk counselor for details.`;
 return `GymFlow: Welcome back! Your membership hold has ended. Branch entry and PT benefits have been reactivated.`;
 }
 // Email
 if (notifStage === 'Requested') {
 return `Subject: Membership Freeze Hold Received ⏳\n\nDear Member,\nWe received your request to freeze your subscription plan from ${start} to ${end}. Our management desk will review the documentation and update you shortly.`;
 }
 if (notifStage === 'Approved') {
 return `Subject: Approved: Membership Freeze Confirmation ✅\n\nDear Member,\nYour request is approved. Access gates are locked, and PT sessions are paused. Your new extended end date has been updated in the member portal.`;
 }
 if (notifStage === 'Rejected') {
 return `Subject: Update: Membership Freeze Declined ❌\n\nDear Member,\nWe are unable to approve your freeze hold request at this time. Please make sure that proper certificates are uploaded, or contact our support counselor.`;
 }
 return `Subject: Welcome Back! Membership Reactivated 🏋️\n\nDear Member,\nYour freeze hold duration has expired. Your portal login, gate entry check-ins, and personal training booking credits are fully active.`;
 };

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
 <PauseCircle className="w-6 h-6 text-cyan-500" />
 Memberships Hub
 </h1>
 <p className="text-xs text-neutral-600 mt-1">Design, track, and manage membership agreement templates and subscription lifecycles.</p>
 </div>

 {/* Top Actions */}
 <div className="flex gap-2.5">
 {isTrainerOrDietitian && (
 <div className="px-3 py-2 bg-warning-light border border-amber-200 text-amber-700 text-[10px] rounded-xl flex items-center gap-2 font-mono uppercase">
 <ShieldAlert className="w-4 h-4" />
 <span>Trainer/Dietitian View Only</span>
 </div>
 )}

 <button
 onClick={() => setShowRequestDrawer(true)}
 className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-neutral-900 text-xs font-semibold rounded-xl transition flex items-center gap-2 shadow-lg shadow-cyan-600/15"
 >
 <Plus className="w-4 h-4" />
 <span>Freeze Request</span>
 </button>
 </div>
 </div>

 {/* TABS ROW */}
 <MembershipsTabs />

 {/* FREEZE ANALYTICS KPI CARDS */}
 <div className="grid grid-cols-2 md:grid-cols-5 gap-4 font-mono">
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Frozen Memberships</span>
 <span className="text-sm font-bold text-cyan-400 block mt-1">{activeFreezesCount} Members</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Pending Requests</span>
 <span className="text-sm font-bold text-amber-700 block mt-1">{pendingRequestsCount} Pending</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Avg Hold Duration</span>
 <span className="text-sm font-bold text-purple-400 block mt-1">{averageDays} Days</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Top Hold Reason</span>
 <span className="text-sm font-bold text-neutral-800 block mt-1">Medical (50%)</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Reactivation Rate</span>
 <span className="text-sm font-bold text-success block mt-1">98.8%</span>
 </div>
 </div>

 {/* MAIN TWO COLUMN VIEW */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 
 {/* LEFT WORKSPACE: ACTIVE LIST & TIMELINES */}
 <div className="lg:col-span-2 space-y-6">
 
 {/* DASHBOARD CONTROL BAR */}
 <div className="bg-white border border-neutral-200/60 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between">
 <div className="flex flex-1 items-center gap-3 min-w-[280px]">
 <div className="relative flex-1">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
 <input
 type="text"
 placeholder="Search by name, member ID, or request ID..."
 className="w-full bg-white border border-neutral-200 rounded-xl pl-10 pr-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-cyan-500/50"
 value={searchTerm}
 onChange={e => setSearchTerm(e.target.value)}
 />
 </div>
 </div>

 <div className="flex gap-2">
 <select
 value={statusFilter}
 onChange={e => setStatusFilter(e.target.value)}
 className="bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none"
 >
 <option value="all">All Request Statuses</option>
 <option value="pending approval">Pending Approval</option>
 <option value="approved">Approved / Active Hold</option>
 <option value="expired">Expired Hold</option>
 <option value="rejected">Rejected</option>
 </select>

 {(!isTrainerOrDietitian && !isReceptionistOnly) && (
 <button
 onClick={handleBulkApprove}
 className="px-3 py-2 bg-neutral-50 border border-neutral-200 hover:text-neutral-900 text-neutral-700 text-xs font-semibold rounded-xl"
 >
 Bulk Approve
 </button>
 )}
 </div>
 </div>

 {/* ACTIVE FREEZES LIST */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {filteredRecords.length === 0 ? (
 <div className="md:col-span-2 p-16 text-center bg-neutral-50/10 border border-neutral-200/40 rounded-3xl flex flex-col items-center">
 <Inbox className="text-neutral-400 mb-4" size={40} />
 <h3 className="text-sm font-bold text-neutral-900">No Freeze Holds Recorded</h3>
 <p className="text-xs text-neutral-600 mt-1">There are no current freeze requests matching your filters.</p>
 </div>
 ) : (
 filteredRecords.map((rec) => (
 <div
 key={rec.id}
 className="bg-neutral-50/20 border border-neutral-200/80 hover:border-neutral-200/60 rounded-3xl p-5 flex flex-col justify-between transition relative overflow-hidden min-h-[220px]"
 >
 <div className="space-y-3">
 <div className="flex justify-between items-start">
 <div>
 <span className="text-[9px] text-neutral-500 font-mono block uppercase">Hold ID: {rec.id}</span>
 <h4 className="text-sm font-bold text-neutral-900 mt-1 font-display">{rec.memberName}</h4>
 <span className="text-[10px] text-neutral-600 font-mono">{rec.memberId} • {rec.subscriptionCode}</span>
 </div>
 <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold border uppercase tracking-wider ${
 rec.status === 'Approved'
 ? 'bg-cyan-500/10 text-cyan-405 border-cyan-500/20'
 : rec.status === 'Pending Approval'
 ? 'bg-warning-light text-amber-700 border-amber-200 animate-pulse'
 : rec.status === 'Rejected'
 ? 'bg-danger-light text-danger border-red-200'
 : 'bg-neutral-100/40 text-neutral-600 border-neutral-200/30'
 }`}>
 {rec.status}
 </span>
 </div>

 <p className="text-xs text-neutral-600 font-mono leading-tight">
 <strong>Plan:</strong> {rec.planName}<br />
 <strong>Period:</strong> {rec.freezeStart} to {rec.freezeEnd} ({rec.durationDays} Days)
 </p>

 <p className="text-[11px] text-neutral-600 leading-relaxed italic">
 Reason: {rec.reason}
 </p>

 {rec.documentName && (
 <div className="flex items-center gap-1 text-[10px] text-neutral-500 font-mono">
 <FileText size={12} className="text-cyan-500" />
 <span>Attachment: {rec.documentName}</span>
 </div>
 )}
 </div>

 <div className="border-t border-neutral-200 pt-3 mt-4 flex justify-between items-center text-[10px]">
 <span className="text-neutral-500">
 {rec.approvedBy ? `By: ${rec.approvedBy}` : `Applied: ${rec.createdDate}`}
 </span>
 
 <div className="flex gap-1.5">
 {rec.status === 'Pending Approval' ? (
 <button
 onClick={() => {
 setSelectedRecord(rec);
 setShowApprovalDrawer(true);
 }}
 className="px-2.5 py-1 bg-neutral-50 border border-neutral-200 hover:text-neutral-900 text-cyan-400 font-semibold rounded-lg"
 >
 Review Hold
 </button>
 ) : rec.status === 'Approved' ? (
 <button
 onClick={() => handleEarlyReactivate(rec)}
 className="px-2.5 py-1 bg-neutral-50 border border-neutral-200 hover:text-neutral-900 text-success font-semibold rounded-lg"
 >
 Reactivate Early
 </button>
 ) : null}
 </div>
 </div>
 </div>
 ))
 )}
 </div>

 {/* LIFECYCLE TRANSITION FLOW STEPPER */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Freeze Lifecycle Transitions</span>
 
 <div className="flex flex-wrap gap-4 items-center justify-between font-mono text-[10px] text-neutral-600">
 {[
 { stage: '1. Active Status', desc: 'Checks eligibility parameters', active: true },
 { stage: '2. Freeze Applied', desc: 'Hold starts, validity locks', active: true },
 { stage: '3. Paused Services', desc: 'PT & diet access suspended', active: true },
 { stage: '4. Reactivation', desc: 'Expiry shifted, gates restored', active: true }
 ].map((step, idx) => (
 <div key={idx} className="flex-1 min-w-[140px] bg-white border border-neutral-200 p-3.5 rounded-2xl relative">
 <div className="flex justify-between items-center mb-1">
 <span className="font-bold text-neutral-800 text-xs">{step.stage}</span>
 <CheckCircle className="w-4 h-4 text-cyan-500 shrink-0" />
 </div>
 <span className="text-[8px] text-neutral-500 block leading-normal">{step.desc}</span>
 </div>
 ))}
 </div>
 </div>

 </div>

 {/* RIGHT WORKSPACE: REVENUE IMPACT & NOTIFICATIONS PREVIEWS */}
 <div className="lg:col-span-1 space-y-6">
 
 {/* REVENUE IMPACT PANEL */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Revenue Impact (30 Days)</span>
 
 <div className="space-y-3 text-xs font-mono">
 <div className="flex justify-between">
 <span className="text-neutral-600">Frozen Revenue (On Hold)</span>
 <span className="font-semibold text-danger">₹{frozenRevenue.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-600">Protected Revenue (Retained)</span>
 <span className="font-semibold text-success">₹{protectedRevenue.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-600">Expected Reactivations</span>
 <span className="font-semibold text-neutral-800">{reactivationsNext7Days} Members (Next 7d)</span>
 </div>

 <div className="border-t border-neutral-200 pt-3 text-[10px] text-neutral-500 space-y-2">
 <strong>Branch Active Holds:</strong>
 {branches.slice(0, 3).map((b, i) => (
 <div key={b.id} className="flex justify-between">
 <span>{b.name}</span>
 <span>{i === 0 ? activeFreezesCount : 0} Freezes</span>
 </div>
 ))}
 {branches.length === 0 && (
 <div className="text-neutral-400 italic">No branch data available.</div>
 )}
 </div>
 </div>
 </div>

 {/* NOTIFICATION CENTER & COMMUNICATION PREVIEW */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Alert Communication Center</span>
 
 <div className="space-y-4 font-mono text-xs">
 
 {/* Event Select */}
 <div className="space-y-1">
 <span className="text-neutral-600 block font-sans">Notification Event Stage</span>
 <select
 value={notifStage}
 onChange={e => setNotifStage(e.target.value as any)}
 className="w-full bg-white border border-neutral-200 p-2.5 rounded-xl text-neutral-800 focus:outline-none"
 >
 <option value="Requested">Freeze Requested Alert</option>
 <option value="Approved">Freeze Approved Alert</option>
 <option value="Rejected">Freeze Rejected Alert</option>
 <option value="Reactivated">Auto Expiry Hold Ends (Reactivation)</option>
 </select>
 </div>

 {/* Alert Channel Select */}
 <div className="space-y-1">
 <span className="text-neutral-600 block font-sans">Communication Channel</span>
 <div className="grid grid-cols-3 gap-2">
 {[
 { label: 'WhatsApp', icon: MessageCircle, color: 'text-success' },
 { label: 'SMS', icon: MessageSquare, color: 'text-blue-450' },
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
 ? 'bg-cyan-900/10 border-cyan-500/30 text-neutral-800'
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

 {/* Preview Panel */}
 <div className="space-y-2">
 <span className="text-neutral-600 block font-sans">Message Preview Template</span>
 <div className="bg-white border border-neutral-200 p-4 rounded-xl text-[10px] text-neutral-700 whitespace-pre-wrap leading-relaxed">
 <div className="flex items-center gap-1.5 border-b border-neutral-200 pb-2 mb-2">
 <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
 <span className="font-bold text-neutral-600 text-[8px] uppercase tracking-wider">{notifChannel} Template Payload</span>
 </div>
 {getNotifContent()}
 </div>
 </div>

 </div>
 </div>

 </div>

 </div>

 {/* DRAWER: FREEZE REQUEST WIZARD */}
 {showRequestDrawer && (
 <div className="fixed inset-0 z-[100] overflow-hidden">
 <div className="absolute inset-0 bg-neutral-50/80 backdrop-blur-sm transition-opacity" onClick={() => setShowRequestDrawer(false)} />
 <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
 <div className="w-screen max-w-md bg-white border-l border-neutral-200 p-6 flex flex-col justify-between shadow-2xl">
 
 <form onSubmit={handleRequestSubmit} className="space-y-6 overflow-y-auto pr-1">
 <div>
 <h3 className="text-base font-bold text-neutral-900 font-display">New Freeze Hold Request</h3>
 <p className="text-xs text-neutral-600 mt-1">Submit membership freeze logs for eligibility review.</p>
 </div>

 <div className="space-y-5 font-mono text-xs">
 
 {/* Member Selector */}
 <div className="space-y-1.5">
 <span className="text-neutral-600 block font-sans">Select Active Membership Profile</span>
 <select
 value={selectedMemberId}
 onChange={e => setSelectedMemberId(e.target.value)}
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-800 focus:outline-none"
 >
 {Object.keys(membersDB).map(key => (
 <option key={key} value={key}>
 {membersDB[key].name} ({membersDB[key].plan} - {membersDB[key].subCode})
 </option>
 ))}
 </select>
 </div>

 {/* ELIGIBILITY VALIDATION PANEL */}
 {selectedMemberData && (
 <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-2">
 <span className="text-[10px] text-neutral-500 font-sans uppercase block font-semibold">Freeze Eligibility Analysis</span>
 <div className="flex justify-between"><span>Freeze Allowed:</span><span className="text-success font-bold">Yes (Plan Compliant)</span></div>
 <div className="flex justify-between"><span>Max Freeze Days:</span><span>{selectedMemberData.maxFreeze} Days / Year</span></div>
 <div className="flex justify-between"><span>Used Freeze Days:</span><span>{selectedMemberData.usedFreeze} Days</span></div>
 <div className="flex justify-between border-t border-neutral-200/60 pt-1">
 <span>Remaining Balance:</span>
 <span className="text-cyan-400 font-bold">{selectedMemberData.maxFreeze - selectedMemberData.usedFreeze} Days</span>
 </div>
 <div className="flex justify-between"><span>Requests Allowed/Used:</span><span>{selectedMemberData.usedRequests} of {selectedMemberData.maxRequests} Requests</span></div>
 </div>
 )}

 {/* Dates picker */}
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <span className="text-neutral-600 block font-sans">Hold Start Date</span>
 <input
 type="date"
 required
 value={freezeStart}
 onChange={e => setFreezeStart(e.target.value)}
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-800"
 />
 </div>
 <div className="space-y-1.5">
 <span className="text-neutral-600 block font-sans">Hold End Date</span>
 <input
 type="date"
 required
 value={freezeEnd}
 onChange={e => setFreezeEnd(e.target.value)}
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-800"
 />
 </div>
 </div>

 {/* Live Impact Preview */}
 <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-2">
 <span className="text-[10px] text-neutral-500 font-sans uppercase block font-semibold">Active Timeline Impact Preview</span>
 <div className="flex justify-between"><span>Proposed Hold Days:</span><span className="text-cyan-400 font-bold">{currentDuration} Days</span></div>
 <div className="flex justify-between"><span>Current End Date:</span><span>{selectedMemberData.endDate}</span></div>
 <div className="flex justify-between border-t border-neutral-200/60 pt-1">
 <span>New Projected End Date:</span>
 <span className="text-success font-bold">{getShiftedEndDate()}</span>
 </div>
 <div className="text-[9px] text-neutral-500 border-t border-neutral-200/60 pt-2 leading-relaxed font-sans">
 ⚠️ Access gates blocked, and training benefits paused automatically during hold duration.
 </div>
 </div>

 {/* Reason category */}
 <div className="space-y-1.5">
 <span className="text-neutral-600 block font-sans">Reason Category</span>
 <select
 value={freezeReasonCategory}
 onChange={e => setFreezeReasonCategory(e.target.value)}
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-800 focus:outline-none"
 >
 <option value="Medical">Medical Recovery</option>
 <option value="Travel">Travel / Vacation</option>
 <option value="Work Assignment">Work Relocation</option>
 <option value="Pregnancy">Pregnancy Hold</option>
 <option value="Financial">Financial Pause</option>
 <option value="Personal">Personal Reason</option>
 <option value="Other">Other / Emergency</option>
 </select>
 </div>

 {/* Notes */}
 <div className="space-y-1.5">
 <span className="text-neutral-600 block font-sans">Administrative Details</span>
 <textarea
 placeholder="Add validation reason logs..."
 rows={3}
 value={freezeReasonNotes}
 onChange={e => setFreezeReasonNotes(e.target.value)}
 className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-neutral-800 focus:outline-none"
 />
 </div>

 {/* Attachment Uploader */}
 <div className="space-y-2">
 <span className="text-neutral-600 block font-sans">Upload Verification Document (Optional)</span>
 {attachedDocName ? (
 <div className="bg-white border border-neutral-200 p-3 rounded-xl flex items-center justify-between">
 <div className="flex items-center gap-2 text-neutral-800 truncate">
 <FileText size={14} className="text-cyan-500" />
 <span className="text-[11px] truncate">{attachedDocName}</span>
 </div>
 <button
 type="button"
 onClick={handleMockDeleteDoc}
 className="text-danger hover:text-danger p-1"
 >
 <Trash2 size={13} />
 </button>
 </div>
 ) : (
 <button
 type="button"
 onClick={handleMockUpload}
 className="w-full py-4 bg-white border border-dashed border-neutral-200 hover:border-neutral-200 rounded-xl text-neutral-600 flex flex-col items-center justify-center gap-1.5 transition"
 >
 <Upload size={16} />
 <span className="text-[10px]">Attach medical certificate / flight ticket</span>
 </button>
 )}
 </div>

 </div>

 <div className="flex gap-3 pt-4 border-t border-neutral-200">
 <button
 type="button"
 onClick={() => setShowRequestDrawer(false)}
 className="flex-1 py-2.5 bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-800 font-semibold rounded-xl transition"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-neutral-900 font-bold rounded-xl transition"
 >
 Submit Request
 </button>
 </div>
 </form>

 </div>
 </div>
 </div>
 )}

 {/* DRAWER: APPROVAL SCREEN WORKFLOW */}
 {showApprovalDrawer && selectedRecord && (
 <div className="fixed inset-0 z-[100] overflow-hidden">
 <div className="absolute inset-0 bg-neutral-50/80 backdrop-blur-sm transition-opacity" onClick={() => setShowApprovalDrawer(false)} />
 <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
 <div className="w-screen max-w-md bg-white border-l border-neutral-200 p-6 flex flex-col justify-between shadow-2xl">
 
 <div className="space-y-6 overflow-y-auto pr-1">
 <div>
 <h3 className="text-base font-bold text-neutral-900 font-display">Review Pause Request</h3>
 <p className="text-xs text-neutral-600 mt-1">Review validation and impact audit before activation.</p>
 </div>

 <div className="space-y-5 font-mono text-xs">
 
 {/* Request Details */}
 <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-2">
 <span className="text-[10px] text-neutral-500 font-sans uppercase block font-semibold">Membership Details</span>
 <div className="flex justify-between"><span>Member Name:</span><span className="text-neutral-800 font-semibold">{selectedRecord.memberName}</span></div>
 <div className="flex justify-between"><span>ID:</span><span>{selectedRecord.memberId}</span></div>
 <div className="flex justify-between"><span>Current Plan:</span><span>{selectedRecord.planName}</span></div>
 </div>

 {/* Hold Period & Days */}
 <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-2">
 <span className="text-[10px] text-neutral-500 font-sans uppercase block font-semibold">Hold Request Details</span>
 <div className="flex justify-between"><span>Proposed Hold:</span><span className="text-cyan-400 font-bold">{selectedRecord.durationDays} Days</span></div>
 <div className="flex justify-between"><span>Start Date:</span><span>{selectedRecord.freezeStart}</span></div>
 <div className="flex justify-between"><span>End Date:</span><span>{selectedRecord.freezeEnd}</span></div>
 <div className="flex justify-between border-t border-neutral-200/60 pt-1">
 <span>Reason Specified:</span>
 <span className="text-neutral-700">{selectedRecord.reason}</span>
 </div>
 </div>

 {/* Supporting Docs */}
 <div className="space-y-2">
 <span className="text-neutral-600 block font-sans">Attached Support Verification</span>
 {selectedRecord.documentName ? (
 <div className="bg-white border border-neutral-200 p-3 rounded-xl flex items-center justify-between">
 <div className="flex items-center gap-2 text-neutral-800 truncate">
 <FileText size={14} className="text-cyan-500" />
 <span className="text-[11px] truncate">{selectedRecord.documentName}</span>
 </div>
 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => showToast('Mock Document downloaded')}
 className="text-neutral-600 hover:text-neutral-900 p-1"
 >
 <Download size={13} />
 </button>
 </div>
 </div>
 ) : (
 <div className="text-neutral-500 italic text-[11px]">No verification document attached.</div>
 )}
 </div>

 {/* Custom Rejection field */}
 <div className="border-t border-neutral-200/80 pt-4 space-y-3">
 <span className="text-neutral-600 block font-sans">Declining Safeguard Form (If Rejecting)</span>
 <div className="space-y-1.5">
 <span className="text-neutral-500 block">Rejection Reason Category</span>
 <input
 type="text"
 placeholder="e.g. Insufficient Documents, Policy Restriction..."
 value={rejectionReason}
 onChange={e => setRejectionReason(e.target.value)}
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-800 focus:outline-none"
 />
 </div>
 <div className="space-y-1.5">
 <span className="text-neutral-500 block">Declining Notes</span>
 <textarea
 placeholder="Describe details for member email notifications..."
 rows={2}
 value={rejectionNotes}
 onChange={e => setRejectionNotes(e.target.value)}
 className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-neutral-800 focus:outline-none"
 />
 </div>
 </div>

 </div>

 <div className="flex flex-col gap-2 pt-4 border-t border-neutral-200">
 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => handleRejectRequest(selectedRecord.id)}
 disabled={!rejectionReason.trim()}
 className="flex-1 py-2.5 bg-danger-light border border-red-200 text-danger hover:bg-danger-light font-bold rounded-xl transition disabled:opacity-30"
 >
 Reject Request
 </button>
 <button
 type="button"
 onClick={() => handleApproveRequest(selectedRecord.id)}
 className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-neutral-900 font-bold rounded-xl transition"
 >
 Approve Hold
 </button>
 </div>
 <button
 type="button"
 onClick={() => {
 showToast(`Info request dispatched to member ${selectedRecord.memberName}`);
 setShowApprovalDrawer(false);
 }}
 className="w-full py-2 bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-800 font-semibold rounded-xl"
 >
 Request More Information
 </button>
 </div>
 </div>

 </div>
 </div>
 </div>
 )}

 </div>
 );
}

export default function MembershipFreezePage() {
 return (
 <Suspense fallback={
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Initializing Suspense context...
 </div>
 }>
 <FreezeManagementContent />
 </Suspense>
 );
}
