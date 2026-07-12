'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
 Calendar,
 Users,
 Search,
 CheckCircle,
 XCircle,
 AlertTriangle,
 History,
 Mail,
 MessageCircle,
 Building,
 RefreshCw,
 Zap,
 Check,
 Info,
 Clock,
 QrCode,
 Volume2,
 Tv,
 UserPlus,
 ArrowRight,
 ShieldAlert,
 Bell,
 Lock,
 ChevronDown,
 Filter,
 FileDown,
 Edit,
 Sliders,
 Download,
 TrendingUp,
 UserCheck,
 MapPin,
 Activity,
 MoreHorizontal,
 ChevronLeft,
 ChevronRight,
 Trash2,
 Eye,
 FileText
} from 'lucide-react';
import { gymApi, attendanceApi } from '../../../../lib/api';
import { Tabs } from '../../../../components/ui';
import AttendanceTabs from '../AttendanceTabs';

// Interfaces
interface AttendanceRecord {
 id: string;
 memberName: string;
 memberId: string;
 phone: string;
 branchId: string;
 branchName: string;
 checkInTime: string | Date;
 checkOutTime?: string | Date;
 durationText: string;
 elapsedMinutes: number;
 method: string;
 status: string; // 'Checked In', 'Checked Out', 'Active Session', 'Auto Checked Out', 'Corrected', 'Missed Check-Out', 'Denied Entry', 'Cancelled'
 reason?: string;
 recordedBy?: string;
 deviceUsed?: string;
 checkoutMethod?: string;
 planName?: string;
 trainerName?: string;
}

interface AnalyticsData {
 dailyTrends: { date: string; count: number }[];
 peakHours: { hour: string; count: number }[];
 heatmap: number[][];
 branchAnalytics: {
 branchId: string;
 branchName: string;
 attendanceCount: number;
 averageDuration: number;
 deniedEntries: number;
 occupancyRate: number;
 }[];
 memberInsights: any[];
 trainerInsights: any[];
 averageVisitDuration: number;
}

interface ActiveMember {
 id: string;
 name: string;
 memberId: string;
 phone: string;
 status: 'Active' | 'Expired' | 'Guest';
 checkInTime: string;
 checkInTimeRaw: string;
 elapsedMinutes: number;
 maxSessionDuration: number;
 isOverLimit: boolean;
 planName: string;
 branchName: string;
 branchId: string;
}

interface ExceptionRecord {
 id: string;
 memberName: string;
 memberId: string;
 branchName: string;
 checkInTime: string;
 exceptionType: string;
 reason: string;
 severity: 'low' | 'medium' | 'high';
}

