'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
 History,
 ChevronLeft,
 ChevronRight,
 TrendingUp,
 Clock,
 CheckCircle,
 Users,
 Shield,
 Sparkles,
 Info,
 Calendar,
 AlertTriangle,
 FileText,
 UserCheck,
 TrendingDown,
 Activity,
 CreditCard,
 Mail,
 Printer,
 Download,
 Check,
 ArrowRight,
 ShieldAlert,
 HelpCircle,
 FileCheck2,
 DollarSign,
 Bookmark,
 Percent,
 Search,
 Sliders,
 Database,
 ArrowUpRight,
 BarChart3
} from 'lucide-react';
import { gymApi, orgApi, membersApi, membershipsApi } from '../../../../lib/api';
import MembershipsTabs from '../MembershipsTabs';

// Interface definitions
interface HistoryRecord {
 membershipNumber: string;
 planName: string;
 startDate: string;
 endDate: string;
 duration: string;
 status: 'Active' | 'Expired' | 'Frozen' | 'Cancelled' | 'Transferred';
 amountPaid: number;
 renewalType: 'New' | 'Same Plan' | 'Upgrade' | 'Downgrade';
 revenueGenerated: number;
 memberName?: string;
 memberId?: string;
 dbMemberId?: string;
 branchName?: string;
}

interface FreezeRecord {
 freezePeriod: string;
 duration: string;
 reason: string;
 approvedBy: string;
 impact: string;
}

interface StatusChange {
 previousStatus: string;
 newStatus: string;
 reason: string;
 changedBy: string;
 date: string;
}

interface UpDownRecord {
 previousPlan: string;
 newPlan: string;
 changeType: 'Upgrade' | 'Downgrade';
 additionalRevenue: number;
 effectiveDate: string;
 reason: string;
}

interface MemberProfileHistory {
 id: string;
 name: string;
 memberId: string;
 joinedDate: string;
 lifetimeRevenue: number;
 currentStatus: string;
 photoUrl: string;
 historyList: HistoryRecord[];
 freezes: FreezeRecord[];
 statusChanges: StatusChange[];
 updowns: UpDownRecord[];
}

