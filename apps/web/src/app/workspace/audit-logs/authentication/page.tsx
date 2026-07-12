'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../../lib/api/client';
import { handleApiError } from '../../../../lib/api/client';
import { orgApi } from '../../../../lib/api';
import { Tabs } from '../../../../components/ui';
import {
 History,
 ShieldCheck,
 ShieldAlert,
 Search,
 Calendar,
 Laptop,
 Terminal,
 Activity,
 Cpu,
 Clock,
 MapPin,
 FileDown,
 RefreshCw,
 X,
 User,
 UserPlus,
 ExternalLink,
 Ban,
 Fingerprint,
 Info,
 Maximize2,
 DoorOpen
} from 'lucide-react';

interface AuditLogItem {
 id: string;
 organizationId: string | null;
 userId: string | null;
 action: string;
 user: string;
 details: string;
 eventType: string | null;
 eventCategory: string | null;
 entityType: string | null;
 entityId: string | null;
 metadata: any;
 ipAddress: string | null;
 userAgent: string | null;
 createdAt: string;
}

interface DashboardStats {
 successfulLogins: number;
 failedLogins: number;
 activeSessions: number;
 suspiciousActivities: number;
 organizationSwitches: number;
 permissionDenials: number;
 todayLogins: number;
 totalEventsToday: number;
 membersAdded: number;
 checkInsToday: number;
}

interface ActiveSessionItem {
 id: string;
 user: string;
 userId: string;
 device: string;
 browser: string;
 ipAddress: string;
 createdAt: string;
 lastActivity: string;
 status: 'Active' | 'Revoked';
}

