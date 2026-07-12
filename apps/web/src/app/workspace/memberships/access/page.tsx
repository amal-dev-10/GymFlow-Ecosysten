'use client';

import React, { useState, useEffect, Suspense } from 'react';
import {
 Search,
 CheckCircle,
 XCircle,
 History,
 ShieldAlert,
 Plus,
 RefreshCw,
 Zap,
 Building,
 Loader2
} from 'lucide-react';
import { gymApi, membersApi, membershipsApi, attendanceApi } from '../../../../lib/api';
import { Pagination } from '../../../../components/ui';
import MembershipsTabs from '../MembershipsTabs';

// Real shapes derived from live API data
interface BranchInfo {
 id: string;
 name: string;
 capacity: number;
 currentOccupancy: number;
}

interface MemberAccessRule {
 id: string;
 memberName: string;
 memberId: string;
 homeBranchId: string;
 homeBranchName: string;
 accessType: 'Single' | 'Multi' | 'All';
 allowedBranchIds: string[];
 planName: string;
 activeMembershipId: string | null;
 status: string;
 lastCheckinTime?: string;
 lastCheckinBranch?: string;
}

interface AccessLog {
 id: string;
 memberName: string;
 memberId: string;
 branchName: string;
 branchId: string;
 timestamp: string;
 status: 'Granted' | 'Denied';
 reason?: string;
}

