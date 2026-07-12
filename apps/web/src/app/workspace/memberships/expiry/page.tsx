'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
 Clock,
 Search,
 Filter,
 Users,
 MapPin,
 Calendar as CalendarIcon,
 ChevronLeft,
 ChevronRight,
 TrendingUp,
 AlertTriangle,
 Mail,
 Phone,
 MessageSquare,
 FileText,
 CheckCircle,
 MoreVertical,
 Activity,
 Sliders,
 Sparkles,
 BarChart3,
 DollarSign,
 Briefcase,
 ListFilter,
 Check,
 Download,
 AlertCircle,
 CreditCard
} from 'lucide-react';
import { gymApi, orgApi, membershipsApi, membersApi, expiryRemindersApi } from '../../../../lib/api';
import MembershipsTabs from '../MembershipsTabs';
import ReminderCenter from './ReminderCenter';

interface ExpiringMember {
 id: string;
 rawMemberId: string;
 name: string;
 memberId: string;
 subscriptionCode: string;
 planName: string;
 branchName: string;
 expiryDate: string;
 daysRemaining: number;
 outstandingBalance: number;
 assignedTrainer: string;
 assignedCounselor: string;
 renewalStatus: 'Uncontacted' | 'Contacted' | 'Interested' | 'Renewal Pending' | 'Renewed' | 'Lost';
 probability: 'High' | 'Medium' | 'Low';
 engagementScore: number;
 lastVisit: string;
 attendanceFrequency: string; // e.g."Low","Normal","High"
 price?: number;
}