export default function AuthenticationLogsPage() {
 const [activeTab, setActiveTab] = useState<'logs' | 'sessions' | 'security'>('logs');
 const [loading, setLoading] = useState(true);
 const [stats, setStats] = useState<DashboardStats>({
 successfulLogins: 0,
 failedLogins: 0,
 activeSessions: 0,
 suspiciousActivities: 0,
 organizationSwitches: 0,
 permissionDenials: 0,
 todayLogins: 0,
 totalEventsToday: 0,
 membersAdded: 0,
 checkInsToday: 0
 });
 const [logs, setLogs] = useState<AuditLogItem[]>([]);
 const [sessions, setSessions] = useState<ActiveSessionItem[]>([]);
 const [securityWarnings, setSecurityWarnings] = useState<AuditLogItem[]>([]);
 const [securityWarningsLoading, setSecurityWarningsLoading] = useState(false);
 const [warningsPage, setWarningsPage] = useState(1);
 const [warningsTotalPages, setWarningsTotalPages] = useState(1);
 const [warningsTotal, setWarningsTotal] = useState(0);
 const [warningsPageSize] = useState(15);
 const [retentionDays, setRetentionDays] = useState<number | null>(null);

 // Filtering states
 const [searchQuery, setSearchQuery] = useState('');
 const [categoryFilter, setCategoryFilter] = useState('all');
 const [typeFilter, setTypeFilter] = useState('all');
 const [statusFilter, setStatusFilter] = useState('all');
 const [deviceFilter, setDeviceFilter] = useState('all');
 const [startDate, setStartDate] = useState('');
 const [endDate, setEndDate] = useState('');

 // Pagination states
 const [currentPage, setCurrentPage] = useState(1);
 const [totalPages, setTotalPages] = useState(1);
 const [totalLogs, setTotalLogs] = useState(0);
 const [pageSize] = useState(15);

 // Selected details drawer
 const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
 const [drawerOpen, setDrawerOpen] = useState(false);
 const [userTimeline, setUserTimeline] = useState<AuditLogItem[]>([]);
 const [timelineLoading, setTimelineLoading] = useState(false);

 // Toast feedback
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 const showToast = (message: string, type: 'success' | 'error') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 const loadData = useCallback(async () => {
 setLoading(true);
 const orgId = localStorage.getItem('organizationId');
 if (!orgId) return;

 try {
 // Fetch stats
 const statsRes = await apiClient.get('/v1/organizations/audit-logs/stats');
 setStats(statsRes.data);

 // Fetch logs
 const logsRes = await apiClient.get('/v1/organizations/audit-logs', {
 params: {
 page: currentPage,
 limit: pageSize,
 searchQuery: searchQuery || undefined,
 eventCategory: categoryFilter !== 'all' ? categoryFilter : undefined,
 eventType: typeFilter !== 'all' ? typeFilter : undefined,
 status: statusFilter !== 'all' ? statusFilter : undefined,
 device: deviceFilter !== 'all' ? deviceFilter : undefined,
 startDate: startDate || undefined,
 endDate: endDate || undefined,
 }
 });
 setLogs(logsRes.data.data || []);
 setTotalPages(logsRes.data.totalPages || 1);
 setTotalLogs(logsRes.data.total || 0);

 // Fetch sessions
 const sessionsRes = await apiClient.get('/v1/organizations/audit-logs/sessions');
 setSessions(sessionsRes.data);

 } catch (err: any) {
 showToast(handleApiError(err) || 'Failed to fetch audit records.', 'error');
 } finally {
 setLoading(false);
 }
 }, [currentPage, pageSize, searchQuery, categoryFilter, typeFilter, statusFilter, deviceFilter, startDate, endDate]);

 // Reset page to 1 when filters change
 useEffect(() => {
 setCurrentPage(1);
 }, [searchQuery, categoryFilter, typeFilter, statusFilter, deviceFilter, startDate, endDate]);

 useEffect(() => {
 loadData();
 }, [loadData]);

 // The retention period shown in the footer is a real, admin-configurable
 // per-organization setting (Organization > Settings > Security), not a
 // fixed platform constant - it defaults to 90 days but can be changed.
 useEffect(() => {
 const orgId = localStorage.getItem('organizationId');
 if (!orgId) return;
 orgApi
 .list()
 .then((orgs: any[]) => {
 const org = orgs.find((o) => o.id === orgId);
 const days = org?.settings?.security?.auditRetentionDays;
 setRetentionDays(typeof days === 'number' ? days : 90);
 })
 .catch(() => setRetentionDays(90));
 }, []);

 // Security Warnings has its own backend query (matching everything the
 // stats/badge counts flag as a security event) instead of filtering
 // whatever page of the generic logs list happens to be loaded - otherwise
 // the tab can show "No Security Warnings" while the KPI/badge count is
 // nonzero, since a flagged event might simply not be on the current page.
 useEffect(() => {
 if (activeTab !== 'security') return;
 setSecurityWarningsLoading(true);
 apiClient
 .get('/v1/organizations/audit-logs/security-warnings', { params: { page: warningsPage, limit: warningsPageSize } })
 .then((res) => {
 setSecurityWarnings(res.data?.data || []);
 setWarningsTotalPages(res.data?.totalPages || 1);
 setWarningsTotal(res.data?.total || 0);
 })
 .catch(() => setSecurityWarnings([]))
 .finally(() => setSecurityWarningsLoading(false));
 }, [activeTab, warningsPage, warningsPageSize]);

 // Load chronological timeline of user actions
 const loadUserTimeline = async (username: string) => {
 setTimelineLoading(true);
 try {
 const logsRes = await apiClient.get('/v1/organizations/audit-logs', {
 params: { searchQuery: username }
 });
 // Filter logs only belonging exactly to this user
 const logsData = logsRes.data?.data || [];
 const filtered = logsData.filter((l: AuditLogItem) => l.user === username);
 setUserTimeline(filtered.slice(0, 10)); // Limit to latest 10
 } catch (err) {
 console.error(err);
 } finally {
 setTimelineLoading(false);
 }
 };

 const handleOpenDetails = (log: AuditLogItem) => {
 setSelectedLog(log);
 setDrawerOpen(true);
 loadUserTimeline(log.user);
 };

 const handleRevokeSession = async (sessionId: string) => {
 try {
 await apiClient.post(`/v1/organizations/audit-logs/sessions/${sessionId}/revoke`);
 showToast('Session has been successfully terminated.', 'success');
 loadData();
 } catch (err: any) {
 showToast(handleApiError(err) || 'Failed to revoke session.', 'error');
 }
 };

 const handleExportCSV = async () => {
 setLoading(true);
 try {
 const logsRes = await apiClient.get('/v1/organizations/audit-logs', {
 params: {
 limit: 10000,
 searchQuery: searchQuery || undefined,
 eventCategory: categoryFilter !== 'all' ? categoryFilter : undefined,
 eventType: typeFilter !== 'all' ? typeFilter : undefined,
 status: statusFilter !== 'all' ? statusFilter : undefined,
 device: deviceFilter !== 'all' ? deviceFilter : undefined,
 startDate: startDate || undefined,
 endDate: endDate || undefined,
 }
 });
 const exportLogs = logsRes.data.data || [];
 if (exportLogs.length === 0) {
 showToast('No logs available to export.', 'error');
 return;
 }

 const headers = ['Timestamp', 'User', 'Category', 'Event Type', 'Details', 'Status', 'IP Address', 'Device', 'Browser'];
 const rows = exportLogs.map((l: AuditLogItem) => {
 const meta = l.metadata || {};
 const status = l.action.toLowerCase().includes('failed') || l.eventType?.includes('FAILED') || l.eventType?.includes('DENIED') ? 'Failed' : 'Success';
 return [
 new Date(l.createdAt).toISOString(),
 l.user,
 l.eventCategory || 'General',
 l.eventType || l.action,
 l.details.replace(/"/g, '""'),
 status,
 l.ipAddress || 'Unknown',
 meta.device || 'Desktop',
 meta.browser || 'Chrome'
 ];
 });

 const csvContent = 'data:text/csv;charset=utf-8,'
 + [headers.join(','), ...rows.map((e: string[]) => e.map((val: string) => `"${val}"`).join(','))].join('\n');

 const encodedUri = encodeURI(csvContent);
 const link = document.createElement('a');
 link.setAttribute('href', encodedUri);
 link.setAttribute('download', `gymflow_workspace_activity_${new Date().toISOString().split('T')[0]}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 showToast('Logs exported to CSV successfully.', 'success');
 } catch (err: any) {
 showToast('Failed to export logs.', 'error');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="relative min-h-full">
 {/* Toast Notification */}
 {toast && (
 <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs font-bold shadow-2xl animate-fade-in ${toast.type === 'success'
 ? 'bg-success-light border-green-200 text-success'
 : 'bg-danger-light border-red-200 text-danger'
 }`}>
 <ShieldAlert size={14} />
 <span>{toast.message}</span>
 </div>
 )}

 {/* PAGE HEADER */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
 <div>
 <h1 className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2.5">
 <Activity className="text-primary" />
 <span>Workspace Activity Log</span>
 </h1>
 <p className="text-xs text-neutral-600 mt-1">
 Every action taken inside your workspace — members added, check-ins, membership changes and configuration edits — plus who is currently signed in.
 </p>
 </div>

 <div className="flex items-center gap-2.5">
 <button
 onClick={loadData}
 className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 hover:border-neutral-200 text-neutral-600 hover:text-neutral-900 cursor-pointer transition-all"
 title="Refresh Logs"
 >
 <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
 </button>
 <button
 onClick={handleExportCSV}
 className="px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-100 hover:border-neutral-200 hover:text-neutral-900 text-xs font-bold text-neutral-700 flex items-center gap-1.5 transition-all cursor-pointer"
 >
 <FileDown size={13} />
 <span>Export CSV</span>
 </button>
 </div>
 </div>

 {/* DASHBOARD STATS WIDGETS */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
 {[
 { label: 'Activity Today', val: stats.totalEventsToday, desc: 'Actions logged in the workspace today', icon: Activity, color: 'bg-primary-light border-primary/20 text-primary' },
 { label: 'Members Added', val: stats.membersAdded, desc: 'Members enrolled to date', icon: UserPlus, color: 'bg-primary-light border-green-200 text-success' },
 { label: 'Check-Ins Today', val: stats.checkInsToday, desc: 'Gym entries recorded today', icon: DoorOpen, color: 'bg-primary-light border-blue-200 text-blue-600' },
 { label: 'Signed In Now', val: stats.activeSessions, desc: 'Staff currently in the workspace', icon: Laptop, color: 'bg-primary-light border-indigo-200 text-indigo-600' }
 ].map((card, idx) => (
 <div key={idx} className={`p-4 bg-neutral-50/30 border rounded-2xl bg-gradient-to-br transition-all hover:-translate-y-0.5 ${card.color}`}>
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-600">{card.label}</span>
 <card.icon size={15} />
 </div>
 <div className="text-2xl font-black text-neutral-900 mt-2">{card.val}</div>
 <span className="text-[9px] text-neutral-500 mt-1 block">{card.desc}</span>
 </div>
 ))}
 </div>

 {/* TAB SELECTOR HEADER */}
 <Tabs
 className="mb-6"
 scrollable={false}
 tabs={[
 { id: 'logs', label: 'Activity Feed', badge: logs.length },
 { id: 'sessions', label: 'Who\'s In', badge: sessions.filter(s => s.status === 'Active').length },
 { id: 'security', label: 'Security Warnings', badge: stats.suspiciousActivities }
 ]}
 activeId={activeTab}
 onChange={(id) => setActiveTab(id as any)}
 />

 {/* SEARCH AND ADVANCED FILTERS PANEL */}
 {activeTab === 'logs' && (
 <div className="bg-white border border-neutral-100 rounded-3xl p-5 mb-8 space-y-4">
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
 {/* Search Input */}
 <div className="relative flex-1 max-w-md">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={13} />
 <input
 type="text"
 placeholder="Search by staff member, member name, action or description..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-xl pl-9.5 pr-4 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none"
 />
 </div>

 {/* Date Filters */}
 <div className="flex items-center gap-2">
 <Calendar size={12} className="text-neutral-500" />
 <input
 type="date"
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 className="bg-neutral-50 border border-neutral-100 rounded-lg text-[10px] px-2 py-1 text-neutral-600 focus:outline-none"
 title="Start Date"
 />
 <span className="text-neutral-400 text-xs">-</span>
 <input
 type="date"
 value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 className="bg-neutral-50 border border-neutral-100 rounded-lg text-[10px] px-2 py-1 text-neutral-600 focus:outline-none"
 title="End Date"
 />
 </div>
 </div>

 {/* Filtering Dropdowns */}
 <div className="flex flex-wrap items-center gap-4 text-xs">
 <div className="flex items-center gap-1.5">
 <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Category:</span>
 <select
 value={categoryFilter}
 onChange={(e) => setCategoryFilter(e.target.value)}
 className="bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-lg px-2.5 py-1 text-neutral-700 focus:outline-none"
 >
 <option value="all">All Categories</option>
 <optgroup label="Workspace Activity">
 <option value="Member">Members</option>
 <option value="Attendance">Attendance</option>
 <option value="Membership">Memberships</option>
 <option value="Configuration">Configuration</option>
 <option value="Status">Status Changes</option>
 <option value="Staff">Staff</option>
 <option value="Media">Media</option>
 </optgroup>
 <optgroup label="Access & Security">
 <option value="Authentication">Authentication</option>
 <option value="Authorization">Authorization</option>
 <option value="Session">Session</option>
 <option value="Security">Security</option>
 </optgroup>
 </select>
 </div>

 <div className="flex items-center gap-1.5">
 <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Event:</span>
 <select
 value={typeFilter}
 onChange={(e) => setTypeFilter(e.target.value)}
 className="bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-lg px-2.5 py-1 text-neutral-700 focus:outline-none"
 >
 <option value="all">All Event Types</option>
 <optgroup label="Members">
 <option value="MEMBER_CREATED">Member Added</option>
 <option value="MEMBER_UPDATED">Member Updated</option>
 </optgroup>
 <optgroup label="Attendance">
 <option value="ATTENDANCE_CHECK_IN">Check-In</option>
 <option value="ATTENDANCE_CHECK_OUT">Check-Out</option>
 <option value="ATTENDANCE_CHECK_IN_DENIED">Check-In Denied</option>
 <option value="ATTENDANCE_CORRECTED">Attendance Corrected</option>
 <option value="ATTENDANCE_OVERRIDE_APPROVED">Override Approved</option>
 </optgroup>
 <optgroup label="Memberships">
 <option value="MEMBERSHIP_PURCHASED">Membership Purchased</option>
 <option value="MEMBERSHIP_CANCELLED">Membership Cancelled</option>
 <option value="MEMBERSHIP_FREEZE_REQUESTED">Freeze Requested</option>
 <option value="MEMBERSHIP_FREEZE_APPROVED">Freeze Approved</option>
 <option value="MEMBERSHIP_PLAN_CREATED">Plan Created</option>
 <option value="MEMBERSHIP_PLAN_UPDATED">Plan Updated</option>
 </optgroup>
 <optgroup label="Access & Security">
 <option value="LOGIN_SUCCESS">Login Success</option>
 <option value="LOGIN_FAILED">Login Failed</option>
 <option value="ROLE_CHANGED">Role Changed</option>
 <option value="PERMISSION_DENIED">Permission Denied</option>
 <option value="SESSION_REVOKED">Session Revoked</option>
 </optgroup>
 </select>
 </div>

 <div className="flex items-center gap-1.5">
 <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Status:</span>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-lg px-2.5 py-1 text-neutral-700 focus:outline-none"
 >
 <option value="all">All Statuses</option>
 <option value="success">Success</option>
 <option value="failed">Failed / Flagged</option>
 </select>
 </div>

 <div className="flex items-center gap-1.5">
 <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Device:</span>
 <select
 value={deviceFilter}
 onChange={(e) => setDeviceFilter(e.target.value)}
 className="bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-lg px-2.5 py-1 text-neutral-700 focus:outline-none"
 >
 <option value="all">All Devices</option>
 <option value="Desktop">Desktop</option>
 <option value="Mobile">Mobile</option>
 <option value="Tablet">Tablet</option>
 </select>
 </div>

 {(categoryFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all' || deviceFilter !== 'all' || searchQuery !== '' || startDate !== '' || endDate !== '') && (
 <button
 onClick={() => {
 setCategoryFilter('all');
 setTypeFilter('all');
 setStatusFilter('all');
 setDeviceFilter('all');
 setSearchQuery('');
 setStartDate('');
 setEndDate('');
 }}
 className="text-[10px] font-bold text-primary hover:text-primary hover:underline flex items-center gap-1 ml-auto cursor-pointer"
 >
 Reset Filters
 </button>
 )}
 </div>
 </div>
 )}

 {/* CORE VIEW RENDERING */}
 {loading ? (
 <div className="space-y-4">
 <div className="h-12 bg-neutral-50/40 rounded-2xl animate-pulse" />
 <div className="h-32 bg-neutral-50/40 rounded-2xl animate-pulse" />
 </div>
 ) : activeTab === 'logs' ? (
 /* TAB 1: AUDIT LOGS LIST */
 logs.length === 0 ? (
 <div className="bg-white border border-neutral-100 rounded-3xl p-12 text-center flex flex-col items-center">
 <Activity className="text-neutral-500 mb-4" size={24} />
 <h3 className="text-sm font-bold text-neutral-900">No Activity Found</h3>
 <p className="text-xs text-neutral-600 mt-1">
 No workspace actions match these filters yet. Try a wider date range or reset the filters.
 </p>
 </div>
 ) : (
 <>
 <div className="overflow-x-auto bg-white border border-neutral-100 rounded-3xl shadow-xl max-h-[calc(100vh-350px)] overflow-y-auto scrollbar-thin">
 <table className="w-full text-left border-collapse min-w-[900px]">
 <thead className="sticky top-0 bg-white z-10">
 <tr className="border-b border-neutral-100 text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 bg-neutral-50/40">
 <th className="py-4 px-6">Timestamp</th>
 <th className="py-4 px-4">User</th>
 <th className="py-4 px-4">Category</th>
 <th className="py-4 px-4">Activity</th>
 <th className="py-4 px-4">Status</th>
 <th className="py-4 pr-6 text-right">Details</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100/40 text-xs text-neutral-700">
 {logs.map((log) => {
 const isFail = log.action.toLowerCase().includes('failed') || log.eventType?.includes('FAILED') || log.eventType?.includes('DENIED');
 const statusColor = isFail
 ? 'bg-danger-light text-danger border-red-200'
 : 'bg-success-light text-success border-green-200';

 const categoryColors: Record<string, string> = {
 Member: 'bg-success-light text-success border-green-200',
 Attendance: 'bg-blue-500/10 text-blue-600 border-blue-200',
 Membership: 'bg-purple-500/10 text-purple-600 border-purple-200',
 Configuration: 'bg-neutral-100 text-neutral-600 border-neutral-200',
 Status: 'bg-orange-500/10 text-orange-600 border-orange-200',
 Staff: 'bg-teal-500/10 text-teal-600 border-teal-200',
 Media: 'bg-pink-500/10 text-pink-600 border-pink-200',
 Authentication: 'bg-primary-light text-primary border-primary/20',
 Authorization: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
 Session: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
 Security: 'bg-warning-light text-amber-700 border-amber-200',
 };
 const catStyle = categoryColors[log.eventCategory || ''] || 'bg-neutral-50 text-neutral-600 border-neutral-200';

 return (
 <tr key={log.id} className="hover:bg-neutral-50/20 group transition-colors">
 <td className="py-4 px-6 font-mono text-[10px] text-neutral-500">
 {new Date(log.createdAt).toLocaleString()}
 </td>
 <td className="py-4 px-4">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-[9px] text-primary font-bold shrink-0">
 {log.user.substring(0, 2).toUpperCase()}
 </div>
 <span className="font-bold text-neutral-800">{log.user}</span>
 </div>
 </td>
 <td className="py-4 px-4">
 <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${catStyle}`}>
 {log.eventCategory || 'General'}
 </span>
 </td>
 <td className="py-4 px-4 max-w-xs">
 <span className="font-extrabold text-neutral-800 block">{log.action}</span>
 <span className="text-[10px] text-neutral-500 block mt-0.5 truncate">{log.details}</span>
 </td>
 <td className="py-4 px-4">
 <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black ${statusColor}`}>
 {isFail ? 'Failed' : 'Success'}
 </span>
 </td>
 <td className="py-4 pr-6 text-right">
 <button
 onClick={() => handleOpenDetails(log)}
 className="p-1.5 rounded bg-neutral-50 hover:bg-neutral-50 border border-neutral-100 text-neutral-600 hover:text-neutral-900 cursor-pointer transition-colors"
 title="View Details"
 >
 <Maximize2 size={12} />
 </button>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>

 {/* Pagination Controls */}
 {totalPages > 1 && (
 <div className="flex flex-col sm:flex-row items-center justify-between mt-5 bg-white border border-neutral-100 rounded-3xl p-4 gap-4">
 <span className="text-[11px] text-neutral-500 font-bold select-none">
 Showing <b className="text-neutral-700">{Math.min(totalLogs, (currentPage - 1) * pageSize + 1)}</b> to{' '}
 <b className="text-neutral-700">{Math.min(totalLogs, currentPage * pageSize)}</b> of{' '}
 <b className="text-neutral-700">{totalLogs}</b> entries
 </span>

 <div className="flex items-center gap-1.5">
 <button
 disabled={currentPage === 1}
 onClick={() => setCurrentPage(1)}
 className="px-2.5 py-1.5 rounded-xl bg-neutral-50 border border-neutral-100 hover:border-neutral-200 text-[10px] font-bold text-neutral-600 hover:text-neutral-900 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
 >
 First
 </button>
 <button
 disabled={currentPage === 1}
 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
 className="px-2.5 py-1.5 rounded-xl bg-neutral-50 border border-neutral-100 hover:border-neutral-200 text-[10px] font-bold text-neutral-600 hover:text-neutral-900 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
 >
 Prev
 </button>

 <span className="text-[10px] font-bold text-neutral-600 px-3 py-1 bg-white border border-neutral-100/60 rounded-lg select-none">
 Page <b className="text-primary">{currentPage}</b> of {totalPages}
 </span>

 <button
 disabled={currentPage === totalPages}
 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
 className="px-2.5 py-1.5 rounded-xl bg-neutral-50 border border-neutral-100 hover:border-neutral-200 text-[10px] font-bold text-neutral-600 hover:text-neutral-900 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
 >
 Next
 </button>
 <button
 disabled={currentPage === totalPages}
 onClick={() => setCurrentPage(totalPages)}
 className="px-2.5 py-1.5 rounded-xl bg-neutral-50 border border-neutral-100 hover:border-neutral-200 text-[10px] font-bold text-neutral-600 hover:text-neutral-900 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
 >
 Last
 </button>
 </div>
 </div>
 )}
 </>
 )
 ) : activeTab === 'sessions' ? (
 /* TAB 2: ACTIVE SESSIONS VIEW */
 sessions.length === 0 ? (
 <div className="bg-white border border-neutral-100 rounded-3xl p-12 text-center flex flex-col items-center">
 <Laptop className="text-neutral-500 mb-4" size={24} />
 <h3 className="text-sm font-bold text-neutral-900">Nobody Signed In</h3>
 <p className="text-xs text-neutral-600 mt-1">No staff members are currently signed in to this workspace.</p>
 </div>
 ) : (
 <div className="overflow-x-auto bg-white border border-neutral-100 rounded-3xl shadow-xl">
 <table className="w-full text-left border-collapse min-w-[900px]">
 <thead>
 <tr className="border-b border-neutral-100 text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 bg-neutral-50/40">
 <th className="py-4 px-6">User</th>
 <th className="py-4 px-4">Device</th>
 <th className="py-4 px-4">Browser</th>
 <th className="py-4 px-4">IP Address</th>
 <th className="py-4 px-4">Logged In At</th>
 <th className="py-4 px-4">Status</th>
 <th className="py-4 pr-6 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100/40 text-xs text-neutral-700">
 {sessions.map((session) => (
 <tr key={session.id} className="hover:bg-neutral-50/20 transition-colors">
 <td className="py-4 px-6">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-[9px] text-primary font-bold shrink-0">
 {session.user.substring(0, 2).toUpperCase()}
 </div>
 <span className="font-bold text-neutral-800">{session.user}</span>
 </div>
 </td>
 <td className="py-4 px-4 font-bold text-neutral-700">{session.device}</td>
 <td className="py-4 px-4 text-neutral-600">{session.browser}</td>
 <td className="py-4 px-4 font-mono text-[10px] text-neutral-600">{session.ipAddress}</td>
 <td className="py-4 px-4 text-neutral-500">{new Date(session.createdAt).toLocaleString()}</td>
 <td className="py-4 px-4">
 <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black ${session.status === 'Active' ? 'bg-success-light text-success border-green-200 animate-pulse' : 'bg-danger-light text-danger border-red-200'
 }`}>
 {session.status}
 </span>
 </td>
 <td className="py-4 pr-6 text-right">
 {session.status === 'Active' && (
 <button
 onClick={() => handleRevokeSession(session.id)}
 className="px-2.5 py-1 rounded-lg bg-danger-light hover:bg-red-600 text-danger hover:text-white border border-red-200 text-[10px] font-bold transition-all cursor-pointer"
 >
 Revoke Session
 </button>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )
 ) : (
 /* TAB 3: SECURITY WARNINGS */
 securityWarningsLoading ? (
 <div className="space-y-4">
 <div className="h-24 bg-neutral-50/40 rounded-2xl animate-pulse" />
 <div className="h-24 bg-neutral-50/40 rounded-2xl animate-pulse" />
 </div>
 ) : securityWarnings.length === 0 ? (
 <div className="bg-white border border-neutral-100 rounded-3xl p-12 text-center flex flex-col items-center">
 <ShieldCheck className="text-success mb-4" size={24} />
 <h3 className="text-sm font-bold text-neutral-900">No Security Warnings</h3>
 <p className="text-xs text-neutral-600 mt-1">Your organization workspace configuration is compliant. No anomalies flagged.</p>
 </div>
 ) : (
 <>
 <div className="overflow-x-auto bg-white border border-neutral-100 rounded-3xl shadow-xl max-h-[calc(100vh-350px)] overflow-y-auto scrollbar-thin">
 <table className="w-full text-left border-collapse min-w-[900px]">
 <thead className="sticky top-0 bg-white z-10">
 <tr className="border-b border-neutral-100 text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 bg-neutral-50/40">
 <th className="py-4 px-6">Timestamp</th>
 <th className="py-4 px-4">User</th>
 <th className="py-4 px-4">Event</th>
 <th className="py-4 px-4">Details</th>
 <th className="py-4 px-4">IP Address</th>
 <th className="py-4 pr-6 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100/40 text-xs text-neutral-700">
 {securityWarnings.map((alert) => (
 <tr key={alert.id} className="hover:bg-danger-light/40 group transition-colors">
 <td className="py-4 px-6 font-mono text-[10px] text-neutral-500">
 {new Date(alert.createdAt).toLocaleString()}
 </td>
 <td className="py-4 px-4">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-full bg-danger-light border border-red-200 flex items-center justify-center text-danger shrink-0">
 <ShieldAlert size={12} />
 </div>
 <span className="font-bold text-neutral-800">{alert.user}</span>
 </div>
 </td>
 <td className="py-4 px-4">
 <span className="px-2 py-0.5 rounded-full border text-[9px] font-black bg-danger-light text-danger border-red-200">
 {alert.eventType || alert.action}
 </span>
 </td>
 <td className="py-4 px-4 max-w-xs">
 <span className="text-neutral-600 block truncate">{alert.details}</span>
 </td>
 <td className="py-4 px-4 font-mono text-[10px] text-neutral-600">
 {alert.ipAddress || '—'}
 </td>
 <td className="py-4 pr-6 text-right">
 <button
 onClick={() => handleOpenDetails(alert)}
 className="p-1.5 rounded bg-neutral-50 hover:bg-neutral-50 border border-neutral-100 text-neutral-600 hover:text-neutral-900 cursor-pointer transition-colors"
 title="View Details"
 >
 <Maximize2 size={12} />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Pagination Controls */}
 {warningsTotalPages > 1 && (
 <div className="flex flex-col sm:flex-row items-center justify-between mt-5 bg-white border border-neutral-100 rounded-3xl p-4 gap-4">
 <span className="text-[11px] text-neutral-500 font-bold select-none">
 Showing <b className="text-neutral-700">{Math.min(warningsTotal, (warningsPage - 1) * warningsPageSize + 1)}</b> to{' '}
 <b className="text-neutral-700">{Math.min(warningsTotal, warningsPage * warningsPageSize)}</b> of{' '}
 <b className="text-neutral-700">{warningsTotal}</b> warnings
 </span>

 <div className="flex items-center gap-1.5">
 <button
 disabled={warningsPage === 1}
 onClick={() => setWarningsPage(1)}
 className="px-2.5 py-1.5 rounded-xl bg-neutral-50 border border-neutral-100 hover:border-neutral-200 text-[10px] font-bold text-neutral-600 hover:text-neutral-900 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
 >
 First
 </button>
 <button
 disabled={warningsPage === 1}
 onClick={() => setWarningsPage(p => Math.max(1, p - 1))}
 className="px-2.5 py-1.5 rounded-xl bg-neutral-50 border border-neutral-100 hover:border-neutral-200 text-[10px] font-bold text-neutral-600 hover:text-neutral-900 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
 >
 Prev
 </button>

 <span className="text-[10px] font-bold text-neutral-600 px-3 py-1 bg-white border border-neutral-100/60 rounded-lg select-none">
 Page <b className="text-primary">{warningsPage}</b> of {warningsTotalPages}
 </span>

 <button
 disabled={warningsPage === warningsTotalPages}
 onClick={() => setWarningsPage(p => Math.min(warningsTotalPages, p + 1))}
 className="px-2.5 py-1.5 rounded-xl bg-neutral-50 border border-neutral-100 hover:border-neutral-200 text-[10px] font-bold text-neutral-600 hover:text-neutral-900 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
 >
 Next
 </button>
 <button
 disabled={warningsPage === warningsTotalPages}
 onClick={() => setWarningsPage(warningsTotalPages)}
 className="px-2.5 py-1.5 rounded-xl bg-neutral-50 border border-neutral-100 hover:border-neutral-200 text-[10px] font-bold text-neutral-600 hover:text-neutral-900 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
 >
 Last
 </button>
 </div>
 </div>
 )}
 </>
 )
 )}

 {/* FOOTER RETENTION INFORMATION */}
 <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-neutral-100 bg-neutral-50/20 rounded-2xl text-[10px] text-neutral-500 font-bold select-none">
 <div className="flex items-center gap-1.5">
 <Info size={12} className="text-primary" />
 <span>Log Retention Configuration: Active</span>
 </div>
 <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
 <span>Retention Period: <b>{retentionDays ?? '—'} Days (Hot Storage)</b></span>
 <span>Archive Status: <b>Ready</b></span>
 <span>Cluster Storage: <b>PostgreSQL Primary Partition</b></span>
 </div>
 </div>

 {/* ========================================================================= */}
 {/* DRAWER: AUDIT EVENT DETAILS & TIMELINE */}
 {/* ========================================================================= */}
 {drawerOpen && selectedLog && (
 <div className="fixed inset-0 z-[100] overflow-hidden flex justify-end">
 <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setDrawerOpen(false)} />

 <div className="relative w-full max-w-md bg-white border-l border-neutral-100 h-full shadow-2xl flex flex-col z-10 animate-slide-left">
 {/* Header */}
 <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/20">
 <div>
 <h3 className="font-extrabold text-sm text-neutral-900">Event Payload Overview</h3>
 <span className="text-[10px] text-neutral-500">ID: {selectedLog.id}</span>
 </div>
 <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 cursor-pointer">
 <X size={15} />
 </button>
 </div>

 {/* Content Body */}
 <div className="flex-1 overflow-y-auto p-5 space-y-6">
 {/* Category & Action Badge */}
 <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4.5 space-y-3.5">
 <div>
 <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Event Action Summary</span>
 <span className="block text-xs font-black text-neutral-900 mt-1">{selectedLog.action}</span>
 <p className="text-xs text-neutral-600 mt-2 leading-relaxed">{selectedLog.details}</p>
 </div>

 <div className="border-t border-neutral-100 pt-3.5 flex justify-between text-xs">
 <div>
 <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Category</span>
 <span className="block font-bold text-primary mt-0.5">{selectedLog.eventCategory || 'General'}</span>
 </div>
 <div className="text-right">
 <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Event Type</span>
 <span className="block font-extrabold text-neutral-800 mt-0.5">{selectedLog.eventType || 'N/A'}</span>
 </div>
 </div>

 <div className="border-t border-neutral-100 pt-3.5">
 <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Timestamp</span>
 <span className="block text-[11px] font-mono text-neutral-700 mt-0.5">
 {new Date(selectedLog.createdAt).toUTCString()}
 </span>
 </div>
 </div>

 {/* User Metadata */}
 <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4.5 space-y-3.5">
 <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1">User Context</span>

 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center font-bold text-primary">
 {selectedLog.user.substring(0, 2).toUpperCase()}
 </div>
 <div>
 <span className="block text-xs font-black text-neutral-900">{selectedLog.user}</span>
 <span className="block text-[9px] text-neutral-500 mt-0.5">User ID: {selectedLog.userId || 'Guest Session'}</span>
 </div>
 </div>
 </div>

 {/* Device and Request Headers */}
 <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4.5 space-y-3.5">
 <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Request Metadata</span>

 <div className="grid grid-cols-2 gap-4 text-xs pt-1">
 <div>
 <span className="block text-[8px] font-bold uppercase text-neutral-500">IP Address</span>
 <span className="font-mono text-neutral-700 block mt-0.5">{selectedLog.ipAddress || '127.0.0.1'}</span>
 </div>
 <div>
 <span className="block text-[8px] font-bold uppercase text-neutral-500">Device</span>
 <span className="text-neutral-700 font-semibold block mt-0.5">{selectedLog.metadata?.device || 'Desktop'}</span>
 </div>
 <div>
 <span className="block text-[8px] font-bold uppercase text-neutral-500">Browser</span>
 <span className="text-neutral-700 font-semibold block mt-0.5">{selectedLog.metadata?.browser || 'Chrome'}</span>
 </div>
 <div>
 <span className="block text-[8px] font-bold uppercase text-neutral-500">Session ID</span>
 <span className="font-mono text-[9px] text-neutral-600 block mt-0.5 truncate max-w-[120px]">{selectedLog.metadata?.sessionId || 'N/A'}</span>
 </div>
 </div>

 <div className="border-t border-neutral-100 pt-3">
 <span className="block text-[8px] font-bold uppercase text-neutral-500">User Agent</span>
 <p className="font-mono text-[9px] text-neutral-500 mt-1 break-all bg-neutral-50 p-2 rounded-lg border border-neutral-100/60 leading-relaxed">
 {selectedLog.userAgent || 'Unknown'}
 </p>
 </div>
 </div>

 {/* Chronological Activity Timeline */}
 <div className="space-y-4 pt-2">
 <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">User Chronological Activity:</span>

 {timelineLoading ? (
 <div className="flex items-center gap-2 text-xs text-neutral-500 py-4 justify-center">
 <RefreshCw className="animate-spin" size={12} />
 <span>Loading activity logs...</span>
 </div>
 ) : (
 <div className="relative border-l border-neutral-200 pl-4.5 ml-2.5 space-y-4">
 {userTimeline.map((item) => {
 const isItemFail = item.action.toLowerCase().includes('failed') || item.eventType?.includes('FAILED') || item.eventType?.includes('DENIED');
 return (
 <div key={item.id} className="relative">
 <div className={`absolute -left-7 top-1 w-2.5 h-2.5 rounded-full border border-neutral-100 ${isItemFail ? 'bg-danger' : 'bg-success'
 }`} />
 <div className="text-xs font-bold text-neutral-700">{item.eventType || item.action}</div>
 <p className="text-[10px] text-neutral-500 mt-0.5 leading-relaxed">{item.details}</p>
 <div className="text-[9px] text-neutral-400 mt-1">{new Date(item.createdAt).toLocaleString()}</div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