function MultiBranchAccessContent() {
 // Basic Page States
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [userRole, setUserRole] = useState('manager');
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 // Search and Filters
 const [searchTerm, setSearchTerm] = useState('');
 const [homeBranchFilter, setHomeBranchFilter] = useState('all');
 const [accessFilter, setAccessFilter] = useState('all');

 // Pagination for the entitlements queue table
 const [page, setPage] = useState(1);
 const pageSize = 8;

 // Live data
 const [branches, setBranches] = useState<BranchInfo[]>([]);
 const [plans, setPlans] = useState<any[]>([]);
 const [memberAccessList, setMemberAccessList] = useState<MemberAccessRule[]>([]);
 const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
 const [homeBranchCounts, setHomeBranchCounts] = useState<{ id: string; name: string; count: number }[]>([]);

 // Drawers and Modal states
 const [showAssignDrawer, setShowAssignDrawer] = useState(false);
 const [showTransferDrawer, setShowTransferDrawer] = useState(false);
 const [showSimulatorModal, setShowSimulatorModal] = useState(false);
 const [selectedMember, setSelectedMember] = useState<MemberAccessRule | null>(null);

 // Simulator States (real multi-layer validation result)
 const [simCheckinBranch, setSimCheckinBranch] = useState('');
 const [simulating, setSimulating] = useState(false);
 const [simResult, setSimResult] = useState<any>(null);

 // Assignment Drawer Form States
 const [assignFormMemberId, setAssignFormMemberId] = useState('');
 const [assignFormPlanId, setAssignFormPlanId] = useState('');

 // Transfer Drawer Form States
 const [transferFormMemberId, setTransferFormMemberId] = useState('');
 const [transferTargetBranchId, setTransferTargetBranchId] = useState('');

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 // Translate a plan's branchAccess string into an access tier + branch id list.
 const deriveAccess = (member: any, gymList: BranchInfo[]): MemberAccessRule => {
 const active = member.activeMembership;
 const plan = active?.membershipPlan;
 const homeBranchId = member.homeGymId;
 const homeBranchName = member.homeGym?.name || 'Unassigned';

 let accessType: 'Single' | 'Multi' | 'All' = 'Single';
 let allowedBranchIds: string[] = [homeBranchId].filter(Boolean);

 if (plan) {
 if (plan.branchAccess === 'all') {
 accessType = 'All';
 allowedBranchIds = gymList.map(b => b.id);
 } else if (plan.branchAccess) {
 const ids = String(plan.branchAccess).split(',').map((s: string) => s.trim()).filter(Boolean);
 allowedBranchIds = ids.length ? ids : [homeBranchId].filter(Boolean);
 accessType = allowedBranchIds.length > 1 ? 'Multi' : 'Single';
 }
 }

 return {
 id: member.id,
 memberName: `${member.firstName} ${member.lastName}`.trim(),
 memberId: member.id,
 homeBranchId,
 homeBranchName,
 accessType,
 allowedBranchIds,
 planName: plan?.name || 'No Active Plan',
 activeMembershipId: active?.id || null,
 status: active?.status || 'Inactive',
 };
 };

 const loadData = async () => {
 try {
 setLoading(true);
 const orgId = localStorage.getItem('organizationId') || '';

 const [gyms, membersRaw, plansList, logsRes] = await Promise.all([
 gymApi.list(orgId),
 membersApi.list(),
 membershipsApi.listPlans(),
 attendanceApi.search({ limit: 50 }),
 ]);

 // Live occupancy per branch (best effort — falls back gracefully).
 const occupancies = await Promise.all(
 (gyms || []).map((g: any) =>
 gymApi.getOccupancy(g.id).catch(() => null)
 )
 );
 const gymList: BranchInfo[] = (gyms || []).map((g: any, i: number) => ({
 id: g.id,
 name: g.name,
 capacity: occupancies[i]?.capacity ?? (g.settings?.capacity || 100),
 currentOccupancy: occupancies[i]?.current ?? 0,
 }));
 setBranches(gymList);
 if (gymList.length && !simCheckinBranch) setSimCheckinBranch(gymList[0].id);

 setPlans(plansList || []);

 // Member access rules from real plan entitlements.
 const rules = (membersRaw || []).map((m: any) => deriveAccess(m, gymList));

 // Real access-validation logs from attendance history.
 const logs: AccessLog[] = (logsRes?.items || []).map((it: any) => ({
 id: it.id,
 memberName: it.memberName,
 memberId: it.memberId,
 branchName: it.branchName,
 branchId: it.branchId,
 timestamp: new Date(it.checkInTime).toLocaleString(),
 status: it.status === 'Denied Entry' ? 'Denied' : 'Granted',
 reason: it.reason || (it.status === 'Denied Entry' ? 'Access denied at gate' : undefined),
 }));
 setAccessLogs(logs);

 // Merge each member's most-recent check-in (logs are sorted newest-first).
 const lastByMember = new Map<string, AccessLog>();
 for (const log of logs) {
 if (!lastByMember.has(log.memberId)) lastByMember.set(log.memberId, log);
 }
 const enriched = rules.map(r => {
 const last = lastByMember.get(r.memberId);
 return last
 ? { ...r, lastCheckinTime: last.timestamp, lastCheckinBranch: last.branchName }
 : r;
 });
 setMemberAccessList(enriched);

 // Members per home branch (Access Allocation Overview).
 setHomeBranchCounts(
 gymList.map(b => ({
 id: b.id,
 name: b.name,
 count: (membersRaw || []).filter((m: any) => m.homeGymId === b.id).length,
 }))
 );
 } catch (err) {
 console.error(err);
 showToast('Failed to load branch access data', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 const userStr = localStorage.getItem('user');
 if (userStr) {
 try {
 const u = JSON.parse(userStr);
 if (u.role) setUserRole(u.role.toLowerCase());
 } catch (_) {}
 }
 loadData();
 }, []);

 const isTrainerOrDietitian = userRole === 'trainer' || userRole === 'dietitian';

 // Real multi-layer gate validation via the attendance engine.
 const handleSimulateCheckin = async () => {
 if (!selectedMember || !simCheckinBranch) return;
 try {
 setSimulating(true);
 setSimResult(null);
 const res = await attendanceApi.validateCheckIn(simCheckinBranch, selectedMember.memberId);
 setSimResult(res);
 const branchName = branches.find(b => b.id === simCheckinBranch)?.name || 'branch';
 if (res.success) {
 showToast(`Access GRANTED for ${selectedMember.memberName} at ${branchName}`);
 } else {
 showToast(`Access DENIED for ${selectedMember.memberName} at ${branchName}`, 'error');
 }
 } catch (err) {
 console.error(err);
 showToast('Validation failed', 'error');
 } finally {
 setSimulating(false);
 }
 };

 // Reassign a member's active membership to a plan that grants the desired
 // branch access. Access is plan-driven, so this is the real, persisted lever.
 const handleAssignSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (isTrainerOrDietitian) {
 showToast('Action restricted: Trainer/Dietitian is View-Only', 'error');
 return;
 }
 const matched = memberAccessList.find(m => m.memberId === assignFormMemberId);
 if (!matched) {
 showToast('Please select a member', 'error');
 return;
 }
 if (!matched.activeMembershipId) {
 showToast('Member has no active membership to reconfigure', 'error');
 return;
 }
 if (!assignFormPlanId) {
 showToast('Please select a plan', 'error');
 return;
 }
 try {
 setSaving(true);
 await membershipsApi.updateSubscription(matched.activeMembershipId, { membershipPlanId: assignFormPlanId });
 const planName = plans.find(p => p.id === assignFormPlanId)?.name || 'new plan';
 showToast(`${matched.memberName} moved to "${planName}" access plan`);
 setShowAssignDrawer(false);
 setAssignFormMemberId('');
 setAssignFormPlanId('');
 await loadData();
 } catch (err) {
 console.error(err);
 showToast('Failed to update access plan', 'error');
 } finally {
 setSaving(false);
 }
 };

 // Transfer a member's home branch (persists to member.homeGymId).
 const handleTransferSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (isTrainerOrDietitian) {
 showToast('Action restricted: Trainer/Dietitian is View-Only', 'error');
 return;
 }
 const matched = memberAccessList.find(m => m.memberId === transferFormMemberId);
 if (!matched) {
 showToast('Please select a member', 'error');
 return;
 }
 const targetBranch = branches.find(b => b.id === transferTargetBranchId);
 if (!targetBranch) {
 showToast('Please select a destination branch', 'error');
 return;
 }
 if (targetBranch.id === matched.homeBranchId) {
 showToast('Member already based at this branch', 'error');
 return;
 }
 try {
 setSaving(true);
 await membersApi.update(matched.memberId, { homeGymId: transferTargetBranchId });
 showToast(`Transferred ${matched.memberName} to ${targetBranch.name}`);
 setShowTransferDrawer(false);
 setTransferFormMemberId('');
 await loadData();
 } catch (err) {
 console.error(err);
 showToast('Failed to transfer member', 'error');
 } finally {
 setSaving(false);
 }
 };

 // Upgrade a member onto an existing all-branch access plan.
 const handleQuickUpgrade = async (memberId: string) => {
 if (isTrainerOrDietitian) {
 showToast('Action restricted: Trainer/Dietitian is View-Only', 'error');
 return;
 }
 const matched = memberAccessList.find(m => m.memberId === memberId);
 if (!matched?.activeMembershipId) {
 showToast('Member has no active membership to upgrade', 'error');
 return;
 }
 const allPlan = plans.find(p => p.branchAccess === 'all' && p.status === 'Active')
 || plans.find(p => p.branchAccess === 'all');
 if (!allPlan) {
 showToast('No all-branch access plan is configured yet', 'error');
 return;
 }
 try {
 setSaving(true);
 await membershipsApi.updateSubscription(matched.activeMembershipId, { membershipPlanId: allPlan.id });
 showToast(`${matched.memberName} upgraded to "${allPlan.name}" (all-branch access)`);
 setShowSimulatorModal(false);
 await loadData();
 } catch (err) {
 console.error(err);
 showToast('Failed to process upgrade', 'error');
 } finally {
 setSaving(false);
 }
 };

 // Filtered members list
 const filteredMembers = memberAccessList.filter(m => {
 const matchesSearch = m.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
 m.memberId.toLowerCase().includes(searchTerm.toLowerCase());
 const matchesHomeBranch = homeBranchFilter === 'all' || m.homeBranchId === homeBranchFilter;
 const matchesAccess = accessFilter === 'all' || m.accessType.toLowerCase() === accessFilter.toLowerCase();
 return matchesSearch && matchesHomeBranch && matchesAccess;
 });

 // Reset to the first page whenever the filtered set changes.
 useEffect(() => {
 setPage(1);
 }, [searchTerm, homeBranchFilter, accessFilter]);

 const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
 const currentPage = Math.min(page, totalPages);
 const pagedMembers = filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

 // Derived KPIs (all real)
 const totalMembers = memberAccessList.length;
 const allAccessCount = memberAccessList.filter(m => m.accessType === 'All').length;
 const singleAccessCount = memberAccessList.filter(m => m.accessType === 'Single').length;
 const multiAccessCount = memberAccessList.filter(m => m.accessType === 'Multi').length;
 const liveOccupancy = branches.reduce((sum, b) => sum + b.currentOccupancy, 0);

 // Real upgrade opportunities: non-all-access members with denied gate events.
 const upgradeRecommendations = (() => {
 const map = new Map<string, { memberName: string; memberId: string; currentPlan: string; crossBranchAttempts: number }>();
 for (const log of accessLogs) {
 if (log.status !== 'Denied') continue;
 const m = memberAccessList.find(x => x.memberId === log.memberId);
 if (!m || m.accessType === 'All') continue;
 const existing = map.get(m.memberId);
 if (existing) existing.crossBranchAttempts++;
 else map.set(m.memberId, { memberName: m.memberName, memberId: m.memberId, currentPlan: m.planName, crossBranchAttempts: 1 });
 }
 return Array.from(map.values()).sort((a, b) => b.crossBranchAttempts - a.crossBranchAttempts);
 })();

 if (loading) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Loading branch access matrix...
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-white text-neutral-900 p-8 space-y-6 relative overflow-hidden">

 {/* Toast Notification */}
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
 <Building className="w-6 h-6 text-danger" />
 Multi-Branch Access
 </h1>
 <p className="text-xs text-neutral-600 mt-1">Manage branch entitlements, transfer home branches, and validate check-in access across locations.</p>
 </div>

 {/* Action Controls */}
 <div className="flex gap-2">
 {isTrainerOrDietitian && (
 <div className="px-3 py-2 bg-warning-light border border-amber-200 text-amber-700 text-[10px] rounded-xl flex items-center gap-2 font-mono uppercase">
 <ShieldAlert className="w-4 h-4" />
 <span>Trainer/Dietitian View Only</span>
 </div>
 )}

 {!isTrainerOrDietitian && (
 <>
 <button
 onClick={() => setShowTransferDrawer(true)}
 className="px-4 py-2.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition flex items-center gap-2"
 >
 <RefreshCw className="w-4 h-4 text-danger" />
 <span>Transfer Branch</span>
 </button>
 <button
 onClick={() => setShowAssignDrawer(true)}
 className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-neutral-900 text-xs font-semibold rounded-xl transition flex items-center gap-2 shadow-lg"
 >
 <Plus className="w-4 h-4" />
 <span>Configure Access</span>
 </button>
 </>
 )}
 </div>
 </div>

 {/* TABS ROW */}
 <MembershipsTabs />

 {/* KPI METRIC CARDS */}
 <div className="grid grid-cols-2 md:grid-cols-5 gap-4 font-mono">
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Members Tracked</span>
 <span className="text-sm font-bold text-neutral-800 block mt-1">{totalMembers}</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">All-Branch Access</span>
 <span className="text-sm font-bold text-success block mt-1">{allAccessCount} Members</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Single-Branch</span>
 <span className="text-sm font-bold text-danger block mt-1">{singleAccessCount} Members</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Multi-Branch</span>
 <span className="text-sm font-bold text-cyan-500 block mt-1">{multiAccessCount} Members</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Live Occupancy</span>
 <span className="text-sm font-bold text-purple-500 block mt-1">{liveOccupancy} Inside</span>
 </div>
 </div>

 {/* BRANCH OCCUPANCY MONITOR PANEL */}
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-5 space-y-4">
 <div className="flex justify-between items-center">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Live Branch Occupancy & Capacity Monitor</span>
 <span className="text-[9px] text-success font-mono flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-success animate-pulse" /> Live feeds synced
 </span>
 </div>

 {branches.length === 0 ? (
 <div className="p-8 text-center border border-dashed border-neutral-200 rounded-2xl text-xs text-neutral-500">
 No branches configured for this organization yet.
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 {branches.map((b) => {
 const pct = b.capacity > 0 ? Math.round((b.currentOccupancy / b.capacity) * 100) : 0;
 return (
 <div key={b.id} className="bg-white border border-neutral-200 p-4 rounded-2xl space-y-2">
 <div className="flex justify-between items-start">
 <div>
 <h4 className="text-xs font-bold text-neutral-800">{b.name}</h4>
 <span className="text-[9px] text-neutral-500 font-mono">Limit: {b.capacity}</span>
 </div>
 <span className="text-xs font-bold text-danger font-mono">{pct}%</span>
 </div>

 <div className="w-full h-1.5 bg-neutral-50 rounded-full overflow-hidden">
 <div
 className="h-full bg-primary rounded-full transition-all duration-500"
 style={{ width: `${Math.min(100, pct)}%` }}
 />
 </div>

 <div className="flex justify-between text-[9px] text-neutral-500 font-mono pt-1">
 <span>Current: <strong>{b.currentOccupancy} inside</strong></span>
 <span>Slots Left: {Math.max(0, b.capacity - b.currentOccupancy)}</span>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>

 {/* CORE WORKSPACE GRID */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

 {/* LEFT COLUMN: LISTINGS & SIMULATOR LOGS */}
 <div className="lg:col-span-2 space-y-6">

 {/* SEARCH & FILTERS CONTROLS */}
 <div className="bg-white border border-neutral-200/60 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between">
 <div className="flex flex-1 items-center gap-3 min-w-[280px]">
 <div className="relative flex-1">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
 <input
 type="text"
 placeholder="Search member access list..."
 className="w-full bg-white border border-neutral-200 rounded-xl pl-10 pr-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-red-200"
 value={searchTerm}
 onChange={e => setSearchTerm(e.target.value)}
 />
 </div>
 </div>

 <div className="flex items-center gap-3">
 <select
 className="bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs text-neutral-700 focus:outline-none"
 value={homeBranchFilter}
 onChange={e => setHomeBranchFilter(e.target.value)}
 >
 <option value="all">All Home Branches</option>
 {branches.map(b => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>

 <select
 className="bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs text-neutral-700 focus:outline-none"
 value={accessFilter}
 onChange={e => setAccessFilter(e.target.value)}
 >
 <option value="all">All Access Levels</option>
 <option value="single">Single-Branch</option>
 <option value="multi">Multi-Branch</option>
 <option value="all">All-Branch</option>
 </select>
 </div>
 </div>

 {/* MEMBER ACCESS TABLE LIST */}
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Branch Access Entitlements Queue</span>

 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-neutral-200/80 text-neutral-600 font-mono uppercase text-[9px] bg-neutral-50/20">
 <th className="py-3 px-4">Member Name</th>
 <th className="py-3 px-4">Home Branch</th>
 <th className="py-3 px-4">Entitled Outlets</th>
 <th className="py-3 px-4">Last Event</th>
 <th className="py-3 px-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200/30 font-mono">
 {filteredMembers.length === 0 ? (
 <tr>
 <td colSpan={5} className="py-8 text-center text-neutral-500 italic">
 No members found matching selected criteria.
 </td>
 </tr>
 ) : (
 pagedMembers.map((rec) => (
 <tr key={rec.id} className="hover:bg-neutral-50/10 transition">
 <td className="py-3.5 px-4 font-sans">
 <span className="font-semibold text-neutral-800 block">{rec.memberName}</span>
 <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">{rec.planName}</span>
 </td>
 <td className="py-3.5 px-4 font-sans">
 <span className="text-neutral-700 block">{rec.homeBranchName}</span>
 </td>
 <td className="py-3.5 px-4">
 <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
 rec.accessType === 'All'
 ? 'bg-success-light text-success border border-green-200'
 : rec.accessType === 'Multi'
 ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'
 : 'bg-danger-light text-danger border border-red-200'
 }`}>
 {rec.accessType === 'All' ? 'All Branches' : rec.accessType === 'Multi' ? `${rec.allowedBranchIds.length} Branches` : 'Single Only'}
 </span>
 <span className="text-[10px] text-neutral-500 block mt-1">
 {rec.allowedBranchIds.map(id => branches.find(b => b.id === id)?.name.split(' ')[0]).filter(Boolean).join(', ')}
 </span>
 </td>
 <td className="py-3.5 px-4">
 {rec.lastCheckinTime ? (
 <>
 <span className="text-neutral-700 block">{rec.lastCheckinBranch}</span>
 <span className="text-[9px] text-neutral-500 block mt-0.5">{rec.lastCheckinTime}</span>
 </>
 ) : (
 <span className="text-neutral-500 block">Never Checked In</span>
 )}
 </td>
 <td className="py-3.5 px-4 text-right">
 <div className="flex gap-2 justify-end">
 <button
 onClick={() => {
 setSelectedMember(rec);
 setSimResult(null);
 setSimCheckinBranch(rec.homeBranchId || branches[0]?.id || '');
 setShowSimulatorModal(true);
 }}
 className="px-2.5 py-1.5 bg-danger-light border border-red-200 hover:bg-danger-light text-danger text-[10px] font-bold rounded-lg transition"
 >
 Validate Access
 </button>
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>

 {filteredMembers.length > pageSize && (
 <div className="-mx-5 -mb-5">
 <Pagination
 page={currentPage}
 totalPages={totalPages}
 onPageChange={setPage}
 totalItems={filteredMembers.length}
 pageSize={pageSize}
 />
 </div>
 )}
 </div>

 {/* CROSS-BRANCH ACCESS LOGS */}
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-4">
 <h3 className="text-sm font-bold text-neutral-800 font-display flex items-center gap-2">
 <History size={16} className="text-danger" />
 Check-in Validation Activity Logs
 </h3>

 <div className="space-y-4">
 {accessLogs.length === 0 ? (
 <div className="p-8 text-center border border-dashed border-neutral-200 rounded-2xl text-xs text-neutral-500">
 No check-in validation activity recorded yet.
 </div>
 ) : (
 accessLogs.map((log) => (
 <div key={log.id} className="flex items-start justify-between border-b border-neutral-100/60 pb-3 font-mono text-xs">
 <div className="flex gap-3">
 <div className="mt-1">
 {log.status === 'Granted' ? (
 <CheckCircle className="text-success w-4 h-4" />
 ) : (
 <XCircle className="text-danger w-4 h-4" />
 )}
 </div>
 <div>
 <span className="font-bold text-neutral-800 block">{log.memberName}</span>
 <span className="text-[10px] text-neutral-500 block">Visited: {log.branchName}</span>
 {log.status === 'Denied' && log.reason && (
 <span className="text-[10px] text-danger block mt-1 bg-danger-light p-1.5 rounded border border-red-200">
 Blocked: {log.reason}
 </span>
 )}
 </div>
 </div>
 <div className="text-right">
 <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
 log.status === 'Granted'
 ? 'bg-success-light text-success border border-green-200'
 : 'bg-danger-light text-danger border border-red-200'
 }`}>
 {log.status}
 </span>
 <span className="text-[9px] text-neutral-500 block mt-1">{log.timestamp}</span>
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 </div>

 {/* RIGHT COLUMN: RECOMMENDED UPGRADES & PREVIEWS */}
 <div className="lg:col-span-1 space-y-6">

 {/* UPGRADE OPPORTUNITIES recommendations panel */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <div className="flex items-center justify-between">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Upgrade Opportunities</span>
 <span className="px-1.5 py-0.5 bg-danger-light text-danger text-[8px] font-bold font-mono rounded">Churn Shield</span>
 </div>

 <p className="text-xs text-neutral-600 leading-relaxed font-sans">
 Members on restricted plans with denied cross-branch check-in attempts. Upgrade to recover revenue.
 </p>

 {upgradeRecommendations.length === 0 ? (
 <div className="p-6 text-center border border-dashed border-neutral-200 rounded-2xl text-[11px] text-neutral-500">
 No denied cross-branch attempts detected. All good.
 </div>
 ) : (
 <div className="space-y-3 font-mono text-xs">
 {upgradeRecommendations.map((rec) => (
 <div key={rec.memberId} className="bg-white border border-neutral-200 p-4 rounded-xl space-y-3">
 <div className="flex justify-between items-start">
 <div>
 <h4 className="font-bold text-neutral-800 text-xs">{rec.memberName}</h4>
 <span className="text-[10px] text-neutral-500">Plan: {rec.currentPlan}</span>
 </div>
 <span className="text-[10px] text-danger font-bold">{rec.crossBranchAttempts} denied</span>
 </div>

 {!isTrainerOrDietitian && (
 <button
 onClick={() => handleQuickUpgrade(rec.memberId)}
 disabled={saving}
 className="w-full py-2 bg-success text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1.5 transition disabled:opacity-40"
 >
 <Zap size={12} />
 <span>Upgrade to All-Access</span>
 </button>
 )}
 </div>
 ))}
 </div>
 )}
 </div>

 {/* ACTIVE ASSIGNMENT RULES SUMMARY */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4 font-mono text-xs">
 <span className="text-[10px] text-neutral-500 uppercase block font-semibold">Access Allocation Overview</span>
 <div className="space-y-2.5">
 {homeBranchCounts.length === 0 ? (
 <span className="text-neutral-500">No branch allocation data.</span>
 ) : (
 homeBranchCounts.map(b => (
 <div key={b.id} className="flex justify-between">
 <span className="text-neutral-600">{b.name} (Home):</span>
 <span className="text-neutral-800">{b.count} Members</span>
 </div>
 ))
 )}
 </div>
 </div>

 </div>

 </div>

 {/* VALIDATION SIMULATOR MODAL (real multi-layer engine result) */}
 {showSimulatorModal && selectedMember && (
 <div className="fixed inset-0 bg-neutral-50/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
 <div className="flex justify-between items-start">
 <div>
 <h3 className="text-base font-bold text-neutral-900 font-display">Gate Access Validator</h3>
 <p className="text-xs text-neutral-600 mt-1">Runs the real multi-layer check-in validation engine.</p>
 </div>
 <button
 onClick={() => {
 setSelectedMember(null);
 setSimResult(null);
 setShowSimulatorModal(false);
 }}
 className="text-neutral-500 hover:text-neutral-700"
 >
 ✕
 </button>
 </div>

 <div className="bg-white p-4 rounded-xl border border-neutral-200 font-mono text-xs space-y-2.5">
 <div className="flex justify-between"><span>Member:</span><span className="text-neutral-800 font-bold">{selectedMember.memberName}</span></div>
 <div className="flex justify-between"><span>Home Branch:</span><span>{selectedMember.homeBranchName}</span></div>
 <div className="flex justify-between"><span>Plan:</span><span className="text-neutral-700">{selectedMember.planName}</span></div>
 <div className="flex justify-between"><span>Access Level:</span><span className="text-cyan-500">{selectedMember.accessType} Branch</span></div>
 </div>

 <div className="space-y-3 font-mono text-xs">
 <span className="text-neutral-600 block font-sans">1. Select Gate Branch Terminal</span>
 <div className="grid grid-cols-2 gap-2">
 {branches.map((b) => (
 <button
 key={b.id}
 type="button"
 onClick={() => {
 setSimCheckinBranch(b.id);
 setSimResult(null);
 }}
 className={`py-2 px-3 rounded-lg border text-[10px] font-bold transition flex items-center justify-between ${
 simCheckinBranch === b.id
 ? 'bg-danger-light border-red-200 text-neutral-800'
 : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:text-neutral-800'
 }`}
 >
 <span>{b.name.split(' ')[0]} Gate</span>
 {simCheckinBranch === b.id && <span className="w-1.5 h-1.5 rounded-full bg-danger" />}
 </button>
 ))}
 </div>
 </div>

 {/* Real Validation Trigger */}
 <button
 onClick={handleSimulateCheckin}
 disabled={simulating || !simCheckinBranch}
 className="w-full py-2.5 bg-primary hover:bg-primary-hover text-neutral-900 font-bold text-xs rounded-xl transition font-mono flex items-center justify-center gap-2 disabled:opacity-40"
 >
 {simulating && <Loader2 size={14} className="animate-spin" />}
 {simulating ? 'Validating...' : 'Run Gate Validation'}
 </button>

 {/* REAL VALIDATION RESULT */}
 {simResult && (
 <div className="pt-3 border-t border-neutral-200 space-y-4 animate-slide-in">
 {simResult.success ? (
 <div className="bg-success-light border border-green-200 p-4 rounded-xl flex items-start gap-3">
 <CheckCircle className="text-success w-5 h-5 mt-0.5" />
 <div className="text-xs font-mono">
 <h4 className="font-bold text-success text-sm">Access Granted</h4>
 <p className="text-neutral-600 mt-1">All validation layers passed. Turnstile would unlock.</p>
 </div>
 </div>
 ) : (
 <div className="bg-danger-light border border-red-200 p-4 rounded-xl flex items-start gap-3">
 <XCircle className="text-danger w-5 h-5 mt-0.5" />
 <div className="text-xs font-mono">
 <h4 className="font-bold text-danger text-sm">Access Denied</h4>
 <p className="text-neutral-600 mt-1 leading-relaxed">{simResult.reason || 'Blocked by validation engine.'}</p>
 </div>
 </div>
 )}

 {/* Layer-by-layer breakdown from the engine */}
 <div className="bg-white border border-neutral-200 p-4 rounded-xl space-y-2 font-mono text-[10px]">
 <span className="text-[10px] text-neutral-500 font-sans uppercase block font-bold">Validation Layers</span>
 {(simResult.layers || []).map((layer: any, idx: number) => (
 <div key={idx} className="flex items-start justify-between gap-3 border-b border-neutral-100/60 pb-1.5 last:border-0">
 <div className="flex-1">
 <span className="text-neutral-800 font-bold block">{layer.name}</span>
 <span className="text-neutral-500 block leading-relaxed">{layer.message}</span>
 </div>
 <span className={`px-1.5 py-0.5 rounded font-bold shrink-0 ${
 layer.status === 'Passed'
 ? 'bg-success-light text-success'
 : layer.status === 'Failed'
 ? 'bg-danger-light text-danger'
 : 'bg-neutral-100 text-neutral-500'
 }`}>
 {layer.status}
 </span>
 </div>
 ))}
 </div>

 {/* Resolution: upgrade to all-access if branch access was the blocker */}
 {!simResult.success && !isTrainerOrDietitian && selectedMember.accessType !== 'All' && (
 <button
 onClick={() => handleQuickUpgrade(selectedMember.memberId)}
 disabled={saving}
 className="w-full py-2.5 px-3 bg-success-light border border-green-200 hover:bg-success-light text-success font-bold rounded-lg text-[10px] flex items-center justify-center gap-2 transition disabled:opacity-40"
 >
 <Zap size={12} />
 <span>Resolve: Upgrade to All-Branch Access Plan</span>
 </button>
 )}
 </div>
 )}
 </div>
 </div>
 )}

 {/* DRAWER: CONFIGURE ACCESS (reassign plan) */}
 {showAssignDrawer && (
 <div className="fixed inset-0 z-[100] overflow-hidden">
 <div className="absolute inset-0 bg-neutral-50/80 backdrop-blur-sm transition-opacity" onClick={() => setShowAssignDrawer(false)} />
 <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
 <div className="w-screen max-w-md bg-white border-l border-neutral-200 p-6 flex flex-col justify-between shadow-2xl">

 <div className="space-y-6 overflow-y-auto pr-1">
 <div>
 <h3 className="text-base font-bold text-neutral-900 font-display">Configure Branch Access</h3>
 <p className="text-xs text-neutral-600 mt-1">Access is plan-driven. Move a member onto a plan whose branch entitlements match the access you want to grant.</p>
 </div>

 <form onSubmit={handleAssignSubmit} className="space-y-5 font-mono text-xs">
 {/* Select Member */}
 <div className="space-y-1.5">
 <label className="text-neutral-600 block font-sans">Member</label>
 <select
 required
 className="w-full bg-white border border-neutral-200 p-3 rounded-xl text-neutral-800 focus:outline-none"
 value={assignFormMemberId}
 onChange={e => setAssignFormMemberId(e.target.value)}
 >
 <option value="">Select a member</option>
 {memberAccessList.map(m => (
 <option key={m.memberId} value={m.memberId}>{m.memberName} — {m.homeBranchName}</option>
 ))}
 </select>
 </div>

 {/* Select Plan */}
 <div className="space-y-1.5">
 <label className="text-neutral-600 block font-sans">Target Access Plan</label>
 <select
 required
 className="w-full bg-white border border-neutral-200 p-3 rounded-xl text-neutral-800 focus:outline-none"
 value={assignFormPlanId}
 onChange={e => setAssignFormPlanId(e.target.value)}
 >
 <option value="">Select a plan</option>
 {plans.map(p => (
 <option key={p.id} value={p.id}>
 {p.name} — {p.branchAccess === 'all' ? 'All Branches' : `${String(p.branchAccess || '').split(',').filter(Boolean).length || 1} branch(es)`}
 </option>
 ))}
 </select>
 <p className="text-[10px] text-neutral-500 font-sans leading-relaxed">
 The selected plan's <strong>branchAccess</strong> determines which gates the member can enter. Applied to their active membership.
 </p>
 </div>

 {isTrainerOrDietitian && (
 <div className="bg-warning-light border border-amber-200 p-3.5 rounded-xl text-[10px] text-amber-700 flex items-start gap-2.5">
 <ShieldAlert size={14} className="mt-0.5" />
 <p className="leading-relaxed">
 Trainer/Dietitian role is restricted to View-Only. Changes cannot be saved.
 </p>
 </div>
 )}

 <div className="flex gap-3 pt-4 border-t border-neutral-200">
 <button
 type="button"
 onClick={() => setShowAssignDrawer(false)}
 className="flex-1 py-2.5 bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-800 font-semibold rounded-xl transition"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isTrainerOrDietitian || saving}
 className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-neutral-900 font-bold rounded-xl transition disabled:opacity-30"
 >
 {saving ? 'Applying...' : 'Apply Access Plan'}
 </button>
 </div>
 </form>
 </div>

 </div>
 </div>
 </div>
 )}

 {/* DRAWER: BRANCH TRANSFER WORKFLOW */}
 {showTransferDrawer && (
 <div className="fixed inset-0 z-[100] overflow-hidden">
 <div className="absolute inset-0 bg-neutral-50/80 backdrop-blur-sm transition-opacity" onClick={() => setShowTransferDrawer(false)} />
 <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
 <div className="w-screen max-w-md bg-white border-l border-neutral-200 p-6 flex flex-col justify-between shadow-2xl">

 <div className="space-y-6 overflow-y-auto pr-1">
 <div>
 <h3 className="text-base font-bold text-neutral-900 font-display">Transfer Home Branch</h3>
 <p className="text-xs text-neutral-600 mt-1">Reassign a member's primary home branch. Persists to the member profile.</p>
 </div>

 <form onSubmit={handleTransferSubmit} className="space-y-5 font-mono text-xs">
 {/* Member */}
 <div className="space-y-1.5">
 <label className="text-neutral-600 block font-sans">Member</label>
 <select
 required
 className="w-full bg-white border border-neutral-200 p-3 rounded-xl text-neutral-800 focus:outline-none"
 value={transferFormMemberId}
 onChange={e => setTransferFormMemberId(e.target.value)}
 >
 <option value="">Select a member</option>
 {memberAccessList.map(m => (
 <option key={m.memberId} value={m.memberId}>{m.memberName} — {m.homeBranchName}</option>
 ))}
 </select>
 </div>

 {/* Target Branch selection */}
 <div className="space-y-1.5">
 <label className="text-neutral-600 block font-sans">Destination Branch</label>
 <select
 required
 className="w-full bg-white border border-neutral-200 p-3 rounded-xl text-neutral-800 focus:outline-none"
 value={transferTargetBranchId}
 onChange={e => setTransferTargetBranchId(e.target.value)}
 >
 <option value="">Select destination</option>
 {branches.map(b => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>
 </div>

 {isTrainerOrDietitian && (
 <div className="bg-warning-light border border-amber-200 p-3.5 rounded-xl text-[10px] text-amber-700 flex items-start gap-2.5">
 <ShieldAlert size={14} className="mt-0.5" />
 <p className="leading-relaxed">
 Trainer/Dietitian role is restricted to View-Only. Changes cannot be saved.
 </p>
 </div>
 )}

 <div className="flex gap-3 pt-4 border-t border-neutral-200">
 <button
 type="button"
 onClick={() => setShowTransferDrawer(false)}
 className="flex-1 py-2.5 bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-800 font-semibold rounded-xl transition"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isTrainerOrDietitian || saving}
 className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-neutral-900 font-bold rounded-xl transition disabled:opacity-30"
 >
 {saving ? 'Transferring...' : 'Execute Transfer'}
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

export default function MembershipMultiBranchAccessPage() {
 return (
 <Suspense fallback={
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Initializing...
 </div>
 }>
 <MultiBranchAccessContent />
 </Suspense>
 );
}