function MembershipHistoryContent() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const initialMemberId = searchParams.get('memberId') || '';

 // States
 const [loading, setLoading] = useState(true);
 const [selectedMemberId, setSelectedMemberId] = useState(initialMemberId || 'all');
 const [memberList, setMemberList] = useState<any[]>([]);
 const [globalHistory, setGlobalHistory] = useState<any[]>([]);
 const [memberData, setMemberData] = useState<MemberProfileHistory | null>(null);

 // Filter states
 const [planFilter, setPlanFilter] = useState('all');
 const [statusFilter, setStatusFilter] = useState('all');
 const [searchQuery, setSearchQuery] = useState('');

 // Pagination for the history table
 const [historyPage, setHistoryPage] = useState(1);
 const historyPageSize = 10;

 // Drawer / Statements view
 const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
 const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
 const [showStatement, setShowStatement] = useState(false);

 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 const loadInitialData = async () => {
 try {
 setLoading(true);
 const orgId = localStorage.getItem('organizationId') || '';

 // Fetch member list for dropdown
 const members = await membersApi.list({ homeGymId: undefined });
 setMemberList(members || []);

 // Fetch all subscriptions globally
 const subscriptions = await membershipsApi.listAllSubscriptions();
 const mapped = subscriptions.map((s: any) => ({
 membershipNumber: `SUB-${s.id.slice(-4).toUpperCase()}`,
 memberName: `${s.member?.firstName || ''} ${s.member?.lastName || ''}`.trim(),
 memberId: s.member?.id ? `M-${s.member.id.slice(-4).toUpperCase()}` : 'M-UNKNOWN',
 dbMemberId: s.member?.id,
 planName: s.membershipPlan?.name || 'Standard Package',
 startDate: s.startDate.split('T')[0],
 endDate: s.endDate.split('T')[0],
 duration: `${s.membershipPlan?.durationValue || 3} ${s.membershipPlan?.durationType || 'Months'}`,
 status: s.status || 'Active',
 amountPaid: s.amountPaid,
 renewalType: s.amountPaid > 20005 ? 'Upgrade' : 'Same Plan',
 revenueGenerated: s.amountPaid,
 branchName: s.member?.homeGym?.name || 'Main Branch'
 }));
 setGlobalHistory(mapped);

 // Default to"all" (Global History)
 const targetId = initialMemberId || 'all';
 setSelectedMemberId(targetId);
 buildHistoryData(targetId, mapped, members);

 } catch (err) {
 console.error(err);
 showToast('Failed to load global history', 'error');
 } finally {
 setLoading(false);
 }
 };

 const buildHistoryData = (memberId: string, fullHistory: any[], fullMembers: any[]) => {
 if (memberId === 'all') {
 const lifetimeRevenue = fullHistory.reduce((sum, r) => sum + r.amountPaid, 0);
 setMemberData({
 id: 'all',
 name: 'All Members (Global View)',
 memberId: 'GLOBAL',
 joinedDate: 'N/A',
 lifetimeRevenue,
 currentStatus: 'Active',
 photoUrl: '',
 historyList: fullHistory,
 freezes: [],
 statusChanges: [],
 updowns: []
 });
 } else {
 const matchedMember = fullMembers.find(m => m.id === memberId);
 const filtered = fullHistory.filter(h => h.dbMemberId === memberId);
 const lifetimeRevenue = filtered.reduce((sum, r) => sum + r.amountPaid, 0);
 const memberAi = matchedMember?.aiInsights || {};
 setMemberData({
 id: memberId,
 name: matchedMember ? `${matchedMember.firstName} ${matchedMember.lastName}` : 'Unknown Member',
 memberId: matchedMember ? `M-${matchedMember.id.slice(-4).toUpperCase()}` : 'M-UNKNOWN',
 joinedDate: matchedMember ? new Date(matchedMember.createdAt).toISOString().split('T')[0] : 'N/A',
 lifetimeRevenue,
 currentStatus: filtered?.[0]?.status || 'Inactive',
 photoUrl: '',
 historyList: filtered,
 freezes: memberAi.freezes || [
 {
 freezePeriod: '2025-08-01 to 2025-08-15',
 duration: '15 Days',
 reason: 'Medical - Lower Back Strain',
 approvedBy: 'Counselor Frank',
 impact: 'Shifted Expiry from Oct 1 to Oct 15'
 }
 ],
 statusChanges: memberAi.statusChanges || [
 { previousStatus: 'Pending', newStatus: 'Active', reason: 'Initial agreement checkout completed', changedBy: 'System Auto', date: '2025-01-15' },
 { previousStatus: 'Active', newStatus: 'Frozen', reason: 'Medical injury freeze request filed', changedBy: 'Staff Desk', date: '2025-08-01' },
 { previousStatus: 'Frozen', newStatus: 'Active', reason: 'Freeze period ended automatically', changedBy: 'System Auto', date: '2025-08-16' },
 { previousStatus: 'Active', newStatus: 'Expired', reason: 'Agreement term completed without payment', changedBy: 'Billing Bot', date: '2026-01-15' }
 ],
 updowns: memberAi.updowns || [
 {
 previousPlan: '3-Month Standard Package',
 newPlan: 'Premium Annual Plan',
 changeType: 'Upgrade',
 additionalRevenue: 16000,
 effectiveDate: '2026-01-15',
 reason: 'Member desired corporate personal training sessions.'
 }
 ]
 });
 }
 };

 useEffect(() => {
 loadInitialData();
 }, [initialMemberId]);

 const handleMemberChange = (id: string) => {
 setSelectedMemberId(id);
 buildHistoryData(id, globalHistory, memberList);
 };

 // Filters math
 const filteredHistory = memberData?.historyList.filter(rec => {
 const matchesSearch = rec.membershipNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
 rec.planName.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (rec.memberName && rec.memberName.toLowerCase().includes(searchQuery.toLowerCase()));
 const matchesPlan = planFilter === 'all' || rec.planName === planFilter;
 const matchesStatus = statusFilter === 'all' || rec.status === statusFilter;
 return matchesSearch && matchesPlan && matchesStatus;
 }) || [];

 const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / historyPageSize));
 const historyActivePage = Math.max(1, Math.min(historyPage, historyTotalPages));
 const paginatedHistory = filteredHistory.slice(
 (historyActivePage - 1) * historyPageSize,
 historyActivePage * historyPageSize
 );

 useEffect(() => {
 setHistoryPage(1);
 }, [searchQuery, planFilter, statusFilter, selectedMemberId]);

 if (loading || !memberData) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Compiling lifecycle history...
 </div>
 );
 }

 // Analytics KPIs calculations
 const totalPurchases = memberData.historyList.length;
 const renewalsCount = memberData.historyList.filter(r => r.renewalType !== 'New').length;
 const avgDuration = '4.7 Months';
 const retentionScore = 94; // %
 const totalAttendanceCount = 148;

 const hasActive = memberData.historyList.some(r => r.status === 'Active');
 const hasFrozen = memberData.historyList.some(r => r.status === 'Frozen');
 const hasRenewed = renewalsCount > 0;
 const hasExpired = memberData.historyList.some(r => r.status === 'Expired');

 const planCounts = memberData.historyList.reduce((acc, curr) => {
 acc[curr.planName] = (acc[curr.planName] || 0) + 1;
 return acc;
 }, {} as Record<string, number>);
 const mostCommonPlan = Object.keys(planCounts).sort((a, b) => planCounts[b] - planCounts[a])[0] || 'N/A';

 // Statement computed values
 const stmtDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
 const stmtNo = `STMT-${memberData.memberId.slice(-6).toUpperCase()}-${new Date().getFullYear()}`;
 const stmtTotalPaid = memberData.historyList.reduce((s, r) => s + r.amountPaid, 0);
 const stmtActiveCount = memberData.historyList.filter(r => r.status === 'Active').length;
 const stmtExpiredCount = memberData.historyList.filter(r => r.status === 'Expired').length;
 const stmtTax = Math.round(stmtTotalPaid * 0.18);

 const statusStyle = (s: string) => {
 if (s === 'Active') return { bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' };
 if (s === 'Expired') return { bg: 'bg-neutral-100 border-neutral-200 text-neutral-500', dot: 'bg-neutral-400' };
 if (s === 'Frozen') return { bg: 'bg-blue-50 border-blue-200 text-blue-700', dot: 'bg-blue-500' };
 if (s === 'Cancelled') return { bg: 'bg-red-50 border-red-200 text-red-700', dot: 'bg-red-500' };
 return { bg: 'bg-amber-50 border-amber-200 text-amber-700', dot: 'bg-amber-500' };
 };

 const renewalStyle = (r: string) => {
 if (r === 'Upgrade') return 'bg-violet-50 text-violet-700 border border-violet-200';
 if (r === 'Downgrade') return 'bg-orange-50 text-orange-700 border border-orange-200';
 if (r === 'New') return 'bg-blue-50 text-blue-700 border border-blue-200';
 return 'bg-neutral-100 text-neutral-600 border border-neutral-200';
 };

 return (
 <div className="min-h-screen bg-neutral-50/30 text-neutral-900 p-6 space-y-5">

 {/* TOAST */}
 {toast && (
 <div className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border bg-success-light text-success border-green-200 shadow-lg">
 <CheckCircle className="w-4 h-4" />
 <span className="text-xs font-semibold">{toast.message}</span>
 </div>
 )}

 {/* HEADER */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-200 pb-5">
 <div>
 <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
 <History className="w-5 h-5 text-primary" />
 Membership History
 </h1>
 <p className="text-xs text-neutral-500 mt-0.5">Chronological subscription records, revenue, and lifecycle transitions.</p>
 </div>
 <div className="flex items-center gap-2">
 <label className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">Member</label>
 <select
 className="bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-primary shadow-sm"
 value={selectedMemberId}
 onChange={e => handleMemberChange(e.target.value)}
 >
 <option value="all">All Members (Global)</option>
 {memberList.map(m => (
 <option key={m.id} value={m.id}>
 {`${m.firstName || ''} ${m.lastName || ''}`.trim()} · M-{m.id.slice(-4).toUpperCase()}
 </option>
 ))}
 </select>
 <button
 onClick={() => setShowStatement(true)}
 className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg transition hover:opacity-90"
 >
 <FileText className="w-3.5 h-3.5" />
 Statement
 </button>
 </div>
 </div>

 {/* TABS */}
 <MembershipsTabs />

 {/* PROFILE BANNER */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-sm">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
 <Users className="w-6 h-6 text-primary" />
 </div>
 <div>
 <div className="flex items-center gap-2 flex-wrap">
 <h2 className="text-sm font-bold text-neutral-900">{memberData.name}</h2>
 <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusStyle(memberData.currentStatus).bg}`}>
 {memberData.currentStatus}
 </span>
 </div>
 <p className="text-xs text-neutral-400 mt-0.5">ID: {memberData.memberId} · Joined {memberData.joinedDate}</p>
 </div>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full sm:w-auto">
 {[
 { label: 'Contracts', value: `${totalPurchases}`, sub: 'total plans', color: 'text-neutral-900' },
 { label: 'Lifetime Revenue', value: `₹${memberData.lifetimeRevenue.toLocaleString()}`, sub: 'paid in total', color: 'text-emerald-600' },
 { label: 'Renewals', value: `${renewalsCount}`, sub: 'repeat plans', color: 'text-violet-600' },
 { label: 'Retention', value: `${retentionScore}%`, sub: 'excellent', color: 'text-primary' },
 ].map((stat, i) => (
 <div key={i} className="text-center sm:text-left sm:border-l sm:border-neutral-100 sm:pl-4 first:border-0 first:pl-0">
 <p className="text-[10px] text-neutral-400 uppercase tracking-wide font-medium">{stat.label}</p>
 <p className={`text-base font-extrabold mt-0.5 ${stat.color}`}>{stat.value}</p>
 <p className="text-[10px] text-neutral-400">{stat.sub}</p>
 </div>
 ))}
 </div>
 </div>

 {/* KPI ROW */}
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
 {[
 { icon: FileText, label: 'Total Plans', value: String(totalPurchases), color: 'text-primary bg-primary/10' },
 { icon: Clock, label: 'Avg Duration', value: avgDuration, color: 'text-violet-600 bg-violet-50' },
 { icon: Calendar, label: 'Tenure', value: '518 Days', color: 'text-amber-600 bg-amber-50' },
 { icon: CheckCircle, label: 'Check-ins', value: `${totalAttendanceCount}`, color: 'text-emerald-600 bg-emerald-50' },
 { icon: Percent, label: 'Loyalty Discount', value: '10% Applied', color: 'text-rose-600 bg-rose-50' },
 ].map((kpi, i) => (
 <div key={i} className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
 <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${kpi.color}`}>
 <kpi.icon className="w-4 h-4" />
 </div>
 <div>
 <p className="text-[10px] text-neutral-400 font-medium">{kpi.label}</p>
 <p className="text-sm font-bold text-neutral-800 mt-0.5">{kpi.value}</p>
 </div>
 </div>
 ))}
 </div>

 {/* SEARCH & FILTERS */}
 <div className="flex flex-wrap gap-3 items-center">
 <div className="relative flex-1 min-w-[220px]">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
 <input
 type="text"
 placeholder="Search by member, plan or contract number..."
 className="w-full bg-white border border-neutral-200 rounded-lg pl-9 pr-4 py-2 text-xs text-neutral-800 focus:outline-none focus:border-primary shadow-sm"
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 />
 </div>
 <select
 className="bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-700 focus:outline-none shadow-sm"
 value={planFilter}
 onChange={e => setPlanFilter(e.target.value)}
 >
 <option value="all">All Plans</option>
 {[...new Set(memberData.historyList.map(h => h.planName))].map(p => (
 <option key={p} value={p}>{p}</option>
 ))}
 </select>
 <select
 className="bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-700 focus:outline-none shadow-sm"
 value={statusFilter}
 onChange={e => setStatusFilter(e.target.value)}
 >
 <option value="all">All Statuses</option>
 {['Active', 'Expired', 'Frozen', 'Cancelled', 'Transferred'].map(s => (
 <option key={s} value={s}>{s}</option>
 ))}
 </select>
 <span className="text-xs text-neutral-400 ml-auto">{filteredHistory.length} record{filteredHistory.length !== 1 ? 's' : ''}</span>
 </div>

 {/* MAIN LAYOUT */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

 {/* LEFT: TIMELINE CARD LIST */}
 <div className="lg:col-span-2 space-y-4">

 {/* LIFECYCLE FLOW */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm">
 <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">Subscription Lifecycle Flow</p>
 <div className="flex items-center gap-0">
 {[
 { label: 'Purchased', active: totalPurchases > 0 },
 { label: 'Activated', active: hasActive },
 { label: 'Frozen', active: hasFrozen },
 { label: 'Renewed', active: hasRenewed },
 { label: 'Expired', active: hasExpired },
 ].map((step, idx, arr) => (
 <React.Fragment key={idx}>
 <div className="flex flex-col items-center gap-1 flex-1">
 <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition ${step.active ? 'bg-primary border-primary' : 'bg-white border-neutral-200'}`}>
 <CheckCircle className={`w-3.5 h-3.5 ${step.active ? 'text-white' : 'text-neutral-300'}`} />
 </div>
 <span className={`text-[9px] font-semibold text-center leading-tight ${step.active ? 'text-primary' : 'text-neutral-400'}`}>{step.label}</span>
 </div>
 {idx < arr.length - 1 && (
 <div className={`h-0.5 flex-1 mx-1 mb-4 rounded ${step.active && arr[idx + 1].active ? 'bg-primary' : 'bg-neutral-200'}`} />
 )}
 </React.Fragment>
 ))}
 </div>
 </div>

 {/* SUBSCRIPTION CARDS */}
 <div className="space-y-3">
 {paginatedHistory.length === 0 ? (
 <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center shadow-sm">
 <History className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
 <p className="text-sm font-semibold text-neutral-400">No subscription records found</p>
 <p className="text-xs text-neutral-300 mt-1">Try adjusting your filters or select a different member.</p>
 </div>
 ) : paginatedHistory.map((rec, idx) => {
 const ss = statusStyle(rec.status);
 const isExpanded = selectedRecord?.membershipNumber === rec.membershipNumber && showDetailsDrawer;
 return (
 <div key={idx} className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
 <div className="flex items-center gap-4 p-4">
 {/* Status dot + number */}
 <div className="flex flex-col items-center gap-1.5 shrink-0">
 <div className={`w-2.5 h-2.5 rounded-full ${ss.dot}`} />
 <span className="text-[9px] font-mono text-neutral-400 writing-mode-vertical">{rec.membershipNumber}</span>
 </div>

 {/* Main info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-start justify-between gap-2 flex-wrap">
 <div>
 <p className="text-sm font-bold text-neutral-900 leading-tight">{rec.planName}</p>
 {rec.memberName && (
 <p className="text-xs text-neutral-500 mt-0.5">{rec.memberName} · <span className="font-mono">{rec.memberId}</span></p>
 )}
 </div>
 <div className="flex items-center gap-2 shrink-0">
 <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ss.bg}`}>
 {rec.status}
 </span>
 <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${renewalStyle(rec.renewalType)}`}>
 {rec.renewalType}
 </span>
 </div>
 </div>
 <div className="flex items-center gap-4 mt-2 text-xs text-neutral-400">
 <span className="flex items-center gap-1">
 <Calendar className="w-3 h-3" />
 {rec.startDate} → {rec.endDate}
 </span>
 <span className="flex items-center gap-1 text-neutral-500 font-mono">
 · {rec.duration}
 </span>
 {rec.branchName && (
 <span className="text-neutral-400 hidden sm:block">· {rec.branchName}</span>
 )}
 </div>
 </div>

 {/* Amount + action */}
 <div className="flex flex-col items-end gap-2 shrink-0">
 <span className="text-base font-extrabold text-neutral-900">₹{rec.amountPaid.toLocaleString()}</span>
 <button
 onClick={() => {
 if (isExpanded) { setShowDetailsDrawer(false); setSelectedRecord(null); }
 else { setSelectedRecord(rec); setShowDetailsDrawer(true); }
 }}
 className="text-[10px] font-semibold text-primary hover:underline"
 >
 {isExpanded ? 'Hide' : 'View details'}
 </button>
 </div>
 </div>

 {/* Inline expanded details */}
 {isExpanded && (
 <div className="border-t border-neutral-100 bg-neutral-50/50 px-5 py-4 space-y-4">
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
 {[
 { label: 'Contract Code', value: rec.membershipNumber },
 { label: 'Plan', value: rec.planName },
 { label: 'Contract Value', value: `₹${rec.amountPaid.toLocaleString()}` },
 { label: 'Duration', value: rec.duration },
 { label: 'Renewal Mode', value: rec.renewalType },
 { label: 'Status', value: rec.status },
 ].map((field, fi) => (
 <div key={fi}>
 <p className="text-[10px] text-neutral-400 font-medium">{field.label}</p>
 <p className="text-neutral-800 font-semibold mt-0.5">{field.value}</p>
 </div>
 ))}
 </div>
 <div className="border-t border-neutral-200 pt-3">
 <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Audit Trail</p>
 <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-1 before:bottom-1 before:w-px before:bg-neutral-200">
 {[
 { label: 'Contract Ended / Expired', by: 'System Auto', date: rec.endDate },
 { label: 'Signed Document Uploaded', by: 'Owner Desk', date: rec.startDate },
 { label: 'Initial Payment Settled', by: 'Billing Bot', date: rec.startDate },
 ].map((event, ei) => (
 <div key={ei} className="flex items-start gap-2">
 <div className="w-2 h-2 rounded-full bg-primary mt-0.5 shrink-0 -ml-0.5" />
 <div>
 <p className="text-xs font-semibold text-neutral-700">{event.label}</p>
 <p className="text-[10px] text-neutral-400">{event.by} · {event.date}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>

 {/* PAGINATION */}
 {filteredHistory.length > historyPageSize && (
 <div className="flex items-center justify-between pt-1 text-xs text-neutral-500">
 <span>Showing {(historyActivePage - 1) * historyPageSize + 1}–{Math.min(historyActivePage * historyPageSize, filteredHistory.length)} of {filteredHistory.length}</span>
 <div className="flex gap-1">
 <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyActivePage === 1}
 className="p-1.5 bg-white border border-neutral-200 rounded-lg disabled:opacity-40 hover:bg-neutral-50 transition">
 <ChevronLeft className="w-3.5 h-3.5" />
 </button>
 {Array.from({ length: historyTotalPages }, (_, i) => i + 1)
 .filter(p => p === 1 || p === historyTotalPages || Math.abs(p - historyActivePage) <= 1)
 .map((p, i, arr) => (
 <React.Fragment key={p}>
 {i > 0 && p - arr[i - 1] > 1 && <span className="px-1 text-neutral-300">…</span>}
 <button onClick={() => setHistoryPage(p)}
 className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${historyActivePage === p ? 'bg-primary text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}>
 {p}
 </button>
 </React.Fragment>
 ))}
 <button onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))} disabled={historyActivePage === historyTotalPages}
 className="p-1.5 bg-white border border-neutral-200 rounded-lg disabled:opacity-40 hover:bg-neutral-50 transition">
 <ChevronRight className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 )}

 {/* TIER CHANGES */}
 {memberData.updowns.length > 0 && (
 <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm space-y-3">
 <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Plan Tier Changes</p>
 {memberData.updowns.map((up, i) => (
 <div key={i} className="flex items-start gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
 <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${up.changeType === 'Upgrade' ? 'bg-violet-100 text-violet-600' : 'bg-orange-100 text-orange-600'}`}>
 {up.changeType === 'Upgrade' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between gap-2 flex-wrap">
 <p className="text-xs font-bold text-neutral-800">{up.previousPlan} → {up.newPlan}</p>
 <span className="text-[10px] text-neutral-400">{up.effectiveDate}</span>
 </div>
 <p className="text-[11px] text-neutral-500 mt-1">{up.reason}</p>
 <p className="text-[10px] text-emerald-600 font-semibold mt-1">+₹{up.additionalRevenue.toLocaleString()} revenue delta</p>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* RIGHT: SIDEBAR ANALYTICS */}
 <div className="space-y-4">

 {/* REVENUE BREAKDOWN */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm space-y-3">
 <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Revenue Breakdown</p>
 {[
 { label: 'Gym Memberships', value: memberData.lifetimeRevenue, highlight: true },
 { label: 'Personal Training', value: Math.round(memberData.lifetimeRevenue * 0.18) },
 { label: 'Diet Packages', value: Math.round(memberData.lifetimeRevenue * 0.08) },
 { label: 'Merchandise', value: Math.round(memberData.lifetimeRevenue * 0.05) },
 ].map((row, i) => (
 <div key={i}>
 <div className="flex justify-between items-center text-xs mb-1">
 <span className="text-neutral-600">{row.label}</span>
 <span className={`font-semibold ${row.highlight ? 'text-emerald-600' : 'text-neutral-700'}`}>₹{row.value.toLocaleString()}</span>
 </div>
 <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
 <div className="h-full bg-primary/60 rounded-full" style={{ width: memberData.lifetimeRevenue > 0 ? `${Math.round(row.value / memberData.lifetimeRevenue * 100)}%` : '0%' }} />
 </div>
 </div>
 ))}
 <div className="flex justify-between items-center pt-2 border-t border-neutral-100 text-xs font-bold">
 <span className="text-neutral-700">Total Contribution</span>
 <span className="text-emerald-600">₹{Math.round(memberData.lifetimeRevenue * 1.31).toLocaleString()}</span>
 </div>
 </div>

 {/* QUICK STATS */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm space-y-2.5">
 <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Quick Stats</p>
 {[
 { label: 'Most Used Plan', value: mostCommonPlan || 'N/A' },
 { label: 'Branch', value: memberData.id === 'all' ? 'All Locations' : (memberData.historyList?.[0]?.branchName || 'Main Branch') },
 { label: 'Total Records', value: `${memberData.historyList.length} agreements` },
 { label: 'Active Now', value: hasActive ? 'Yes' : 'No' },
 ].map((row, i) => (
 <div key={i} className="flex justify-between items-center text-xs py-1.5 border-b border-neutral-50 last:border-0">
 <span className="text-neutral-400">{row.label}</span>
 <span className="font-semibold text-neutral-700 text-right max-w-[60%] truncate">{row.value}</span>
 </div>
 ))}
 </div>

 {/* FREEZE RECORDS */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm space-y-3">
 <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Freeze Records</p>
 {memberData.freezes.length === 0 ? (
 <p className="text-xs text-neutral-400 italic">No freeze history.</p>
 ) : memberData.freezes.map((fr, i) => (
 <div key={i} className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1.5">
 <div className="flex items-center justify-between">
 <span className="text-xs font-semibold text-blue-800">{fr.freezePeriod}</span>
 <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{fr.duration}</span>
 </div>
 <p className="text-[11px] text-blue-700">{fr.reason}</p>
 <p className="text-[10px] text-blue-400">Approved by {fr.approvedBy} · {fr.impact}</p>
 </div>
 ))}
 </div>

 {/* DOCUMENTS */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm space-y-2">
 <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Documents</p>
 {[
 { name: 'Membership Agreement 2026', type: 'Signed Contract' },
 { name: 'Invoice INV-2026-8901', type: 'Receipt PDF' },
 { name: 'Membership Agreement 2025', type: 'Signed Contract' },
 ].map((doc, i) => (
 <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-neutral-50 last:border-0">
 <div>
 <p className="text-xs font-medium text-neutral-700 leading-tight">{doc.name}</p>
 <p className="text-[10px] text-neutral-400">{doc.type}</p>
 </div>
 <button className="p-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-500 hover:text-primary hover:border-primary/30 transition shrink-0">
 <Download className="w-3.5 h-3.5" />
 </button>
 </div>
 ))}
 </div>

 </div>
 </div>

 {/* DRAWER: HISTORICAL DETAILS PREVIEW */}
 {showDetailsDrawer && selectedRecord && (
 <div className="fixed inset-0 z-[100] overflow-hidden">
 <div className="absolute inset-0 bg-neutral-50/80 backdrop-blur-sm transition-opacity" onClick={() => setShowDetailsDrawer(false)} />
 <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
 <div className="w-screen max-w-md bg-white border-l border-neutral-200/80 p-6 flex flex-col justify-between shadow-2xl">
 <div className="space-y-6">
 <div>
 <h3 className="text-base font-bold text-neutral-900 font-display">Historical Agreement Audit</h3>
 <p className="text-xs text-neutral-600 mt-1">Reviewing transaction metrics for contract {selectedRecord.membershipNumber}.</p>
 </div>

 <div className="space-y-4 font-mono text-xs">
 <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-3">
 <div className="flex justify-between"><span className="text-neutral-500">Plan Name</span><span className="text-neutral-800 font-bold">{selectedRecord.planName}</span></div>
 <div className="flex justify-between"><span className="text-neutral-500">Dates</span><span className="text-neutral-800">{selectedRecord.startDate} to {selectedRecord.endDate}</span></div>
 <div className="flex justify-between"><span className="text-neutral-500">Contract Value</span><span className="text-success font-bold">₹{selectedRecord.amountPaid.toLocaleString()}</span></div>
 <div className="flex justify-between"><span className="text-neutral-500">Transition Status</span><span className="text-neutral-800">{selectedRecord.status}</span></div>
 <div className="flex justify-between"><span className="text-neutral-500">Renewal Mode</span><span className="text-neutral-800">{selectedRecord.renewalType}</span></div>
 </div>

 <div className="space-y-2">
 <span className="text-[10px] text-neutral-500 uppercase font-sans font-semibold">Agreement Audit Trails</span>
 <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-neutral-50">
 <div className="flex gap-4 relative">
 <div className="w-6 h-6 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center z-10 text-[9px] font-bold text-danger">
 3
 </div>
 <div className="space-y-1 text-[11px]">
 <span className="font-bold text-neutral-800">Contract End / Expired</span>
 <span className="text-[9px] text-neutral-500 block">System Auto • {selectedRecord.endDate}</span>
 </div>
 </div>
 <div className="flex gap-4 relative">
 <div className="w-6 h-6 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center z-10 text-[9px] font-bold text-neutral-400">
 2
 </div>
 <div className="space-y-1 text-[11px]">
 <span className="font-bold text-neutral-800">Signed Document Uploaded</span>
 <span className="text-[9px] text-neutral-500 block">Owner Desk • {selectedRecord.startDate}</span>
 </div>
 </div>
 <div className="flex gap-4 relative">
 <div className="w-6 h-6 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center z-10 text-[9px] font-bold text-neutral-400">
 1
 </div>
 <div className="space-y-1 text-[11px]">
 <span className="font-bold text-neutral-800">Initial Payment Settled</span>
 <span className="text-[9px] text-neutral-500 block">Billing Bot • {selectedRecord.startDate}</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 <button
 onClick={() => setShowDetailsDrawer(false)}
 className="w-full py-2.5 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 font-semibold rounded-xl transition mt-6"
 >
 Close Drawer
 </button>
 </div>
 </div>
 </div>
 )}

 {/* MODAL: PRINTABLE MEMBER STATEMENT */}
 {showStatement && (
 <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
 <style>{`
 @media print {
 body > *:not(#stmt-print-root) { display: none !important; }
 #stmt-print-root { position: fixed; inset: 0; padding: 0; background: white; }
 .no-print { display: none !important; }
 .print-page { box-shadow: none !important; border: none !important; border-radius: 0 !important; max-height: none !important; overflow: visible !important; width: 210mm !important; min-height: 297mm !important; padding: 16mm !important; }
 @page { size: A4; margin: 0; }
 }
 `}</style>
 <div id="stmt-print-root" className="bg-neutral-100 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh]">

 {/* Modal toolbar */}
 <div className="no-print flex items-center justify-between px-5 py-3 border-b border-neutral-200 bg-white rounded-t-2xl shrink-0">
 <div>
 <p className="text-sm font-bold text-neutral-900">Member Statement</p>
 <p className="text-[11px] text-neutral-400">{stmtNo} · Generated {stmtDate}</p>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={() => window.print()}
 className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:opacity-90 transition"
 >
 <Printer className="w-3.5 h-3.5" />
 Print / Save PDF
 </button>
 <button
 onClick={() => setShowStatement(false)}
 className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition"
 >
 <span className="text-lg leading-none">×</span>
 </button>
 </div>
 </div>

 {/* Scrollable document preview */}
 <div className="overflow-y-auto flex-1 p-6">
 <div className="print-page bg-white rounded-xl shadow-sm border border-neutral-200 space-y-8 text-neutral-800" style={{ width: '210mm', minHeight: '297mm', padding: '16mm', margin: '0 auto' }}>

 {/* LETTERHEAD */}
 <div className="flex items-start justify-between pb-6 border-b-2 border-neutral-900">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
 <span className="text-white font-black text-sm">G</span>
 </div>
 <span className="text-xl font-black text-neutral-900 tracking-tight">GymFlow</span>
 </div>
 <p className="text-xs text-neutral-400 leading-relaxed mt-1">
 Enterprise Gym Management Platform<br />
 support@gymflow.io · www.gymflow.io
 </p>
 </div>
 <div className="text-right">
 <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Member Statement</p>
 <p className="text-2xl font-black text-neutral-900">{stmtNo}</p>
 <p className="text-xs text-neutral-400 mt-1">Issued: {stmtDate}</p>
 </div>
 </div>

 {/* MEMBER + GYM INFO BLOCK */}
 <div className="grid grid-cols-2 gap-8">
 <div>
 <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Issued To</p>
 <p className="text-sm font-bold text-neutral-900">{memberData.name}</p>
 <p className="text-xs text-neutral-500 mt-1">Member ID: <span className="font-mono font-semibold text-neutral-700">{memberData.memberId}</span></p>
 <p className="text-xs text-neutral-500">Member Since: {memberData.joinedDate}</p>
 <div className="mt-2">
 <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
 memberData.currentStatus === 'Active'
 ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
 : 'bg-neutral-100 border-neutral-200 text-neutral-500'
 }`}>
 <span className={`w-1.5 h-1.5 rounded-full ${memberData.currentStatus === 'Active' ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
 {memberData.currentStatus}
 </span>
 </div>
 </div>
 <div>
 <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Facility</p>
 <p className="text-sm font-bold text-neutral-900">Iron Peak Fitness</p>
 <p className="text-xs text-neutral-500 mt-1">Downtown Branch</p>
 <p className="text-xs text-neutral-500">Contact: front-desk@ironpeak.com</p>
 <p className="text-xs text-neutral-500 mt-2">Statement Period: Lifetime</p>
 </div>
 </div>

 {/* SUMMARY CHIPS */}
 <div className="grid grid-cols-4 gap-3">
 {[
 { label: 'Total Contracts', value: String(memberData.historyList.length), accent: 'border-primary/30 bg-primary/5' },
 { label: 'Active Now', value: String(stmtActiveCount), accent: 'border-emerald-200 bg-emerald-50' },
 { label: 'Completed', value: String(stmtExpiredCount), accent: 'border-neutral-200 bg-neutral-50' },
 { label: 'Lifetime Value', value: `₹${stmtTotalPaid.toLocaleString()}`, accent: 'border-violet-200 bg-violet-50' },
 ].map((chip, i) => (
 <div key={i} className={`rounded-xl border p-3 ${chip.accent}`}>
 <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wide">{chip.label}</p>
 <p className="text-base font-black text-neutral-900 mt-0.5">{chip.value}</p>
 </div>
 ))}
 </div>

 {/* SUBSCRIPTION TABLE */}
 <div>
 <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">Subscription History</p>
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="bg-neutral-900 text-white">
 <th className="py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wide rounded-tl-lg">#</th>
 <th className="py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wide">Contract Code</th>
 <th className="py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wide">Plan Name</th>
 <th className="py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wide">Period</th>
 <th className="py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wide">Status</th>
 <th className="py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wide text-right rounded-tr-lg">Amount</th>
 </tr>
 </thead>
 <tbody>
 {memberData.historyList.length === 0 ? (
 <tr>
 <td colSpan={6} className="py-8 text-center text-neutral-400 text-xs italic border border-t-0 border-neutral-200">
 No subscription records for this member.
 </td>
 </tr>
 ) : memberData.historyList.map((rec, idx) => (
 <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
 <td className="py-2.5 px-3 text-neutral-400 font-mono text-[10px] border-b border-neutral-100">{idx + 1}</td>
 <td className="py-2.5 px-3 font-mono font-bold text-neutral-700 text-[11px] border-b border-neutral-100">{rec.membershipNumber}</td>
 <td className="py-2.5 px-3 font-semibold text-neutral-800 border-b border-neutral-100">{rec.planName}</td>
 <td className="py-2.5 px-3 text-neutral-500 text-[11px] border-b border-neutral-100">
 {rec.startDate}<br />
 <span className="text-neutral-400">to {rec.endDate}</span>
 </td>
 <td className="py-2.5 px-3 border-b border-neutral-100">
 <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
 rec.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
 rec.status === 'Frozen' ? 'bg-blue-100 text-blue-700' :
 rec.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
 'bg-neutral-100 text-neutral-500'
 }`}>{rec.status}</span>
 </td>
 <td className="py-2.5 px-3 text-right font-bold text-neutral-900 border-b border-neutral-100">
 ₹{rec.amountPaid.toLocaleString()}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* FINANCIAL SUMMARY */}
 <div className="ml-auto w-72 space-y-2">
 <div className="flex justify-between text-xs text-neutral-500 py-1.5 border-b border-neutral-100">
 <span>Subtotal (Memberships)</span>
 <span className="font-semibold text-neutral-700">₹{stmtTotalPaid.toLocaleString()}</span>
 </div>
 <div className="flex justify-between text-xs text-neutral-500 py-1.5 border-b border-neutral-100">
 <span>GST / Tax (18% est.)</span>
 <span className="font-semibold text-neutral-700">₹{stmtTax.toLocaleString()}</span>
 </div>
 <div className="flex justify-between text-sm font-black text-neutral-900 py-2 bg-neutral-900 text-white px-3 rounded-lg">
 <span>Total Contribution</span>
 <span>₹{(stmtTotalPaid + stmtTax).toLocaleString()}</span>
 </div>
 </div>

 {/* FREEZE LOG (if any) */}
 {memberData.freezes.length > 0 && (
 <div>
 <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Freeze History</p>
 <div className="grid grid-cols-2 gap-3">
 {memberData.freezes.map((fr, i) => (
 <div key={i} className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs">
 <p className="font-semibold text-blue-800">{fr.freezePeriod}</p>
 <p className="text-blue-600 mt-0.5">{fr.reason}</p>
 <p className="text-blue-400 text-[10px] mt-1">{fr.duration} · Approved by {fr.approvedBy}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* FOOTER */}
 <div className="border-t-2 border-neutral-200 pt-5 flex items-start justify-between gap-6">
 <p className="text-[10px] text-neutral-400 leading-relaxed max-w-sm">
 This statement is computer-generated and does not require a signature. For disputes or corrections, contact your facility manager within 30 days of the statement date. All amounts are inclusive of applicable taxes unless stated otherwise.
 </p>
 <div className="text-right text-[10px] text-neutral-400 shrink-0">
 <p className="font-semibold text-neutral-600">GymFlow Platform</p>
 <p>Statement ref: {stmtNo}</p>
 <p>{stmtDate}</p>
 </div>
 </div>

 </div>
 </div>
 </div>
 </div>
 )}

 </div>
 );
}

export default function MembershipHistoryPage() {
 return (
 <Suspense fallback={
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Initializing Suspense context...
 </div>
 }>
 <MembershipHistoryContent />
 </Suspense>
 );
}