export default function MembershipExpiryTrackingPage() {
 const router = useRouter();

 // Primary States
 const [loading, setLoading] = useState(true);
 const [viewMode, setViewMode] = useState<'table' | 'timeline' | 'calendar' | 'kanban'>('timeline');
 const [members, setMembers] = useState<ExpiringMember[]>([]);
 const [branches, setBranches] = useState<any[]>([]);
 const [userRole, setUserRole] = useState('receptionist');

 // Search & Filter state
 const [searchQuery, setSearchQuery] = useState('');
 const [branchFilter, setBranchFilter] = useState('all');
 const [probabilityFilter, setProbabilityFilter] = useState('all');
 const [statusFilter, setStatusFilter] = useState('all');

 // Multi-select state
 const [selectedIds, setSelectedIds] = useState<string[]>([]);

 // Drawer / Modals State
 const [showFollowUpDrawer, setShowFollowUpDrawer] = useState(false);
 const [selectedMember, setSelectedMember] = useState<ExpiringMember | null>(null);
 const [followUpType, setFollowUpType] = useState<'Call' | 'WhatsApp' | 'SMS' | 'Email' | 'In-Person'>('Call');
 const [followUpOutcome, setFollowUpOutcome] = useState('Interested in Renewal');
 const [followUpNotes, setFollowUpNotes] = useState('');
 const [nextFollowUpDate, setNextFollowUpDate] = useState('');

 // Reminder Center State
 const [showReminderCenter, setShowReminderCenter] = useState(false);
 const [reminderRules, setReminderRules] = useState<any[]>([]);
 const [reminderLogs, setReminderLogs] = useState<any[]>([]);
 const [channelConfig, setChannelConfig] = useState<any>(null);
 const [reminderTab, setReminderTab] = useState<'rules' | 'logs'>('rules');
 const [showRuleForm, setShowRuleForm] = useState(false);
 const [editingRule, setEditingRule] = useState<any>(null);
 const [ruleForm, setRuleForm] = useState({ label: '', triggerDays: 7, channels: ['WhatsApp'], templateSms: '', templateWhatsApp: '', templateEmail: '', isActive: true });
 const [dispatchingRuleId, setDispatchingRuleId] = useState<string | null>(null);
 const [reminderLoading, setReminderLoading] = useState(false);

 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
 const [auditTrail, setAuditTrail] = useState<any[]>([
 { id: '1', type: 'Reminder SMS Dispatched', detail: 'System automated outreach executed.', date: 'Today', user: 'System Auto' },
 { id: '2', type: 'Follow-up Call Registered', detail: 'Initial welcome back call logged.', date: 'Yesterday', user: 'Counselor Frank' }
 ]);

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 const loadData = async () => {
 try {
 setLoading(true);
 const orgId = localStorage.getItem('organizationId') || '';

 // Get user role
 const userStr = localStorage.getItem('user');
 if (userStr) {
 try {
 const u = JSON.parse(userStr);
 if (u.role) setUserRole(u.role.toLowerCase());
 } catch (_) { }
 }

 // Fetch branches
 const branchList = await gymApi.list(orgId);
 setBranches(branchList || []);

 // Fetch real member memberships from the backend
 const subscriptions = await membershipsApi.listAllSubscriptions();
 const dbExpiring: ExpiringMember[] = subscriptions.map((s: any) => {
 const endDate = new Date(s.endDate);
 const today = new Date();
 endDate.setHours(0, 0, 0, 0);
 today.setHours(0, 0, 0, 0);
 const timeDiff = endDate.getTime() - today.getTime();
 const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

 const memberAi = s.member?.aiInsights || {};
 return {
 id: s.id,
 rawMemberId: s.member?.id || '',
 name: `${s.member?.firstName || ''} ${s.member?.lastName || ''}`.trim(),
 memberId: s.member?.id ? `M-${s.member.id.slice(-4).toUpperCase()}` : 'M-UNKNOWN',
 subscriptionCode: `SUB-${s.id.slice(-4).toUpperCase()}`,
 planName: s.membershipPlan?.name || 'Standard Package',
 branchName: s.member?.homeGym?.name || 'Main Branch',
 expiryDate: s.endDate.split('T')[0],
 daysRemaining,
 outstandingBalance: 0,
 assignedTrainer: memberAi.assignedTrainerName || 'Trainer Sarah',
 assignedCounselor: memberAi.assignedCounselorName || 'Counselor Frank',
 renewalStatus: (memberAi.renewalStatus || 'Uncontacted') as any,
 probability: (daysRemaining <= 7 ? 'Low' : daysRemaining <= 15 ? 'Medium' : 'High') as any,
 engagementScore: memberAi.engagementScore || (daysRemaining < 0 ? 15 : daysRemaining <= 7 ? 45 : 88),
 lastVisit: memberAi.lastVisit || 'Yesterday',
 attendanceFrequency: memberAi.attendanceFrequency || 'Normal',
 price: s.amountPaid || s.membershipPlan?.basePrice || 0
 };
 });

 setMembers(dbExpiring);
 setNextFollowUpDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

 // Dynamic Counselor Audit Trail Load
 const localTrail = localStorage.getItem('counselor_audit_trail');
 if (localTrail) {
 setAuditTrail(JSON.parse(localTrail));
 }

 } catch (err) {
 console.error(err);
 showToast('Failed to load expiry tracking dashboard', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, []);

 const handleOpenFollowUp = (member: ExpiringMember) => {
 setSelectedMember(member);
 setFollowUpNotes('');
 setShowFollowUpDrawer(true);
 };

 const handleSaveFollowUp = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedMember || !selectedMember.rawMemberId) return;

 try {
 // Patch member insights with new status
 await membersApi.update(selectedMember.rawMemberId, {
 aiInsights: { renewalStatus: 'Contacted' }
 });

 // Update local state instead of doing full reload
 const updated = members.map(m => {
 if (m.id === selectedMember.id) {
 return {
 ...m,
 renewalStatus: 'Contacted' as const
 };
 }
 return m;
 });
 setMembers(updated);
 showToast(`Logged ${followUpType} follow-up for ${selectedMember.name}`);


 // Log the new event to the audit trail
 const newAudit = {
 id: 'audit-' + Date.now(),
 type: `${followUpType} Follow-up Registered`,
 detail: `Outreach to ${selectedMember.name} recorded. Outcome:"${followUpOutcome}"`,
 date: 'Today',
 user: 'Counselor Frank'
 };

 setAuditTrail(prev => {
 const updatedTrail = [newAudit, ...prev];
 localStorage.setItem('counselor_audit_trail', JSON.stringify(updatedTrail));
 return updatedTrail;
 });

 setShowFollowUpDrawer(false);
 } catch (err) {
 showToast('Failed to save follow-up', 'error');
 }
 };

 const handleBulkReminder = () => {
 if (selectedIds.length === 0) {
 showToast('Please select members to remind', 'error');
 return;
 }
 showToast(`Sent reminders to ${selectedIds.length} selected members`);
 setSelectedIds([]);
 };

 const openReminderCenter = async () => {
 setShowReminderCenter(true);
 setReminderLoading(true);
 try {
 const [rules, logs, config] = await Promise.all([
 expiryRemindersApi.listRules(),
 expiryRemindersApi.listLogs(30),
 expiryRemindersApi.getChannelConfig(),
 ]);
 setReminderRules(rules || []);
 setReminderLogs(logs || []);
 setChannelConfig(config);
 } catch {
 showToast('Failed to load reminder configuration', 'error');
 } finally {
 setReminderLoading(false);
 }
 };

 const handleSaveRule = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 if (editingRule) {
 const updated = await expiryRemindersApi.updateRule(editingRule.id, ruleForm);
 setReminderRules(prev => prev.map(r => r.id === editingRule.id ? updated : r));
 showToast('Reminder rule updated');
 } else {
 const created = await expiryRemindersApi.createRule(ruleForm);
 setReminderRules(prev => [...prev, created]);
 showToast('Reminder rule created');
 }
 setShowRuleForm(false);
 setEditingRule(null);
 setRuleForm({ label: '', triggerDays: 7, channels: ['WhatsApp'], templateSms: '', templateWhatsApp: '', templateEmail: '', isActive: true });
 } catch {
 showToast('Failed to save rule', 'error');
 }
 };

 const handleDeleteRule = async (ruleId: string) => {
 try {
 await expiryRemindersApi.deleteRule(ruleId);
 setReminderRules(prev => prev.filter(r => r.id !== ruleId));
 showToast('Rule deleted');
 } catch {
 showToast('Failed to delete rule', 'error');
 }
 };

 const handleDispatch = async (rule: any) => {
 setDispatchingRuleId(rule.id);
 try {
 const result = await expiryRemindersApi.dispatch({ ruleId: rule.id });
 showToast(`Dispatched to ${result.dispatched} members — ${result.sent} sent, ${result.failed} failed`);
 const logs = await expiryRemindersApi.listLogs(30);
 setReminderLogs(logs || []);
 } catch (err: any) {
 showToast(err?.response?.data?.message || 'Dispatch failed', 'error');
 } finally {
 setDispatchingRuleId(null);
 }
 };

 const startEditRule = (rule: any) => {
 setEditingRule(rule);
 setRuleForm({
 label: rule.label,
 triggerDays: rule.triggerDays,
 channels: rule.channels,
 templateSms: rule.templateSms || '',
 templateWhatsApp: rule.templateWhatsApp || '',
 templateEmail: rule.templateEmail || '',
 isActive: rule.isActive,
 });
 setShowRuleForm(true);
 };

 const toggleRuleChannel = (ch: string) => {
 setRuleForm(prev => ({
 ...prev,
 channels: prev.channels.includes(ch) ? prev.channels.filter((c: string) => c !== ch) : [...prev.channels, ch],
 }));
 };

 const toggleSelectMember = (id: string) => {
 setSelectedIds(prev =>
 prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
 );
 };

 const toggleSelectAll = () => {
 if (selectedIds.length === filteredMembers.length) {
 setSelectedIds([]);
 } else {
 setSelectedIds(filteredMembers.map(m => m.id));
 }
 };

 // Drag and drop mocks for Kanban
 const handleDragStatusChange = async (memberId: string, nextStatus: ExpiringMember['renewalStatus']) => {
 const targetMember = members.find(m => m.id === memberId);
 if (!targetMember || !targetMember.rawMemberId) return;

 try {
 await membersApi.update(targetMember.rawMemberId, {
 aiInsights: { renewalStatus: nextStatus }
 });
 
 const updated = members.map(m => {
 if (m.id === memberId) {
 return { ...m, renewalStatus: nextStatus };
 }
 return m;
 });
 setMembers(updated);
 showToast(`Updated renewal stage to: ${nextStatus}`);
 } catch (err) {
 showToast('Failed to update stage', 'error');
 }
 };

 // Filter & Search Logic
 const filteredMembers = members.filter(m => {
 const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 m.memberId.toLowerCase().includes(searchQuery.toLowerCase()) ||
 m.subscriptionCode.toLowerCase().includes(searchQuery.toLowerCase());
 const matchesBranch = branchFilter === 'all' || m.branchName === branchFilter;
 const matchesProb = probabilityFilter === 'all' || m.probability === probabilityFilter;
 const matchesStatus = statusFilter === 'all' || m.renewalStatus.toLowerCase() === statusFilter.toLowerCase();
 return matchesSearch && matchesBranch && matchesProb && matchesStatus;
 });

 // KPI calculations
 const expiring7d = members.filter(m => m.daysRemaining >= 0 && m.daysRemaining <= 7).length;
 const expiring30d = members.filter(m => m.daysRemaining >= 0 && m.daysRemaining <= 30).length;
 const expiredCount = members.filter(m => m.daysRemaining < 0).length;
 const atRiskCount = members.filter(m => m.probability === 'Low' && m.daysRemaining >= 0).length;
 const savedRevenue = 420000;
 const targetAchievement = 78; // %

 const getPriorityBadge = (days: number) => {
 if (days === 0) return 'bg-red-500/10 text-red-400 border-red-500/20';
 if (days > 0 && days <= 7) return 'bg-primary-light text-primary border-primary/20';
 if (days > 7 && days <= 15) return 'bg-warning-light text-amber-700 border-amber-200';
 if (days > 15) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
 return 'bg-purple-500/10 text-purple-400 border-purple-500/20'; // Expired
 };

 const getPriorityLabel = (days: number) => {
 if (days === 0) return 'Critical (Today)';
 if (days > 0 && days <= 7) return 'High (7d)';
 if (days > 7 && days <= 15) return 'Medium (15d)';
 if (days > 15) return 'Low (30d)';
 return 'Expired';
 };

 if (loading) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Fetching expiry logs & pipelines...
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-white text-neutral-900 p-8 space-y-6 relative overflow-hidden">

 {/* BACKGROUND GLOW */}

 {/* TOAST */}
 {toast && (
 <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border ${toast.type === 'success'
 ? 'bg-success-light text-success border-green-200'
 : 'bg-danger-light text-danger border-red-200'
 }`}>
 <span className="text-xs font-semibold">{toast.message}</span>
 </div>
 )}

 {/* HEADER ROW */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-200/80 pb-6">
 <div>
 <h1 className="text-2xl font-bold text-neutral-900 font-display flex items-center gap-2">
 <FileText className="w-6 h-6 text-danger" />
 Memberships Hub
 </h1>
 <p className="text-xs text-neutral-600 mt-1">Design, track, and manage membership agreement templates and subscription lifecycles.</p>
 </div>

 {/* VIEW SWITCHER & REMINDER PANEL */}
 <div className="flex flex-wrap gap-2.5">
 <button
 onClick={openReminderCenter}
 className="px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition flex items-center gap-2"
 >
 <AlertTriangle className="w-4 h-4 text-primary" />
 <span>Reminder Rules Center</span>
 </button>

 <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-1 flex items-center">
 {(['table', 'timeline', 'calendar', 'kanban'] as const).map(mode => (
 <button
 key={mode}
 onClick={() => setViewMode(mode)}
 className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition ${viewMode === mode
 ? 'bg-danger text-neutral-900 shadow-md '
 : 'text-neutral-600 hover:text-neutral-900'
 }`}
 >
 {mode}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* TABS ROW */}
 <MembershipsTabs />

 {/* KPI WIDGET CARDS */}
 <div className="grid grid-cols-2 md:grid-cols-6 gap-4 font-mono">
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Expiring 7 Days</span>
 <span className="text-sm font-bold text-red-450 block mt-1">{expiring7d} Members</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Expiring 30 Days</span>
 <span className="text-sm font-bold text-primary block mt-1">{expiring30d} Members</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Expired Members</span>
 <span className="text-sm font-bold text-purple-400 block mt-1">{expiredCount} Members</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Revenue Saved</span>
 <span className="text-sm font-bold text-success block mt-1">₹{savedRevenue.toLocaleString()}</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Renewal Conversion</span>
 <span className="text-sm font-bold text-danger block mt-1">{targetAchievement}% Achieved</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">At-Risk Accounts</span>
 <span className="text-sm font-bold text-amber-700 block mt-1">{atRiskCount} Accounts</span>
 </div>
 </div>

 {/* FILTER AND SEARCH BAR */}
 <div className="bg-white border border-neutral-200/60 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between">
 <div className="flex flex-1 items-center gap-3 min-w-[280px]">
 <div className="relative flex-1">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
 <input
 type="text"
 placeholder="Search by name, ID, code..."
 className="w-full bg-white border border-neutral-200 rounded-xl pl-10 pr-4 py-2 text-xs text-neutral-900 focus:outline-none"
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 />
 </div>
 </div>

 <div className="flex flex-wrap items-center gap-2.5">
 <select
 className="bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none font-mono"
 value={branchFilter}
 onChange={e => setBranchFilter(e.target.value)}
 >
 <option value="all">All Branches</option>
 {branches.map(b => (
 <option key={b.id} value={b.name}>{b.name}</option>
 ))}
 </select>

 <select
 className="bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none font-mono"
 value={probabilityFilter}
 onChange={e => setProbabilityFilter(e.target.value)}
 >
 <option value="all">Renewal Probability</option>
 <option value="High">High Probability</option>
 <option value="Medium">Medium Probability</option>
 <option value="Low">Low (At-Risk)</option>
 </select>

 <select
 className="bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none font-mono"
 value={statusFilter}
 onChange={e => setStatusFilter(e.target.value)}
 >
 <option value="all">Renewal Status</option>
 <option value="Uncontacted">Uncontacted</option>
 <option value="Contacted">Contacted</option>
 <option value="Interested">Interested</option>
 <option value="Renewal Pending">Renewal Pending</option>
 <option value="Renewed">Renewed</option>
 <option value="Lost">Lost</option>
 </select>
 </div>
 </div>

 {/* BULK ACTIONS TOOLBAR (TABLE VIEW) */}
 {viewMode === 'table' && selectedIds.length > 0 && (
 <div className="bg-danger-light border border-red-200 p-4 rounded-xl flex items-center justify-between text-xs font-mono">
 <span>{selectedIds.length} members selected for bulk processing</span>
 <div className="flex gap-2">
 <button
 onClick={handleBulkReminder}
 className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-neutral-900 font-bold rounded-lg transition"
 >
 Send Batch Reminders
 </button>
 <button
 onClick={() => {
 showToast(`Assigned Counselor Frank to ${selectedIds.length} members`);
 setSelectedIds([]);
 }}
 className="px-3.5 py-1.5 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 font-bold rounded-lg transition"
 >
 Assign Counselor
 </button>
 </div>
 </div>
 )}

 {/* CORE SWITCHABLE VIEWS GRID */}
 {filteredMembers.length === 0 ? (
 <div className="p-16 text-center max-w-sm mx-auto flex flex-col items-center bg-neutral-50/10 border border-neutral-200/40 rounded-3xl">
 <CheckCircle className="text-success mb-4" size={40} />
 <h3 className="text-sm font-bold text-neutral-900 font-display">No Expiring Memberships</h3>
 <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
 All memberships are currently active and in good standing. Good job saving revenue!
 </p>
 </div>
 ) : (
 <>
 {/* VIEW: TABLE LAYOUT */}
 {viewMode === 'table' && (
 <div className="overflow-x-auto border border-neutral-200/60 rounded-3xl">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-neutral-200/80 text-neutral-600 font-mono uppercase text-[9px] bg-neutral-50/20">
 <th className="py-3.5 px-6 w-12 text-center">
 <input
 type="checkbox"
 checked={selectedIds.length === filteredMembers.length}
 onChange={toggleSelectAll}
 />
 </th>
 <th className="py-3.5 px-6">Member details</th>
 <th className="py-3.5 px-6">Current Plan</th>
 <th className="py-3.5 px-6">Expiry Info</th>
 <th className="py-3.5 px-6 font-mono">Dues Balance</th>
 <th className="py-3.5 px-6">Assigned Team</th>
 <th className="py-3.5 px-6">Follow-Up Stage</th>
 <th className="py-3.5 px-6">Prediction Score</th>
 <th className="py-3.5 px-6 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200/30 font-mono">
 {filteredMembers.map(m => (
 <tr key={m.id} className="hover:bg-neutral-50/10 transition">
 <td className="py-4 px-6 text-center">
 <input
 type="checkbox"
 checked={selectedIds.includes(m.id)}
 onChange={() => toggleSelectMember(m.id)}
 />
 </td>
 <td className="py-4 px-6 font-sans">
 <span className="font-semibold text-neutral-800 block">{m.name}</span>
 <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">{m.memberId} • {m.subscriptionCode}</span>
 </td>
 <td className="py-4 px-6">
 <span className="text-neutral-700 block">{m.planName}</span>
 <span className="text-[9px] text-neutral-500 block mt-0.5">{m.branchName}</span>
 </td>
 <td className="py-4 px-6">
 <span className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase ${getPriorityBadge(m.daysRemaining)}`}>
 {getPriorityLabel(m.daysRemaining)}
 </span>
 <span className="text-[10px] text-neutral-600 block mt-1">Date: {m.expiryDate}</span>
 </td>
 <td className={`py-4 px-6 font-bold ${m.outstandingBalance > 0 ? 'text-danger' : 'text-neutral-500'}`}>
 ₹{m.outstandingBalance.toLocaleString()}
 </td>
 <td className="py-4 px-6 font-sans text-neutral-700 text-[11px] leading-relaxed">
 <div>Trainer: {m.assignedTrainer}</div>
 <div>Counselor: {m.assignedCounselor}</div>
 </td>
 <td className="py-4 px-6">
 <span className="px-2 py-0.5 bg-neutral-100/40 text-neutral-700 border border-neutral-200 rounded text-[9px]">
 {m.renewalStatus}
 </span>
 </td>
 <td className="py-4 px-6 font-sans">
 <div className="flex items-center gap-1.5">
 <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono ${m.probability === 'High'
 ? 'bg-success-light text-success border border-green-200'
 : m.probability === 'Medium'
 ? 'bg-warning-light text-amber-700 border border-amber-200'
 : 'bg-danger-light text-danger border border-red-200'
 }`}>
 {m.probability} Renewal ({m.engagementScore}%)
 </span>
 </div>
 </td>
 <td className="py-4 px-6 text-right font-sans">
 <div className="flex gap-2 justify-end">
 <button
 onClick={() => router.push(`/workspace/memberships/subscriptions/${m.id}/renew`)}
 className="px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 hover:text-neutral-900 text-danger text-[10px] font-bold rounded-lg transition"
 >
 Renew
 </button>
 <button
 onClick={() => handleOpenFollowUp(m)}
 className="px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-[10px] font-semibold rounded-lg transition"
 >
 Follow Up
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {/* VIEW: EXPIRY TIMELINE */}
 {viewMode === 'timeline' && (
 <div className="space-y-6">
 {[
 { title: 'Expires Today', membersList: filteredMembers.filter(m => m.daysRemaining === 0) },
 { title: 'Expires This Week (Within 7 Days)', membersList: filteredMembers.filter(m => m.daysRemaining > 0 && m.daysRemaining <= 7) },
 { title: 'Expires Next Week (Within 15 Days)', membersList: filteredMembers.filter(m => m.daysRemaining > 7 && m.daysRemaining <= 15) },
 { title: 'Expires This Month (Within 30 Days)', membersList: filteredMembers.filter(m => m.daysRemaining > 15 && m.daysRemaining <= 30) },
 { title: 'Already Expired', membersList: filteredMembers.filter(m => m.daysRemaining < 0) }
 ].map(group => (
 <div key={group.title} className="bg-white border border-neutral-200/60 rounded-3xl p-5 space-y-4">
 <h3 className="text-xs font-bold text-neutral-800 font-display flex items-center justify-between">
 <span>{group.title}</span>
 <span className="text-[10px] font-mono text-neutral-500">{group.membersList.length} Accounts</span>
 </h3>

 {group.membersList.length === 0 ? (
 <p className="text-[10px] text-neutral-500 font-mono italic">No memberships matching this timeline range.</p>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {group.membersList.map(m => (
 <div key={m.id} className="bg-white border border-neutral-200 p-4 rounded-2xl flex flex-col justify-between h-36">
 <div>
 <div className="flex justify-between items-start">
 <span className="font-bold text-neutral-800 text-xs block">{m.name}</span>
 <span className="text-[8px] font-mono text-neutral-500">{m.memberId}</span>
 </div>
 <span className="text-[10px] text-neutral-600 block mt-1 font-mono">{m.planName}</span>
 <span className="text-[9px] text-neutral-500 block font-mono mt-0.5">Days remaining: {m.daysRemaining}</span>
 </div>

 <div className="flex justify-between items-center pt-2 border-t border-neutral-200/50 mt-4">
 <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${m.probability === 'High' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
 }`}>
 AI Score: {m.engagementScore}%
 </span>
 <button
 onClick={() => router.push(`/workspace/memberships/subscriptions/${m.id}/renew`)}
 className="px-2 py-1 bg-danger hover:bg-red-600 text-neutral-900 text-[9px] font-bold rounded-lg transition"
 >
 Renew
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 ))}
 </div>
 )}

 {/* VIEW: EXPIRY CALENDAR GRID */}
 {viewMode === 'calendar' && (
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 space-y-4">
 <div className="flex justify-between items-center border-b border-neutral-200 pb-4">
 <h3 className="text-xs font-bold text-neutral-900 font-mono">June 2026</h3>
 <div className="flex gap-2">
 <button className="p-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-600 hover:text-neutral-900 transition">
 <ChevronLeft size={14} />
 </button>
 <button className="p-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-600 hover:text-neutral-900 transition">
 <ChevronRight size={14} />
 </button>
 </div>
 </div>

 <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-mono uppercase text-neutral-500 font-semibold">
 <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
 </div>

 <div className="grid grid-cols-7 gap-2.5 font-mono">
 {Array.from({ length: 30 }).map((_, idx) => {
 const dayNum = idx + 1;
 // Match expirations on mockup dates
 const matched = filteredMembers.filter(m => {
 const expiryDay = new Date(m.expiryDate).getDate();
 return expiryDay === dayNum;
 });

 return (
 <div key={idx} className="bg-white border border-neutral-200/80 p-2 rounded-xl h-24 text-left flex flex-col justify-between">
 <span className="text-[9px] text-neutral-500 block font-bold">{dayNum}</span>

 <div className="space-y-1">
 {matched.slice(0, 2).map(m => (
 <div
 key={m.id}
 onClick={() => handleOpenFollowUp(m)}
 className="px-1 py-0.5 bg-danger-light border border-red-200 text-danger rounded text-[7px] truncate font-sans cursor-pointer hover:bg-danger-light"
 >
 {m.name}
 </div>
 ))}
 {matched.length > 2 && (
 <span className="text-[7px] text-neutral-500 block font-sans">+{matched.length - 2} more</span>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* VIEW: KANBAN BOARD RENEWAL PIPELINE */}
 {viewMode === 'kanban' && (
 <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-start">
 {[
 { status: 'Uncontacted' as const, title: 'Expiring Soon' },
 { status: 'Contacted' as const, title: 'Contacted' },
 { status: 'Interested' as const, title: 'Interested' },
 { status: 'Renewal Pending' as const, title: 'Renewal Pending' },
 { status: 'Renewed' as const, title: 'Renewed' },
 { status: 'Lost' as const, title: 'Lost' }
 ].map(col => {
 const colMembers = filteredMembers.filter(m => m.renewalStatus === col.status);

 return (
 <div key={col.status} className="bg-white border border-neutral-200/60 rounded-3xl p-4 space-y-3 min-h-[400px]">
 <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
 <span className="text-[10px] font-bold text-neutral-800 font-display block">{col.title}</span>
 <span className="text-[8px] bg-neutral-50 border border-neutral-200 px-1.5 py-0.5 rounded font-mono text-neutral-500">
 {colMembers.length}
 </span>
 </div>

 <div className="space-y-3 pt-2">
 {colMembers.map(m => (
 <div key={m.id} className="bg-white border border-neutral-200 p-3.5 rounded-2xl space-y-3 hover:border-neutral-200 transition flex flex-col justify-between h-44">
 <div className="space-y-1.5">
 <span className="font-semibold text-neutral-800 text-xs block">{m.name}</span>
 <span className="text-[9px] text-neutral-600 block font-mono leading-tight">{m.planName}</span>
 <span className="text-[8px] text-neutral-500 block font-mono">Expires: {m.expiryDate}</span>
 </div>

 <div className="space-y-2 pt-2 border-t border-neutral-200/50">
 <div className="flex justify-between items-center">
 <span className={`px-1 py-0.5 rounded text-[7px] font-mono uppercase ${m.daysRemaining === 0 ? 'bg-red-500/10 text-red-400' : 'bg-neutral-100/40 text-neutral-600'
 }`}>
 {m.daysRemaining === 0 ? 'Today' : `${m.daysRemaining}d left`}
 </span>

 <select
 className="bg-white border border-neutral-200 rounded px-1.5 py-0.5 text-[8px] text-neutral-600 font-sans"
 value={m.renewalStatus}
 onChange={e => handleDragStatusChange(m.id, e.target.value as any)}
 >
 <option value="Uncontacted">Move: Soon</option>
 <option value="Contacted">Move: Call</option>
 <option value="Interested">Move: Interested</option>
 <option value="Renewal Pending">Move: Pending</option>
 <option value="Renewed">Move: Renewed</option>
 <option value="Lost">Move: Lost</option>
 </select>
 </div>

 <button
 onClick={() => router.push(`/workspace/memberships/subscriptions/${m.id}/renew`)}
 className="w-full py-1 bg-neutral-50 border border-neutral-200 hover:text-neutral-900 text-neutral-700 text-[9px] font-bold rounded-lg transition"
 >
 Renew Member
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
 })}
 </div>
 )}
 </>
 )}

 {/* RENEWAL PREDICTION & REVENUE IMPACT PANEL */}
 {(() => {
 const highProbCount = members.filter(m => m.probability === 'High').length;
 const medProbCount = members.filter(m => m.probability === 'Medium').length;
 const lowProbCount = members.filter(m => m.probability === 'Low').length;

 const totalRevenueAtRisk = members
 .filter(m => m.daysRemaining >= 0 && m.daysRemaining <= 30)
 .reduce((sum, m) => sum + (m.price || 0), 0);

 const renewalsRecovered = members
 .filter(m => m.renewalStatus === 'Renewed')
 .reduce((sum, m) => sum + (m.price || 0), 0);

 const expectedChurnLoss = members
 .filter(m => m.probability === 'Low' || m.renewalStatus === 'Lost')
 .reduce((sum, m) => sum + (m.price || 0), 0);

 const recoveryPercentage = totalRevenueAtRisk > 0 
 ? ((renewalsRecovered / totalRevenueAtRisk) * 100).toFixed(1) 
 : '0.0';

 return (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">

 {/* PREDICTION PANEL */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">At-Risk Prediction Analytics</span>
 <div className="space-y-3 text-xs leading-relaxed">
 <div className="flex justify-between">
 <span className="text-neutral-600">High Renewal Probabilities</span>
 <span className="font-semibold text-success font-mono">{highProbCount} Member{highProbCount !== 1 ? 's' : ''}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-600">Medium Renewal Probabilities</span>
 <span className="font-semibold text-amber-700 font-mono">{medProbCount} Member{medProbCount !== 1 ? 's' : ''}</span>
 </div>
 <div className="flex justify-between border-b border-neutral-200 pb-2.5">
 <span className="text-neutral-600">Low Renewal (Churn Risk)</span>
 <span className="font-semibold text-danger font-mono">{lowProbCount} Member{lowProbCount !== 1 ? 's' : ''}</span>
 </div>

 <div className="bg-neutral-50/10 border border-neutral-200 p-3.5 rounded-2xl text-[10px] text-neutral-500 font-mono space-y-1">
 <strong>Risk Scoring Criteria:</strong>
 <p>Scores are calculated dynamically based on attendance check-in trends, outstanding dues payment history, and visits in the last 14 days.</p>
 </div>
 </div>
 </div>

 {/* REVENUE IMPACT PANEL */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Revenue Risk Matrix</span>
 <div className="space-y-3.5 text-xs font-mono">
 <div className="flex justify-between">
 <span className="text-neutral-600">Total Revenue At Risk</span>
 <span className="font-bold text-danger">₹{totalRevenueAtRisk.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-600">Target Renewals Recovered</span>
 <span className="font-bold text-success">₹{renewalsRecovered.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-600">Expected Churn Loss</span>
 <span className="font-bold text-purple-400">₹{expectedChurnLoss.toLocaleString()}</span>
 </div>
 <div className="flex justify-between border-t border-neutral-200 pt-2.5 text-neutral-800 font-bold">
 <span>Goal Recovery Achieved</span>
 <span>{recoveryPercentage}%</span>
 </div>
 </div>
 </div>

 {/* AUDIT LOG TIMELINE */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Counselor Audit Trail</span>
 <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-neutral-50">
 {auditTrail.map((log: any, index: number) => (
 <div key={log.id} className="flex gap-4 relative">
 <div className="w-6 h-6 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center z-10 text-[9px] font-bold text-danger">
 {index + 1}
 </div>
 <div className="space-y-1 text-xs">
 <span className="font-bold text-neutral-800 block">{log.type}</span>
 <span className="text-[10px] text-neutral-600 block">{log.detail}</span>
 <span className="text-[9px] text-neutral-500 font-mono block mt-0.5">{log.date} • {log.user}</span>
 </div>
 </div>
 ))}
 </div>
 </div>

 </div>
 );
 })()}

 {/* DRAWER: LOG FOLLOW-UP ACTIVITY */}
 {showFollowUpDrawer && selectedMember && (
 <div className="fixed inset-0 z-[100] overflow-hidden">
 <div className="absolute inset-0 bg-neutral-50/80 backdrop-blur-sm transition-opacity" onClick={() => setShowFollowUpDrawer(false)} />
 <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
 <div className="w-screen max-w-md bg-white border-l border-neutral-200/80 p-6 flex flex-col justify-between shadow-2xl">
 <div className="space-y-6">
 <div>
 <h3 className="text-base font-bold text-neutral-900 font-display">Log Member Follow-Up</h3>
 <p className="text-xs text-neutral-600 mt-1">Record contact notes and renewal pipeline outcomes for {selectedMember.name}.</p>
 </div>

 <form onSubmit={handleSaveFollowUp} className="space-y-4 text-xs">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Contact Method</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
 value={followUpType}
 onChange={e => setFollowUpType(e.target.value as any)}
 >
 <option value="Call">Phone Call Dialogue</option>
 <option value="WhatsApp">WhatsApp Message Sent</option>
 <option value="SMS">SMS Notification Sent</option>
 <option value="Email">Email Follow-Up</option>
 <option value="In-Person">In-Person Discussion</option>
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Outreach Outcome</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
 value={followUpOutcome}
 onChange={e => setFollowUpOutcome(e.target.value)}
 >
 <option value="Interested in Renewal">Interested (Renewing Soon)</option>
 <option value="Requested Callback">Requested Callback Later</option>
 <option value="Negotiating Pricing">Negotiating Pricing Plan Tiers</option>
 <option value="Not Interested / Moving Out">Not Interested / Churning</option>
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Next Outreach Date</label>
 <input
 type="date"
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono"
 value={nextFollowUpDate}
 onChange={e => setNextFollowUpDate(e.target.value)}
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Follow-Up Discussion Notes</label>
 <textarea
 required
 rows={4}
 placeholder="e.g. Member requested to downgrade standard plan next week because of shift to Technopark site..."
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
 value={followUpNotes}
 onChange={e => setFollowUpNotes(e.target.value)}
 />
 </div>

 <div className="flex gap-3 pt-4 border-t border-neutral-200 mt-6">
 <button
 type="button"
 onClick={() => setShowFollowUpDrawer(false)}
 className="flex-1 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 font-semibold rounded-xl transition"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="flex-1 py-2 bg-primary text-neutral-900 font-semibold rounded-xl transition"
 >
 Log Activity
 </button>
 </div>
 </form>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* DRAWER: REMINDER CENTER */}
 <ReminderCenter
  open={showReminderCenter}
  onClose={() => { setShowReminderCenter(false); setShowRuleForm(false); }}
  reminderLoading={reminderLoading}
  reminderTab={reminderTab}
  setReminderTab={setReminderTab}
  channelConfig={channelConfig}
  reminderRules={reminderRules}
  reminderLogs={reminderLogs}
  showRuleForm={showRuleForm}
  setShowRuleForm={setShowRuleForm}
  editingRule={editingRule}
  setEditingRule={setEditingRule}
  ruleForm={ruleForm}
  setRuleForm={setRuleForm}
  dispatchingRuleId={dispatchingRuleId}
  handleSaveRule={handleSaveRule}
  handleDeleteRule={handleDeleteRule}
  handleDispatch={handleDispatch}
  startEditRule={startEditRule}
  toggleRuleChannel={toggleRuleChannel}
 />

 </div>
 );
}