function AttendanceRecordsContent() {
 const router = useRouter();
 const searchParams = useSearchParams();

 // Basic States
 const [loading, setLoading] = useState(true);
 const [searchLoading, setSearchLoading] = useState(false);
 const [userRole, setUserRole] = useState('manager'); // 'owner', 'manager', 'receptionist', 'trainer', 'dietitian'
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 // Search, Pagination & Filters
 const [searchQuery, setSearchQuery] = useState('');
 const [page, setPage] = useState(1);
 const [totalPages, setTotalPages] = useState(1);
 const [totalRecords, setTotalRecords] = useState(0);
 const [selectedBranch, setSelectedBranch] = useState(searchParams.get('gymId') || 'all');
 const [selectedStatus, setSelectedStatus] = useState('all');
 const [selectedMethod, setSelectedMethod] = useState('all');
 const [dateFrom, setDateFrom] = useState('');
 const [dateTo, setDateTo] = useState('');

 // UI Panels
 const [showFilters, setShowFilters] = useState(false);
 const initialTab = (searchParams.get('tab') as 'records' | 'inside' | 'analytics' | 'exceptions') || 'records';
 const [activeTab, setActiveTab] = useState<'records' | 'inside' | 'analytics' | 'exceptions'>(initialTab);

 // Currently Inside (live roster)
 const [activeMembers, setActiveMembers] = useState<ActiveMember[]>([]);
 const [activeMembersLoading, setActiveMembersLoading] = useState(false);

 // Selected Item Drawer / Correction Modal
 const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
 const [showDetailDrawer, setShowDetailDrawer] = useState(false);
 const [showCorrectionModal, setShowCorrectionModal] = useState(false);
 const [showBulkCorrectionModal, setShowBulkCorrectionModal] = useState(false);
 const [correctionInTime, setCorrectionInTime] = useState('08:00');
 const [correctionOutTime, setCorrectionOutTime] = useState('09:30');
 const [correctionReason, setCorrectionReason] = useState('');

 // Bulk actions selection
 const [selectedIds, setSelectedIds] = useState<string[]>([]);

 // DB Data
 const [branches, setBranches] = useState<any[]>([]);
 const [records, setRecords] = useState<AttendanceRecord[]>([]);
 const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
 const [exceptions, setExceptions] = useState<ExceptionRecord[]>([]);

 // KPI Dashboard Stats
 const [stats, setStats] = useState({
 todayCount: 0,
 monthCount: 0,
 activeInside: 0,
 totalDenied: 0,
 totalExceptions: 0,
 });

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 // Saved Filters definitions
 const applySavedFilter = (filterType: string) => {
 const todayStr = new Date().toISOString().split('T')[0];
 switch (filterType) {
 case 'today':
 setDateFrom(todayStr);
 setDateTo(todayStr);
 setSelectedStatus('all');
 break;
 case 'missed':
 setDateFrom('');
 setDateTo('');
 setSelectedStatus('Missed Check-Out');
 break;
 case 'active':
 setDateFrom('');
 setDateTo('');
 setSelectedStatus('Active Session');
 break;
 case 'denied':
 setDateFrom('');
 setDateTo('');
 setSelectedStatus('Denied Entry');
 break;
 default:
 break;
 }
 setPage(1);
 showToast(`Applied filter: ${filterType}`, 'success');
 };

 const loadData = async () => {
 try {
 setLoading(true);
 const orgId = localStorage.getItem('organizationId') || '';
 const branchList = await gymApi.list(orgId);
 setBranches(branchList || []);

 const activeGymId = branchList?.[0]?.id || 'all';

 // Load analytics and exceptions
 const analyticsData = await attendanceApi.getAnalytics(activeGymId === 'all' ? undefined : activeGymId);
 setAnalytics(analyticsData);

 const exceptionsData = await attendanceApi.getExceptions(activeGymId === 'all' ? undefined : activeGymId);
 setExceptions(exceptionsData || []);

 // Load overall stats
 const liveStats = await attendanceApi.getStats(activeGymId);
 setStats({
 todayCount: liveStats.totalCheckInsToday || 0,
 monthCount: (liveStats.totalCheckInsToday || 0) * 22, // simulated monthly aggregate
 activeInside: liveStats.activeInside || 0,
 totalDenied: liveStats.totalDenied || 0,
 totalExceptions: exceptionsData?.length || 0,
 });

 await fetchRecords();
 } catch (err) {
 console.error(err);
 showToast('Failed to load initial data', 'error');
 } finally {
 setLoading(false);
 }
 };

 const fetchActiveMembers = async () => {
 try {
 setActiveMembersLoading(true);
 const data = await attendanceApi.listActive(selectedBranch === 'all' ? undefined : selectedBranch);
 let items: ActiveMember[] = data || [];
 if (userRole === 'trainer') {
 items = items.filter((i: any) => i.trainerName === 'Trainer Frank');
 }
 setActiveMembers(items);
 } catch (err) {
 console.error(err);
 showToast('Failed to fetch currently-inside roster', 'error');
 } finally {
 setActiveMembersLoading(false);
 }
 };

 const fetchRecords = async () => {
 try {
 setSearchLoading(true);
 const activeGymId = selectedBranch === 'all' ? undefined : selectedBranch;
 const statusParam = selectedStatus === 'all' ? undefined : selectedStatus;
 const methodParam = selectedMethod === 'all' ? undefined : selectedMethod;

 const result = await attendanceApi.search({
 query: searchQuery || undefined,
 gymId: activeGymId,
 status: statusParam,
 method: methodParam,
 dateFrom: dateFrom || undefined,
 dateTo: dateTo || undefined,
 page,
 limit: 15,
 });

 let items = result.items || [];
 // Role Constraint: Trainers see assigned members only
 if (userRole === 'trainer') {
 items = items.filter((i: any) => i.trainerName === 'Trainer Frank');
 }

 setRecords(items);
 setTotalRecords(result.total || 0);
 setTotalPages(result.totalPages || 1);
 } catch (err) {
 console.error(err);
 showToast('Failed to fetch attendance logs', 'error');
 } finally {
 setSearchLoading(false);
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
 }, [userRole]);

 useEffect(() => {
 fetchRecords();
 }, [page, selectedBranch, selectedStatus, selectedMethod, dateFrom, dateTo]);

 // Live roster: load on branch change / tab open, then poll every 30s while visible.
 useEffect(() => {
 if (activeTab !== 'inside') return;
 fetchActiveMembers();
 const timer = setInterval(fetchActiveMembers, 30_000);
 return () => clearInterval(timer);
 }, [activeTab, selectedBranch]);

 const handleSearchKeyPress = (e: React.KeyboardEvent) => {
 if (e.key === 'Enter') {
 setPage(1);
 fetchRecords();
 }
 };

 const handleSingleCorrection = async () => {
 if (!selectedRecord) return;
 if (userRole === 'dietitian') {
 showToast('Error: Dietitian role does not have edit permissions.', 'error');
 return;
 }

 try {
 await attendanceApi.correctRecord(selectedRecord.id, {
 checkInTime: correctionInTime,
 checkOutTime: correctionOutTime,
 reason: correctionReason,
 });
 showToast('Record corrected successfully!', 'success');
 setShowCorrectionModal(false);
 setShowDetailDrawer(false);
 fetchRecords();
 } catch (err) {
 console.error(err);
 showToast('Failed to save correction', 'error');
 }
 };

 const handleBulkCorrection = async () => {
 if (selectedIds.length === 0) return;
 if (userRole === 'dietitian') {
 showToast('Error: Dietitian role does not have edit permissions.', 'error');
 return;
 }

 try {
 await attendanceApi.bulkCorrect({
 ids: selectedIds,
 checkInTime: correctionInTime,
 checkOutTime: correctionOutTime,
 reason: correctionReason,
 });
 showToast(`Corrected ${selectedIds.length} records successfully!`, 'success');
 setShowBulkCorrectionModal(false);
 setSelectedIds([]);
 fetchRecords();
 } catch (err) {
 console.error(err);
 showToast('Failed to bulk correct records', 'error');
 }
 };

 const handleBulkCheckOut = async () => {
 if (selectedIds.length === 0) return;
 if (userRole === 'dietitian') {
 showToast('Error: Dietitian role is read-only.', 'error');
 return;
 }

 try {
 await attendanceApi.bulkCheckOut(selectedIds);
 showToast(`Checked out ${selectedIds.length} members!`, 'success');
 setSelectedIds([]);
 fetchRecords();
 } catch (err) {
 console.error(err);
 showToast('Failed to bulk check out sessions', 'error');
 }
 };

 const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
 if (records.length === 0) {
 showToast('No records available to export', 'error');
 return;
 }

 showToast(`Compiling attendance register. Preparing ${format.toUpperCase()}...`, 'success');

 // Create a mock download link
 const headers = 'Attendance ID,Member Name,Member ID,Branch,Check-In,Check-Out,Duration,Status,Method\n';
 const rows = records.map(r => 
 `"${r.id}","${r.memberName}","${r.memberId}","${r.branchName}","${r.checkInTime}","${r.checkOutTime || ''}","${r.durationText}","${r.status}","${r.method}"`
 ).join('\n');

 const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.setAttribute('href', url);
 link.setAttribute('download', `gymflow_attendance_export_${new Date().toISOString().split('T')[0]}.${format}`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 };

 const toggleSelectRow = (id: string) => {
 if (selectedIds.includes(id)) {
 setSelectedIds(selectedIds.filter(x => x !== id));
 } else {
 setSelectedIds([...selectedIds, id]);
 }
 };

 const toggleSelectAll = () => {
 if (selectedIds.length === records.length) {
 setSelectedIds([]);
 } else {
 setSelectedIds(records.map(r => r.id));
 }
 };

 if (loading) {
 return (
 <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
 <RefreshCw className="w-8 h-8 text-primary animate-spin" />
 <p className="text-neutral-600 text-sm font-medium">Loading Attendance Records Portal...</p>
 </div>
 );
 }

 return (
 <div className="p-6 max-w-[1600px] mx-auto space-y-6 text-neutral-900 min-h-screen bg-background">
 {/* TOAST SYSTEM */}
 {toast && (
 <div className={`fixed bottom-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold transition-all duration-300 transform translate-y-0 ${
 toast.type === 'success' 
 ? 'bg-success-light border-green-200 text-success' 
 : 'bg-danger-light border-red-200 text-danger'
 }`}>
 {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-success" /> : <XCircle className="w-5 h-5 text-danger" />}
 <span>{toast.message}</span>
 </div>
 )}

 {/* HEADER SECTION */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100/60 pb-5">
 <div>
 <div className="flex items-center gap-3">
 <span className="bg-primary-light text-primary p-2.5 rounded-2xl border border-primary/20">
 <History className="w-5 h-5" />
 </span>
 <div>
 <h1 className="text-xl font-bold tracking-tight text-neutral-900">
 Attendance Records & History
 </h1>
 <p className="text-neutral-500 text-xs mt-0.5">
 Centralized audit trail, real-time analytics, and exception handling database.
 </p>
 </div>
 </div>
 </div>

 {/* ROLE SIMULATOR & ACTIONS */}
 <div className="flex flex-wrap items-center gap-3">
 <div className="flex gap-2">
 <button
 onClick={() => handleExport('csv')}
 className="px-3 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-300 text-neutral-700 text-xs font-semibold rounded-xl transition flex items-center gap-2 cursor-pointer"
 >
 <FileDown className="w-4 h-4 text-primary" />
 <span className="hidden sm:inline">Export CSV</span>
 </button>
 <button
 onClick={() => handleExport('pdf')}
 className="px-3 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition flex items-center gap-2"
 >
 <FileText className="w-4 h-4 text-primary" />
 <span className="hidden sm:inline">Print Register</span>
 </button>
 </div>
 </div>
 </div>

 {/* TABS ROW */}
 <AttendanceTabs />

 {/* KPI METRICS */}
 <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
 {[
 { label: "Today's Visits", value: stats.todayCount, suffix: 'Check-ins', icon: Calendar, color: 'text-primary', bg: 'bg-primary-light border-primary/20' },
 { label: 'This Month', value: stats.monthCount, suffix: 'Records', icon: History, color: 'text-primary', bg: 'bg-primary-light border-primary/20' },
 { label: 'Currently Inside', value: stats.activeInside, suffix: 'Active', icon: UserCheck, color: 'text-success', bg: 'bg-success-light border-green-200' },
 { label: 'Denied Entries', value: stats.totalDenied, suffix: 'Attempts', icon: ShieldAlert, color: 'text-amber-700', bg: 'bg-warning-light border-amber-200' },
 { label: 'Exceptions Triggered', value: stats.totalExceptions, suffix: 'Flags', icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger-light border-red-200' },
 ].map((kpi, i) => (
 <div key={i} className={`${kpi.bg} border p-4 rounded-2xl`}>
 <div className="flex items-center justify-between mb-2">
 <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-wide">{kpi.label}</span>
 <kpi.icon className={`w-3.5 h-3.5 ${kpi.color} shrink-0`} />
 </div>
 <span className={`text-2xl font-black block ${kpi.color}`}>{kpi.value}</span>
 <span className="text-[10px] text-neutral-500 block mt-0.5">{kpi.suffix}</span>
 </div>
 ))}
 </div>

 {/* DASHBOARD TAB NAVIGATION */}
 <Tabs
 scrollable={false}
 tabs={[
 { id: 'records', label: 'Interactive Audit Logs', icon: Sliders },
 { id: 'inside', label: 'Currently Inside', icon: UserCheck, badge: stats.activeInside > 0 ? stats.activeInside : undefined },
 { id: 'analytics', label: 'Analytics & 24/7 Heatmap', icon: TrendingUp },
 { id: 'exceptions', label: 'Exception Resolution Center', icon: ShieldAlert },
 ]}
 activeId={activeTab}
 onChange={(id) => setActiveTab(id as any)}
 />

 {/* TAB 1: AUDIT RECORDS VIEW */}
 {activeTab === 'records' && (
 <div className="space-y-4">
 {/* SEARCH, QUICK FILTERS & SAVED FILTERS */}
 <div className="bg-white border border-neutral-200 p-4 rounded-xl space-y-4">
 <div className="flex flex-col lg:flex-row gap-3">
 {/* Search Bar */}
 <div className="relative flex-1">
 <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 onKeyPress={handleSearchKeyPress}
 placeholder="Global Search (Name, Member ID, Phone, Attendance ID, Trainer name...)"
 className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light transition"
 />
 {searchLoading && (
 <RefreshCw className="absolute right-3.5 top-3 w-4 h-4 text-primary animate-spin" />
 )}
 </div>

 {/* Advanced Filter Toggle */}
 <button
 onClick={() => setShowFilters(!showFilters)}
 className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
 showFilters ? 'bg-primary-light border-primary/20 text-primary' : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-neutral-300'
 }`}
 >
 <Filter className="w-4 h-4" />
 <span>Filters {showFilters ? 'Active' : ''}</span>
 </button>

 <button
 onClick={() => {
 setSearchQuery('');
 setSelectedBranch('all');
 setSelectedStatus('all');
 setSelectedMethod('all');
 setDateFrom('');
 setDateTo('');
 setPage(1);
 showToast('Filters reset', 'success');
 }}
 className="px-4 py-2.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-600 hover:text-neutral-900 text-xs font-bold rounded-xl transition"
 >
 Reset
 </button>
 </div>

 {/* SAVED FILTERS LINE */}
 <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100/60 pt-3">
 <span className="text-[10px] text-neutral-500 uppercase font-sans font-bold">Saved Segments:</span>
 <button
 onClick={() => applySavedFilter('today')}
 className="px-2.5 py-1 bg-neutral-50 hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-[11px] text-neutral-700 font-semibold rounded-lg transition"
 >
 Today's Attendance
 </button>
 <button
 onClick={() => applySavedFilter('missed')}
 className="px-2.5 py-1 bg-neutral-50 hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-[11px] text-neutral-700 font-semibold rounded-lg transition"
 >
 Missed Check-Outs
 </button>
 <button
 onClick={() => applySavedFilter('active')}
 className="px-2.5 py-1 bg-neutral-50 hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-[11px] text-neutral-600 font-semibold rounded-lg transition"
 >
 Active Sessions
 </button>
 <button
 onClick={() => applySavedFilter('denied')}
 className="px-2.5 py-1 bg-neutral-50 hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-[11px] text-neutral-600 font-semibold rounded-lg transition"
 >
 Denied Entry logs
 </button>
 </div>

 {/* ADVANCED FILTER PANEL */}
 {showFilters && (
 <div className="grid grid-cols-1 md:grid-cols-5 gap-4 border-t border-neutral-100/60 pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
 {/* Branch Selection */}
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Branch Location</label>
 <select
 value={selectedBranch}
 onChange={(e) => { setSelectedBranch(e.target.value); setPage(1); }}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-700 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light"
 >
 <option value="all">All Locations</option>
 {branches.map((b) => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>
 </div>

 {/* Status Selection */}
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Status</label>
 <select
 value={selectedStatus}
 onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-700 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light"
 >
 <option value="all">All Statuses</option>
 <option value="Active Session">Active Inside</option>
 <option value="Checked Out">Checked Out</option>
 <option value="Denied Entry">Denied Entry</option>
 <option value="Missed Check-Out">Missed Check-Out</option>
 <option value="Auto Checked Out">Auto Checked Out</option>
 <option value="Corrected">Corrected Log</option>
 </select>
 </div>

 {/* Method Selection */}
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Scan Method</label>
 <select
 value={selectedMethod}
 onChange={(e) => { setSelectedMethod(e.target.value); setPage(1); }}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-700 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light"
 >
 <option value="all">All Methods</option>
 <option value="QR Code">QR Code Scan</option>
 <option value="Manual Search">Manual Search</option>
 <option value="Barcode Scan">Barcode Card</option>
 <option value="Mobile App">Mobile App GPS</option>
 </select>
 </div>

 {/* Date range from */}
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Date From</label>
 <input
 type="date"
 value={dateFrom}
 onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-700 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light"
 />
 </div>

 {/* Date range to */}
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Date To</label>
 <input
 type="date"
 value={dateTo}
 onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-700 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light"
 />
 </div>
 </div>
 )}
 </div>

 {/* BULK ACTION ACTION BAR */}
 {selectedIds.length > 0 && (
 <div className="bg-primary-light border border-primary/20 p-3.5 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-300">
 <div className="flex items-center gap-3">
 <span className="bg-primary text-white text-xs px-2.5 py-1 rounded-lg font-extrabold">
 {selectedIds.length} Selected
 </span>
 <span className="text-neutral-700 text-xs font-semibold">Select batch action to apply:</span>
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => handleBulkCheckOut()}
 className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-800 hover:text-neutral-900 text-xs font-bold rounded-lg transition"
 >
 Force Exit Checkout
 </button>
 <button
 onClick={() => {
 setCorrectionReason('Batch timestamp correction');
 setShowBulkCorrectionModal(true);
 }}
 className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-800 hover:text-neutral-900 text-xs font-bold rounded-lg transition"
 >
 Bulk Adjust Times
 </button>
 <button
 onClick={() => {
 setSelectedIds([]);
 showToast('Selection cleared', 'success');
 }}
 className="px-3 py-1.5 bg-neutral-50 hover:bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-800 text-xs font-bold rounded-lg transition"
 >
 Cancel
 </button>
 </div>
 </div>
 )}

 {/* MAIN DATA TABLE */}
 <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xl">
 <div className="overflow-x-auto max-h-[calc(100vh-420px)] overflow-y-auto scrollbar-thin">
 <table className="w-full text-left border-collapse">
 <thead className="sticky top-0 bg-background z-10">
 <tr className="border-b border-neutral-100/60 bg-neutral-50/50">
 <th className="p-4 w-10">
 <input
 type="checkbox"
 checked={records.length > 0 && selectedIds.length === records.length}
 onChange={toggleSelectAll}
 className="rounded border-neutral-300 text-primary focus:ring-primary-light bg-white cursor-pointer"
 />
 </th>
 <th className="p-4 text-[10px] text-neutral-600 uppercase tracking-wider font-extrabold">Attendance ID</th>
 <th className="p-4 text-[10px] text-neutral-600 uppercase tracking-wider font-extrabold">Member</th>
 <th className="p-4 text-[10px] text-neutral-600 uppercase tracking-wider font-extrabold">Branch</th>
 <th className="p-4 text-[10px] text-neutral-600 uppercase tracking-wider font-extrabold">Check-In</th>
 <th className="p-4 text-[10px] text-neutral-600 uppercase tracking-wider font-extrabold">Check-Out</th>
 <th className="p-4 text-[10px] text-neutral-600 uppercase tracking-wider font-extrabold">Duration</th>
 <th className="p-4 text-[10px] text-neutral-600 uppercase tracking-wider font-extrabold">Status</th>
 <th className="p-4 text-[10px] text-neutral-600 uppercase tracking-wider font-extrabold">Method</th>
 <th className="p-4 text-[10px] text-neutral-600 uppercase tracking-wider font-extrabold text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100/30">
 {records.length === 0 ? (
 <tr>
 <td colSpan={10} className="p-10 text-center text-neutral-500 text-xs font-semibold">
 <Users className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
 No Attendance Logs Found matching current search terms.
 </td>
 </tr>
 ) : (
 records.map((r) => {
 const inDate = new Date(r.checkInTime);
 const outDate = r.checkOutTime ? new Date(r.checkOutTime) : null;
 return (
 <tr key={r.id} className="hover:bg-neutral-50/20 transition group">
 <td className="p-4">
 <input
 type="checkbox"
 checked={selectedIds.includes(r.id)}
 onChange={() => toggleSelectRow(r.id)}
 className="rounded border-neutral-300 text-primary focus:ring-primary-light bg-white cursor-pointer"
 />
 </td>
 <td className="p-4 font-mono text-[10px] text-neutral-500">{r.id.substring(0, 8)}...</td>
 <td className="p-4">
 <div>
 <span className="text-xs font-bold text-neutral-800 block">{r.memberName}</span>
 <span className="text-[10px] text-neutral-500 block mt-0.5">ID: {r.memberId}</span>
 </div>
 </td>
 <td className="p-4">
 <span className="text-xs font-medium text-neutral-700">{r.branchName}</span>
 </td>
 <td className="p-4">
 <div>
 <span className="text-xs font-semibold text-neutral-700 block">
 {inDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
 </span>
 <span className="text-[9px] text-neutral-500 block">{inDate.toLocaleDateString()}</span>
 </div>
 </td>
 <td className="p-4">
 {outDate ? (
 <div>
 <span className="text-xs font-semibold text-neutral-700 block">
 {outDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
 </span>
 <span className="text-[9px] text-neutral-500 block">{outDate.toLocaleDateString()}</span>
 </div>
 ) : r.status === 'Denied Entry' ? (
 <span className="text-xs text-neutral-400 italic">N/A</span>
 ) : (
 <span className="text-xs font-bold text-success italic">Active Inside</span>
 )}
 </td>
 <td className="p-4">
 <span className="text-xs font-semibold text-neutral-600">{r.durationText}</span>
 </td>
 <td className="p-4">
 <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full border uppercase ${
 r.status === 'Denied Entry'
 ? 'bg-danger-light border-red-200 text-danger'
 : r.status === 'Active Session'
 ? 'bg-success-light border-green-200 text-success'
 : 'bg-neutral-50 border-neutral-200 text-neutral-700'
 }`}>
 {r.status}
 </span>
 {r.reason && (
 <span className={`block mt-1 text-[9px] font-medium max-w-[160px] ${r.status === 'Denied Entry' ? 'text-danger' : 'text-amber-700'}`}>
 {r.reason}
 </span>
 )}
 </td>
 <td className="p-4">
 <span className="text-[11px] text-neutral-600 font-semibold">{r.method}</span>
 </td>
 <td className="p-4 text-right">
 <div className="flex items-center justify-end gap-1.5">
 <button
 onClick={() => {
 setSelectedRecord(r);
 setShowDetailDrawer(true);
 }}
 className="p-1.5 hover:bg-neutral-50 hover:text-neutral-900 rounded-lg text-neutral-600 transition"
 title="View details"
 >
 <Eye className="w-4 h-4" />
 </button>
 
 {/* Read only block for dietitian */}
 {userRole !== 'dietitian' && (
 <button
 onClick={() => {
 setSelectedRecord(r);
 if (r.checkInTime) {
 const inD = new Date(r.checkInTime);
 setCorrectionInTime(`${inD.getHours().toString().padStart(2, '0')}:${inD.getMinutes().toString().padStart(2, '0')}`);
 }
 if (r.checkOutTime) {
 const outD = new Date(r.checkOutTime);
 setCorrectionOutTime(`${outD.getHours().toString().padStart(2, '0')}:${outD.getMinutes().toString().padStart(2, '0')}`);
 } else {
 setCorrectionOutTime('18:00');
 }
 setCorrectionReason(r.reason || 'Manual log adjustment');
 setShowCorrectionModal(true);
 }}
 className="p-1.5 hover:bg-neutral-50 hover:text-neutral-900 rounded-lg text-neutral-600 transition"
 title="Correct record"
 >
 <Edit className="w-4 h-4" />
 </button>
 )}
 </div>
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>

 {/* PAGINATION PANEL */}
 {totalPages > 1 && (
 <div className="p-4 border-t border-neutral-100/60 bg-neutral-50/20 flex items-center justify-between">
 <span className="text-xs text-neutral-600">
 Showing <span className="font-bold text-neutral-800">{(page - 1) * 15 + 1}</span> to{' '}
 <span className="font-bold text-neutral-800">
 {Math.min(page * 15, totalRecords)}
 </span>{' '}
 of <span className="font-bold text-neutral-800">{totalRecords}</span> entries
 </span>
 <div className="flex gap-2">
 <button
 disabled={page === 1}
 onClick={() => setPage(page - 1)}
 className="p-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-600 hover:text-neutral-900 disabled:opacity-40 disabled:hover:text-neutral-600 transition"
 >
 <ChevronLeft className="w-4 h-4" />
 </button>
 <span className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 text-xs font-bold rounded-lg text-neutral-700">
 {page} / {totalPages}
 </span>
 <button
 disabled={page === totalPages}
 onClick={() => setPage(page + 1)}
 className="p-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-600 hover:text-neutral-900 disabled:opacity-40 disabled:hover:text-neutral-600 transition"
 >
 <ChevronRight className="w-4 h-4" />
 </button>
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 {/* TAB: CURRENTLY INSIDE (live roster) */}
 {activeTab === 'inside' && (
 <div className="space-y-4">
 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans font-bold">Inside Right Now</span>
 <span className="text-xl font-extrabold text-success block mt-1">{activeMembers.length} Members</span>
 </div>
 <div className="bg-white border border-amber-200 p-4 rounded-xl">
 <span className="text-[9px] text-amber-700 uppercase font-sans font-bold">Exceeded Time Limit</span>
 <span className="text-xl font-extrabold text-amber-700 block mt-1">{activeMembers.filter(m => m.isOverLimit).length} Overstaying</span>
 </div>
 <div className="bg-white border border-red-200 p-4 rounded-xl">
 <span className="text-[9px] text-danger uppercase font-sans font-bold">Expired Subscription</span>
 <span className="text-xl font-extrabold text-danger block mt-1">{activeMembers.filter(m => m.status === 'Expired').length} Inside Anyway</span>
 </div>
 </div>

 <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xl">
 <div className="flex items-center justify-between p-4 border-b border-neutral-100/60">
 <div>
 <h3 className="text-xs font-extrabold text-neutral-800 uppercase tracking-wider">Live Roster</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Members checked in with no check-out yet. Auto-refreshes every 30 seconds.</p>
 </div>
 <button
 onClick={() => fetchActiveMembers()}
 disabled={activeMembersLoading}
 className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-700 text-xs font-bold rounded-lg transition flex items-center gap-2 disabled:opacity-50"
 >
 <RefreshCw className={`w-3.5 h-3.5 ${activeMembersLoading ? 'animate-spin' : ''}`} />
 Refresh
 </button>
 </div>

 <div className="overflow-x-auto max-h-[calc(100vh-420px)] overflow-y-auto scrollbar-thin">
 <table className="w-full text-left border-collapse">
 <thead className="sticky top-0 bg-background z-10">
 <tr className="border-b border-neutral-100/60 bg-neutral-50/50">
 <th className="p-4 text-[10px] text-neutral-600 uppercase tracking-wider font-extrabold">Member</th>
 <th className="p-4 text-[10px] text-neutral-600 uppercase tracking-wider font-extrabold">Branch</th>
 <th className="p-4 text-[10px] text-neutral-600 uppercase tracking-wider font-extrabold">Check-In</th>
 <th className="p-4 text-[10px] text-neutral-600 uppercase tracking-wider font-extrabold">Duration</th>
 <th className="p-4 text-[10px] text-neutral-600 uppercase tracking-wider font-extrabold">Membership</th>
 <th className="p-4 text-[10px] text-neutral-600 uppercase tracking-wider font-extrabold">Plan</th>
 <th className="p-4 text-[10px] text-neutral-600 uppercase tracking-wider font-extrabold text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100/30">
 {activeMembersLoading && activeMembers.length === 0 ? (
 <tr>
 <td colSpan={7} className="p-10 text-center text-neutral-500 text-xs font-semibold">
 <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto mb-3" />
 Loading live roster...
 </td>
 </tr>
 ) : activeMembers.length === 0 ? (
 <tr>
 <td colSpan={7} className="p-10 text-center text-neutral-500 text-xs font-semibold">
 <UserCheck className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
 Nobody is currently checked in.
 </td>
 </tr>
 ) : (
 activeMembers.map((m) => (
 <tr key={m.id} className={`hover:bg-neutral-50/20 transition group ${m.isOverLimit ? 'bg-warning-light' : ''}`}>
 <td className="p-4">
 <span className="text-xs font-bold text-neutral-800 block">{m.name}</span>
 <span className="text-[10px] text-neutral-500 block mt-0.5">ID: {m.memberId}</span>
 </td>
 <td className="p-4">
 <span className="text-xs font-medium text-neutral-700">{m.branchName}</span>
 </td>
 <td className="p-4">
 <span className="text-xs font-semibold text-neutral-700">{m.checkInTime}</span>
 </td>
 <td className="p-4">
 <span className={`text-xs font-bold ${m.isOverLimit ? 'text-amber-700' : 'text-neutral-700'}`}>
 {Math.floor(m.elapsedMinutes / 60)}h {m.elapsedMinutes % 60}m
 </span>
 {m.isOverLimit && (
 <span className="block text-[9px] text-amber-700 font-bold uppercase mt-0.5">Over {m.maxSessionDuration}min limit</span>
 )}
 </td>
 <td className="p-4">
 <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full border uppercase ${
 m.status === 'Expired'
 ? 'bg-danger-light border-red-200 text-danger'
 : m.status === 'Guest'
 ? 'bg-neutral-50 border-neutral-200 text-neutral-700'
 : 'bg-success-light border-green-200 text-success'
 }`}>
 {m.status === 'Expired' ? 'Subscription Expired' : m.status}
 </span>
 </td>
 <td className="p-4">
 <span className="text-[11px] text-neutral-600 font-semibold">{m.planName}</span>
 </td>
 <td className="p-4 text-right">
 {userRole !== 'dietitian' && userRole !== 'trainer' && (
 <button
 onClick={async () => {
 try {
 await attendanceApi.checkOut(m.id);
 showToast(`Checked out ${m.name}.`);
 fetchActiveMembers();
 } catch (err) {
 console.error(err);
 showToast('Check-out failed', 'error');
 }
 }}
 className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-700 hover:text-neutral-900 text-[10px] font-bold rounded-lg transition"
 >
 Check Out
 </button>
 )}
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 )}

 {/* TAB 2: ANALYTICS & HEATMAP */}
 {activeTab === 'analytics' && analytics && (
 <div className="space-y-6">
 {/* TOP ANALYTICS HIGHLIGHTS */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {/* Daily Trends Chart */}
 <div className="bg-white border border-neutral-200 p-5 rounded-xl space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-extrabold text-neutral-700 uppercase tracking-wider">Attendance Trends (Last 30 Days)</h3>
 <Activity className="w-4 h-4 text-primary" />
 </div>
 <div className="h-40 w-full flex items-end justify-between gap-1 pt-4 border-b border-neutral-100/60 pb-1">
 {analytics.dailyTrends.slice(-15).map((t, idx) => {
 const maxVal = Math.max(...analytics.dailyTrends.map(x => x.count), 1);
 const htPercent = Math.max(Math.min((t.count / maxVal) * 100, 100), 5);
 return (
 <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
 {/* Tooltip */}
 <span className="absolute bottom-full mb-1 scale-0 group-hover:scale-100 bg-neutral-50 border border-neutral-200 text-[10px] text-neutral-800 font-bold px-1.5 py-0.5 rounded transition shadow-xl z-20 whitespace-nowrap">
 {t.count} visits
 </span>
 <div 
 style={{ height: `${htPercent}%` }} 
 className="w-full bg-primary-light rounded-t group-hover:from-danger group-hover:to-primary transition-all duration-300"
 />
 <span className="text-[9px] text-neutral-500 font-semibold rotate-45 origin-top-left mt-2 block whitespace-nowrap">{t.date.split('-')[2]}</span>
 </div>
 );
 })}
 </div>
 </div>

 {/* Peak Hours Distribution */}
 <div className="bg-white border border-neutral-200 p-5 rounded-xl space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-extrabold text-neutral-700 uppercase tracking-wider">Peak Entry Traffic Hours</h3>
 <Clock className="w-4 h-4 text-primary" />
 </div>
 <div className="h-40 w-full flex items-end justify-between gap-1 pt-4 border-b border-neutral-100/60 pb-1">
 {analytics.peakHours.filter((_, idx) => idx % 2 === 0 || idx > 12).map((t, idx) => {
 const maxVal = Math.max(...analytics.peakHours.map(x => x.count), 1);
 const htPercent = Math.max(Math.min((t.count / maxVal) * 100, 100), 5);
 return (
 <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
 <span className="absolute bottom-full mb-1 scale-0 group-hover:scale-100 bg-neutral-50 border border-neutral-200 text-[10px] text-neutral-800 font-bold px-1.5 py-0.5 rounded transition shadow-xl z-20 whitespace-nowrap">
 Hour {t.hour}: {t.count} entries
 </span>
 <div
 style={{ height: `${htPercent}%` }}
 className="w-full bg-primary/60 group-hover:bg-primary rounded-t transition-all duration-300"
 />
 <span className="text-[10px] text-neutral-500 font-semibold mt-2 block">{t.hour}</span>
 </div>
 );
 })}
 </div>
 </div>

 {/* Average Visit Stats */}
 <div className="bg-white border border-neutral-200 p-5 rounded-xl space-y-4 flex flex-col justify-between">
 <div>
 <h3 className="text-xs font-extrabold text-neutral-600 uppercase tracking-wider mb-2">Member Retention Indicators</h3>
 <p className="text-xs text-neutral-600">Retention risk is assessed weekly based on attendance drops below 1 visit per 10 days.</p>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-neutral-50/50 p-3 rounded-lg border border-neutral-200">
 <span className="text-[9px] text-neutral-500 uppercase block font-bold">Avg Visit Length</span>
 <span className="text-xl font-extrabold text-primary mt-1 block">{analytics.averageVisitDuration} Mins</span>
 </div>
 <div className="bg-neutral-50/50 p-3 rounded-lg border border-neutral-200">
 <span className="text-[9px] text-neutral-500 uppercase block font-bold">Weekly Visit Rate</span>
 <span className="text-xl font-extrabold text-success mt-1 block">3.4x / Member</span>
 </div>
 </div>
 </div>
 </div>

 {/* ATTENDANCE HEATMAP SECTION */}
 <div className="bg-white border border-neutral-200 p-5 rounded-xl space-y-4">
 <div>
 <h3 className="text-xs font-extrabold text-neutral-600 uppercase tracking-wider">Attendance Traffic Density Heatmap (Day of Week vs Hour of Day)</h3>
 <p className="text-xs text-neutral-500 mt-1">Darker colors reflect high checkout and occupancy patterns.</p>
 </div>
 
 <div className="overflow-x-auto pt-2">
 <div className="min-w-[700px] space-y-1.5">
 {/* Hours Header Row */}
 <div className="flex gap-1 items-center">
 <div className="w-16 text-neutral-500 text-[10px] font-bold">Day</div>
 {Array.from({ length: 24 }).map((_, h) => (
 <div key={h} className="flex-1 text-center text-neutral-500 text-[9px] font-bold">{h}h</div>
 ))}
 </div>

 {/* Weekdays Rows */}
 {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, dIdx) => {
 const dayData = analytics.heatmap[dIdx] || new Array(24).fill(0);
 const maxCellVal = Math.max(...analytics.heatmap.flat(), 1);
 return (
 <div key={day} className="flex gap-1 items-center">
 <div className="w-16 text-neutral-600 text-[10px] font-bold">{day.substring(0, 3)}</div>
 {dayData.map((val, hIdx) => {
 const intensity = val / maxCellVal;
 // HSL color transition from low (slate-950) to high (rose-600)
 let bgStyle = 'rgba(15, 23, 42, 0.3)';
 if (intensity > 0) {
 bgStyle = `rgba(244, 63, 94, ${0.15 + intensity * 0.85})`;
 }
 return (
 <div 
 key={hIdx} 
 style={{ backgroundColor: bgStyle }}
 className="flex-1 h-6 rounded border border-neutral-100/40 relative group cursor-pointer hover:border-neutral-300 transition"
 >
 <span className="absolute scale-0 group-hover:scale-100 bg-neutral-50 border border-neutral-200 text-[9px] text-neutral-800 font-bold px-1.5 py-0.5 rounded shadow-xl -top-8 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap">
 {day}, {hIdx}:00 - {val} visits
 </span>
 </div>
 );
 })}
 </div>
 );
 })}
 </div>
 </div>
 </div>

 {/* BRANCH ATTENDANCE ANALYTICS & INSIGHTS */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Branch Attendance Grid */}
 <div className="bg-white border border-neutral-200 p-5 rounded-xl space-y-4">
 <h3 className="text-xs font-extrabold text-neutral-600 uppercase tracking-wider">Branch Performance Analytics</h3>
 <div className="space-y-3">
 {analytics.branchAnalytics.map((ba) => (
 <div key={ba.branchId} className="bg-neutral-50/40 border border-neutral-100 p-3.5 rounded-xl space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-neutral-800">{ba.branchName}</span>
 <span className="text-xs font-bold text-primary">{ba.attendanceCount} check-ins</span>
 </div>
 <div className="grid grid-cols-3 gap-2 text-[10px] text-neutral-500">
 <div>Avg Stay: <span className="font-bold text-neutral-700">{ba.averageDuration} mins</span></div>
 <div>Denied Entries: <span className="font-bold text-amber-700">{ba.deniedEntries}</span></div>
 <div>Live Utilization: <span className="font-bold text-success">{ba.occupancyRate}%</span></div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Trainer & Member Insights */}
 <div className="bg-white border border-neutral-200 p-5 rounded-xl space-y-4">
 <h3 className="text-xs font-extrabold text-neutral-600 uppercase tracking-wider">Trainer Retention & Engagement Metrics</h3>
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead>
 <tr className="border-b border-neutral-100 pb-2 text-neutral-500 font-bold uppercase text-[9px]">
 <th className="pb-2">Trainer</th>
 <th className="pb-2 text-center">Assigned Members</th>
 <th className="pb-2 text-center">Attendance Rate</th>
 <th className="pb-2 text-center">Engagement Score</th>
 <th className="pb-2 text-right">Retention Rating</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100/40">
 {analytics.trainerInsights.map((ti, idx) => (
 <tr key={idx} className="hover:bg-neutral-50/10">
 <td className="py-2.5 font-semibold text-neutral-800">{ti.trainer}</td>
 <td className="py-2.5 text-center text-neutral-700">{ti.assignedMembers}</td>
 <td className="py-2.5 text-center text-neutral-700 font-semibold">{ti.attendanceRate}%</td>
 <td className="py-2.5 text-center text-primary font-bold">{ti.memberEngagement}/100</td>
 <td className="py-2.5 text-right font-extrabold text-success">{ti.retentionPerformance}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* TAB 3: EXCEPTIONS CENTER */}
 {activeTab === 'exceptions' && (
 <div className="bg-white border border-neutral-200 p-5 rounded-xl space-y-4">
 <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
 <div>
 <h3 className="text-xs font-extrabold text-neutral-600 uppercase tracking-wider">Unresolved Exceptions Register</h3>
 <p className="text-xs text-neutral-500 mt-1">Manual action overrides for missed checkouts, double entry logs or branch violations.</p>
 </div>
 <span className="bg-danger-light text-danger px-3 py-1 rounded-xl border border-red-200 text-[10px] font-bold uppercase">
 {exceptions.length} Warnings Active
 </span>
 </div>

 <div className="space-y-3">
 {exceptions.length === 0 ? (
 <p className="p-8 text-center text-neutral-500 text-xs font-semibold">
 No exceptions detected. Branch attendance records are currently clean!
 </p>
 ) : (
 exceptions.map((exc) => (
 <div key={exc.id} className="bg-neutral-50/50 border border-neutral-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <span className={`w-2 h-2 rounded-full ${
 exc.severity === 'high' ? 'bg-danger' : exc.severity === 'medium' ? 'bg-warning' : 'bg-primary'
 }`} />
 <span className="text-xs font-bold text-neutral-800">{exc.exceptionType}</span>
 <span className="text-[10px] text-neutral-500 font-mono">#{exc.id.substring(0, 8)}</span>
 </div>
 <p className="text-xs text-neutral-600">
 Member: <span className="font-semibold text-neutral-700">{exc.memberName}</span> ({exc.memberId}) &bull; Branch: {exc.branchName}
 </p>
 <p className="text-[11px] text-neutral-500 italic">Reason: {exc.reason}</p>
 </div>

 <div className="flex items-center gap-2.5">
 {/* Read only block for dietitian */}
 {userRole !== 'dietitian' ? (
 <button
 onClick={() => {
 const mockRec: AttendanceRecord = {
 id: exc.id,
 memberName: exc.memberName,
 memberId: exc.memberId,
 phone: '',
 branchId: '',
 branchName: exc.branchName,
 checkInTime: exc.checkInTime,
 checkOutTime: undefined,
 durationText: 'N/A',
 elapsedMinutes: 0,
 method: 'Manual Overwrite',
 status: 'Corrected',
 };
 setSelectedRecord(mockRec);
 setCorrectionInTime('08:00');
 setCorrectionOutTime('09:30');
 setCorrectionReason('Resolving exception');
 setShowCorrectionModal(true);
 }}
 className="px-3.5 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-bold rounded-lg transition"
 >
 Correct Timestamp
 </button>
 ) : (
 <span className="text-[10px] text-neutral-500 font-bold uppercase italic">View Only (Dietitian)</span>
 )}
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 )}

 {/* DETAIL DRAWER MODAL */}
 {showDetailDrawer && selectedRecord && (
 <div className="fixed inset-0 z-[100] overflow-hidden flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
 <div className="w-full max-w-lg bg-background border-l border-neutral-200 h-full p-6 flex flex-col justify-between overflow-y-auto shadow-2xl relative animate-in slide-in-from-right duration-300">
 {/* Close Button */}
 <button
 onClick={() => setShowDetailDrawer(false)}
 className="absolute top-4 right-4 p-2 hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 rounded-lg transition"
 >
 <XCircle className="w-6 h-6" />
 </button>

 <div className="space-y-6">
 {/* Drawer Header */}
 <div>
 <span className="text-[9px] text-primary uppercase tracking-widest font-extrabold block">Attendance Registry File</span>
 <h2 className="text-lg font-bold text-neutral-900 mt-1">Audit Sheet Detailed View</h2>
 <p className="text-[10px] text-neutral-500 font-mono mt-0.5">ID: {selectedRecord.id}</p>
 </div>

 {/* Attendance Summary */}
 <div className="bg-white border border-neutral-200/70 p-4.5 rounded-xl space-y-3">
 <h3 className="text-xs font-extrabold text-neutral-600 uppercase tracking-wider border-b border-neutral-100/60 pb-1.5">Session Summary</h3>
 <div className="grid grid-cols-2 gap-y-2 text-xs">
 <div className="text-neutral-500">Status</div>
 <div className="font-bold text-neutral-800">{selectedRecord.status}</div>
 {selectedRecord.reason && (
 <>
 <div className="text-neutral-500">Reason</div>
 <div className={`font-semibold ${selectedRecord.status === 'Denied Entry' ? 'text-danger' : 'text-amber-700'}`}>{selectedRecord.reason}</div>
 </>
 )}
 <div className="text-neutral-500">Method</div>
 <div className="font-semibold text-neutral-700">{selectedRecord.method}</div>
 <div className="text-neutral-500">Duration</div>
 <div className="font-semibold text-neutral-700">{selectedRecord.durationText}</div>
 <div className="text-neutral-500">Recorded By</div>
 <div className="font-semibold text-neutral-700">{selectedRecord.recordedBy || 'Kiosk Terminal'}</div>
 <div className="text-neutral-500">Device Used</div>
 <div className="font-semibold text-neutral-700">{selectedRecord.deviceUsed || 'Main Entry Kiosk'}</div>
 </div>
 </div>

 {/* Member Card details */}
 <div className="bg-white border border-neutral-200/70 p-4.5 rounded-xl space-y-3.5">
 <h3 className="text-xs font-extrabold text-neutral-600 uppercase tracking-wider border-b border-neutral-100/60 pb-1.5">Member details</h3>
 <div className="flex items-center gap-3">
 <div className="w-11 h-11 rounded-full bg-primary-light border border-primary/20 flex items-center justify-center font-bold text-primary">
 {selectedRecord.memberName.charAt(0)}
 </div>
 <div>
 <span className="text-xs font-bold text-neutral-800 block">{selectedRecord.memberName}</span>
 <span className="text-[10px] text-neutral-500 block">ID: {selectedRecord.memberId}</span>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-y-2 text-xs pt-1.5 border-t border-neutral-100/40">
 <div className="text-neutral-500">Assigned Trainer</div>
 <div className="font-semibold text-neutral-700">{selectedRecord.trainerName || 'Trainer Frank'}</div>
 <div className="text-neutral-500">Assigned Dietitian</div>
 <div className="font-semibold text-neutral-700">Dietitian Sarah</div>
 <div className="text-neutral-500">Membership plan</div>
 <div className="font-semibold text-neutral-700">{selectedRecord.planName || 'Premium Annual Pass'}</div>
 </div>
 </div>

 {/* Visit Timeline chronological */}
 <div className="bg-white border border-neutral-200/70 p-4.5 rounded-xl space-y-3">
 <h3 className="text-xs font-extrabold text-neutral-600 uppercase tracking-wider border-b border-neutral-100/60 pb-1.5">Chronology Timeline</h3>
 <div className="space-y-4 pt-1">
 <div className="flex items-start gap-3">
 <div className="p-1 bg-primary-light rounded-full border border-primary/20 text-primary mt-0.5">
 <Clock className="w-3.5 h-3.5" />
 </div>
 <div>
 <span className="text-xs font-bold text-neutral-700 block">Check-In Event Logs</span>
 <span className="text-[10px] text-neutral-500">Checked in at {new Date(selectedRecord.checkInTime).toLocaleString()} &bull; Method: {selectedRecord.method}</span>
 </div>
 </div>

 <div className="flex items-start gap-3">
 <div className="p-1 bg-success-light rounded-full border border-green-200 text-success mt-0.5">
 <Clock className="w-3.5 h-3.5" />
 </div>
 <div>
 <span className="text-xs font-bold text-neutral-700 block">Check-Out Event Logs</span>
 {selectedRecord.checkOutTime ? (
 <span className="text-[10px] text-neutral-500">Checked out at {new Date(selectedRecord.checkOutTime).toLocaleString()} &bull; Stay duration: {selectedRecord.durationText}</span>
 ) : selectedRecord.status === 'Denied Entry' ? (
 <span className="text-[10px] text-danger font-semibold italic">Entry was denied - member never checked in.</span>
 ) : (
 <span className="text-[10px] text-success font-semibold italic">Member is currently active inside the gym branch.</span>
 )}
 </div>
 </div>

 {selectedRecord.reason && (
 <div className="flex items-start gap-3 border-t border-neutral-100/60 pt-3">
 <div className="p-1 bg-warning-light rounded-full border border-amber-200 text-amber-700 mt-0.5">
 <AlertTriangle className="w-3.5 h-3.5" />
 </div>
 <div>
 <span className="text-xs font-bold text-neutral-700 block">
 {selectedRecord.status === 'Denied Entry' ? 'Reason for Denial' : 'Staff Correction / Validation Note'}
 </span>
 <span className="text-[10px] text-neutral-500 block">"{selectedRecord.reason}"</span>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>

 <div className="flex gap-2 border-t border-neutral-100/60 pt-4 mt-6">
 {/* Read only block for dietitian */}
 {userRole !== 'dietitian' ? (
 <button
 onClick={() => {
 if (selectedRecord.checkInTime) {
 const inD = new Date(selectedRecord.checkInTime);
 setCorrectionInTime(`${inD.getHours().toString().padStart(2, '0')}:${inD.getMinutes().toString().padStart(2, '0')}`);
 }
 if (selectedRecord.checkOutTime) {
 const outD = new Date(selectedRecord.checkOutTime);
 setCorrectionOutTime(`${outD.getHours().toString().padStart(2, '0')}:${outD.getMinutes().toString().padStart(2, '0')}`);
 } else {
 setCorrectionOutTime('18:00');
 }
 setCorrectionReason(selectedRecord.reason || 'Manual log adjustment');
 setShowCorrectionModal(true);
 }}
 className="flex-1 py-2.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-800 hover:text-neutral-900 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
 >
 <Edit className="w-4 h-4 text-primary" />
 <span>Correct Times</span>
 </button>
 ) : (
 <span className="flex-1 text-center py-2.5 text-neutral-500 text-[11px] italic font-bold">Read-Only Mode</span>
 )}
 <button
 onClick={() => setShowDetailDrawer(false)}
 className="flex-1 py-2.5 bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-900 text-xs font-bold rounded-xl transition"
 >
 Close Drawer
 </button>
 </div>
 </div>
 </div>
 )}

 {/* SINGLE RECORD CORRECTION MODAL */}
 {showCorrectionModal && selectedRecord && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
 <div className="bg-white border border-neutral-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
 <button
 onClick={() => setShowCorrectionModal(false)}
 className="absolute top-4 right-4 p-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition"
 >
 <XCircle className="w-5 h-5" />
 </button>

 <div>
 <span className="text-[10px] text-primary font-extrabold uppercase block tracking-wider">Adjustment Panel</span>
 <h3 className="text-base font-bold text-neutral-800">Correct Attendance Timestamp</h3>
 <p className="text-neutral-600 text-xs mt-0.5">Member: {selectedRecord.memberName}</p>
 </div>

 <div className="space-y-3 pt-2">
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Check-In (HH:MM)</label>
 <input
 type="text"
 value={correctionInTime}
 onChange={(e) => setCorrectionInTime(e.target.value)}
 placeholder="08:00"
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-700 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light"
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Check-Out (HH:MM)</label>
 <input
 type="text"
 value={correctionOutTime}
 onChange={(e) => setCorrectionOutTime(e.target.value)}
 placeholder="09:30"
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-600 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Reason for correction</label>
 <textarea
 value={correctionReason}
 onChange={(e) => setCorrectionReason(e.target.value)}
 placeholder="E.g. scanner malfunction, receptionist manual override request"
 rows={3}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-600 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light resize-none"
 />
 </div>
 </div>

 <div className="flex gap-2 pt-2">
 <button
 onClick={() => handleSingleCorrection()}
 className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-neutral-900 text-xs font-bold rounded-xl transition shadow-lg"
 >
 Apply Adjustment
 </button>
 <button
 onClick={() => setShowCorrectionModal(false)}
 className="flex-1 py-2.5 bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-900 text-xs font-bold rounded-xl transition"
 >
 Cancel
 </button>
 </div>
 </div>
 </div>
 )}

 {/* BULK RECORDS CORRECTION MODAL */}
 {showBulkCorrectionModal && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
 <div className="bg-white border border-neutral-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
 <button
 onClick={() => setShowBulkCorrectionModal(false)}
 className="absolute top-4 right-4 p-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition"
 >
 <XCircle className="w-5 h-5" />
 </button>

 <div>
 <span className="text-[10px] text-primary font-extrabold uppercase block tracking-wider">Batch Adjustment Panel</span>
 <h3 className="text-base font-bold text-neutral-800">Adjust {selectedIds.length} Records</h3>
 <p className="text-neutral-600 text-xs mt-0.5">This will update all selected records to the specified timestamps.</p>
 </div>

 <div className="space-y-3 pt-2">
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Check-In (HH:MM)</label>
 <input
 type="text"
 value={correctionInTime}
 onChange={(e) => setCorrectionInTime(e.target.value)}
 placeholder="08:00"
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-600 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light"
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Check-Out (HH:MM)</label>
 <input
 type="text"
 value={correctionOutTime}
 onChange={(e) => setCorrectionOutTime(e.target.value)}
 placeholder="09:30"
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-600 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Reason for correction</label>
 <textarea
 value={correctionReason}
 onChange={(e) => setCorrectionReason(e.target.value)}
 placeholder="E.g. scanner malfunction, receptionist manual override request"
 rows={3}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-600 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light resize-none"
 />
 </div>
 </div>

 <div className="flex gap-2 pt-2">
 <button
 onClick={() => handleBulkCorrection()}
 className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-neutral-900 text-xs font-bold rounded-xl transition shadow-lg"
 >
 Apply Adjustments
 </button>
 <button
 onClick={() => setShowBulkCorrectionModal(false)}
 className="flex-1 py-2.5 bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-900 text-xs font-bold rounded-xl transition"
 >
 Cancel
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}

export default function AttendanceRecordsPage() {
 return (
 <Suspense fallback={
 <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
 <RefreshCw className="w-8 h-8 text-primary animate-spin" />
 <p className="text-neutral-600 text-sm font-medium">Initializing Attendance Records...</p>
 </div>
 }>
 <AttendanceRecordsContent />
 </Suspense>
 );
}
