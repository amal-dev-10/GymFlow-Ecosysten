'use client';

import React, { useState, useEffect } from 'react';
import {
 Clock,
 Check,
 Shield,
 Lock,
 TrendingDown,
 Info,
 Calendar,
 AlertTriangle,
 CheckCircle,
 Sliders,
 X,
 History,
 Mail,
 CheckSquare,
 AlertOctagon,
 Building2,
 DollarSign,
 Search
} from 'lucide-react';
import { rolesApi, orgApi, subscriptionApi } from '../../../../lib/api';
import { useAccessControl } from '../../../../context/access-control';

type StatusType = 'Active' | 'Trial' | 'Suspended' | 'Expired' | 'Archived' | 'Pending Verification';

interface StatusHistoryEvent {
 id: string;
 previousStatus: StatusType;
 newStatus: StatusType;
 reason: string;
 notes: string;
 changedBy: string;
 changedByEmail: string;
 timestamp: string;
 ipAddress: string;
 effectiveDate: string;
}

interface NotificationPreview {
 id: string;
 title: string;
 recipient: string;
 subject: string;
 channel: 'Email' | 'SMS' | 'In-App';
 status: 'sent' | 'pending';
 body: string;
}

export default function StatusTab() {
 const { userRole } = useAccessControl();

 // Load Context
 const [loading, setLoading] = useState(true);
 const [orgName, setOrgName] = useState('GymFlow Workspace');
 const [orgId, setOrgId] = useState('');

 // Primary Status State
 const [currentStatus, setCurrentStatus] = useState<StatusType>('Active');
 const [lastStatusChange, setLastStatusChange] = useState({
 date: 'N/A',
 changedBy: 'System',
 reason: 'Initial setup completed.',
 notes: 'Platform tenant initialized.',
 ip: '127.0.0.1'
 });

 // Database audit logs history state
 const [statusHistory, setStatusHistory] = useState<StatusHistoryEvent[]>([]);

 // Notifications Feed Previews state
 const [notifications, setNotifications] = useState<NotificationPreview[]>([]);

 // Subscription and Invoices states
 const [activeSubscription, setActiveSubscription] = useState<any>(null);
 const [invoices, setInvoices] = useState<any[]>([]);

 // UI Filter States
 const [statusFilter, setStatusFilter] = useState<string>('all');
 const [searchQuery, setSearchQuery] = useState<string>('');
 const [dateRange, setDateRange] = useState({ start: '', end: '' });

 // Modal Flow States
 const [changeModalOpen, setChangeModalOpen] = useState(false);
 const [targetStatus, setTargetStatus] = useState<StatusType>('Active');
 const [changeReason, setChangeReason] = useState('');
 const [changeNotes, setChangeNotes] = useState('');
 const [changeEffectiveDate, setChangeEffectiveDate] = useState('');

 // Specific Action Flow Modals
 const [suspendModalOpen, setSuspendModalOpen] = useState(false);
 const [reactivateModalOpen, setReactivateModalOpen] = useState(false);
 const [archiveModalOpen, setArchiveModalOpen] = useState(false);

 // General Notification Alert Toast
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

 const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 const loadData = async () => {
 const savedOrgId = localStorage.getItem('organizationId') || '';
 if (!savedOrgId) return;

 setOrgId(savedOrgId);

 try {
 // 1. Fetch organization details to get status and name
 const orgs = await orgApi.list();
 const currentOrg = orgs.find((o: any) => o.id === savedOrgId);
 if (currentOrg) {
 setCurrentStatus((currentOrg.status || 'Active') as StatusType);
 setOrgName(currentOrg.name);
 }

 // 2. Fetch real audit logs of type STATUS_MANAGEMENT
 const dbLogs = await rolesApi.getAuditLogs();
 const statusLogs = (dbLogs || [])
 .filter((log: any) => log.eventType === 'STATUS_MANAGEMENT')
 .map((log: any) => ({
 id: log.id,
 previousStatus: (log.metadata?.previousStatus || 'Active') as StatusType,
 newStatus: (log.metadata?.newStatus || 'Active') as StatusType,
 reason: log.details || 'Status updated',
 notes: log.metadata?.notes || 'No administrative notes.',
 changedBy: log.user || 'Administrator',
 changedByEmail: log.metadata?.changedByEmail || '',
 timestamp: new Date(log.createdAt).toLocaleString(),
 ipAddress: log.metadata?.ipAddress || '127.0.0.1',
 effectiveDate: log.metadata?.effectiveDate || new Date(log.createdAt).toISOString().split('T')[0]
 }));

 setStatusHistory(statusLogs);

 if (statusLogs.length > 0) {
 const lastLog = statusLogs[0];
 setLastStatusChange({
 date: lastLog.timestamp,
 changedBy: lastLog.changedBy,
 reason: lastLog.reason,
 notes: lastLog.notes,
 ip: lastLog.ipAddress
 });
 }

 // 3. Map notifications triggered by status changes
 const mappedNotifs: NotificationPreview[] = statusLogs.slice(0, 3).map((log: any, idx: number) => ({
 id: `np-${log.id}`,
 title: `${log.newStatus} Alert`,
 recipient: log.changedByEmail || 'billing@gymflow.app',
 subject: `Workspace Lifecycle State Changed: ${log.newStatus}`,
 channel: idx === 1 ? 'SMS' : 'Email',
 status: 'sent',
 body: `Hello, the organization workspace status has been manually updated to ${log.newStatus}. Reason: ${log.reason}. Notes: ${log.notes}`
 }));
 setNotifications(mappedNotifs);

 // 4. Fetch subscription & invoices from backend
 try {
 const sub = await subscriptionApi.getActive();
 setActiveSubscription(sub);
 } catch (subErr) {
 console.warn('No active subscription found or failed to fetch:', subErr);
 setActiveSubscription(null);
 }

 try {
 const invs = await subscriptionApi.getInvoices();
 setInvoices(invs);
 } catch (invErr) {
 console.warn('Failed to fetch invoices:', invErr);
 setInvoices([]);
 }

 } catch (err) {
 console.error('Failed to load status logs from database:', err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 if (typeof window !== 'undefined') {
 setChangeEffectiveDate(new Date().toISOString().split('T')[0]);
 }
 }, []);

 // Filtered History
 const filteredHistory = statusHistory.filter(event => {
 const matchesStatus = statusFilter === 'all' || event.newStatus === statusFilter;
 const matchesSearch = searchQuery === '' || 
 event.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
 event.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
 event.changedBy.toLowerCase().includes(searchQuery.toLowerCase());
 
 let matchesDate = true;
 if (dateRange.start) {
 matchesDate = matchesDate && new Date(event.timestamp) >= new Date(dateRange.start);
 }
 if (dateRange.end) {
 matchesDate = matchesDate && new Date(event.timestamp) <= new Date(dateRange.end + 'T23:59:59');
 }

 return matchesStatus && matchesSearch && matchesDate;
 });

 // Action Permissions Check
 const canModifyStatus = userRole === 'owner' || userRole === 'platform_admin';
 const isPlatformAdmin = userRole === 'platform_admin';
 const isOwner = userRole === 'owner';

 // Impact Preview Calculator for Target Status
 const getImpactPreview = (status: StatusType) => {
 switch (status) {
 case 'Suspended':
 return {
 users: 'All users will be logged out instantly and blocked.',
 gyms: 'All branches suspended immediately.',
 features: 'Billing, Workouts, Diets, and Attendance logs restricted.',
 data: 'Safe and intact. Read/Write completely paused.',
 action: 'LOGOUT_ALL_USERS'
 };
 case 'Expired':
 return {
 users: 'Users can log in but cannot perform check-ins or sales.',
 gyms: 'Operations will enter a read-only state.',
 features: 'Subscriptions, Ledgers, and check-in controls restricted.',
 data: 'Safe and readable. Write permissions locked.',
 action: 'READ_ONLY_ACCESS'
 };
 case 'Archived':
 return {
 users: 'Access permanently revoked for all organization accounts.',
 gyms: 'All branch operations shut down.',
 features: 'All features locked out.',
 data: 'Cold stored. Retained for compliance and audit requirements.',
 action: 'COLD_STORAGE_LOCK'
 };
 case 'Active':
 return {
 users: 'All users regain full operational capability.',
 gyms: 'All branch gates, check-ins, and devices reactivated.',
 features: 'Full access restored to all subscription package tools.',
 data: 'Full read/write state restored.',
 action: 'RESTORE_FULL_ACCESS'
 };
 case 'Trial':
 return {
 users: 'Trial users retain access with limited capabilities.',
 gyms: 'Basic operations operational.',
 features: 'Basic operations enabled.',
 data: 'Full read/write enabled up to storage limits.',
 action: 'TRIAL_GRACE_PERIOD'
 };
 case 'Pending Verification':
 return {
 users: 'Admin onboarding only. Staff and trainers blocked.',
 gyms: 'Branches locked in draft configuration.',
 features: 'Only settings and setup wizard accessible.',
 data: 'Draft mode data initialization.',
 action: 'RESTRICTED_ONBOARDING'
 };
 }
 };

 const executeStatusChange = async (
 newStatus: StatusType,
 reason: string,
 notes: string,
 effectiveDate: string
 ) => {
 if (!canModifyStatus) {
 showToast('Action Denied: Insufficient authorization.', 'error');
 return;
 }

 if (newStatus === 'Suspended' && isOwner) {
 showToast('Action Blocked: Owners cannot suspend their own organization.', 'warning');
 return;
 }

 try {
 setLoading(true);
 const changedByName = isPlatformAdmin ? 'Sarah Jenkins (Platform Admin)' : 'Marcus Vance';
 const changedByEmail = isPlatformAdmin ? 'sarah.jenkins@gymflow.app' : 'marcus.vance@gymflow.app';

 // 1. Update organization details status in database
 await orgApi.update(orgId, {
 status: newStatus,
 isActive: newStatus === 'Active'
 });

 // 2. Log status transitions as a STATUS_MANAGEMENT audit log
 await rolesApi.createAuditLog({
 action: `org_status_changed_${newStatus.toLowerCase().replace(' ', '_')}`,
 details: reason || `Transitioned status to ${newStatus}`,
 user: changedByName,
 eventType: 'STATUS_MANAGEMENT',
 eventCategory: 'Lifecycle',
 metadata: {
 previousStatus: currentStatus,
 newStatus,
 reason,
 notes,
 changedByEmail,
 effectiveDate,
 ipAddress: '192.168.4.112'
 }
 });

 showToast(`Status updated to ${newStatus} successfully.`, 'success');
 
 // 3. Reload everything from backend
 await loadData();

 setChangeModalOpen(false);
 setSuspendModalOpen(false);
 setReactivateModalOpen(false);
 setArchiveModalOpen(false);

 setChangeReason('');
 setChangeNotes('');
 } catch (err) {
 console.error(err);
 showToast('Failed to update organization status.', 'error');
 setLoading(false);
 }
 };

 const handleOpenStatusFlow = (status: StatusType) => {
 setTargetStatus(status);
 if (status === 'Suspended') {
 setSuspendModalOpen(true);
 } else if (status === 'Active' && currentStatus === 'Suspended') {
 setReactivateModalOpen(true);
 } else if (status === 'Archived') {
 setArchiveModalOpen(true);
 } else {
 setChangeModalOpen(true);
 }
 };

 const latestInvoice = invoices[0];
 const latestPayment = latestInvoice?.payments?.[0];
 const hasPayment = !!latestPayment;

 if (loading) {
 return (
 <div className="p-8 text-center text-xs text-neutral-500 animate-pulse">
 Loading operational lifecycle details...
 </div>
 );
 }

 return (
 <div className="space-y-6 relative min-h-full pb-12 animate-fade-in">
 
 {/* Toast Alert Feedback */}
 {toast && (
 <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl border text-xs font-bold shadow-2xl animate-fade-in ${
 toast.type === 'success' ? 'bg-success-light border-green-200 text-success' :
 toast.type === 'warning' ? 'bg-warning-light border-amber-200 text-amber-700' :
 'bg-danger-light border-red-200 text-danger'
 }`}>
 <AlertOctagon size={16} />
 <span>{toast.message}</span>
 </div>
 )}

 {/* ACCESS DENIED STATE WARNING */}
 {!canModifyStatus && (
 <div className="p-4 bg-neutral-50/40 border border-neutral-200 rounded-2xl flex items-center gap-3 text-xs text-neutral-600 select-none">
 <Info size={16} className="text-primary shrink-0" />
 <span>
 You are logged in as a <strong>Manager</strong> (Read-only access). You can view the status history matrix, restrictions, and health statistics but cannot perform lifecycle changes.
 </span>
 </div>
 )}

 {/* MAIN TOP SECTION: ORG HEALTH & BADGE METRICS */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

 {/* Dashboard Status Card */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-4">
 <div className="flex justify-between items-start">
 <div>
 <span className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider block">Workspace Availability</span>
 <div className="flex items-center gap-2.5 mt-2">
 <span className={`w-3.5 h-3.5 rounded-full animate-pulse ${
 currentStatus === 'Active' ? 'bg-success' :
 currentStatus === 'Trial' ? 'bg-primary' :
 currentStatus === 'Suspended' ? 'bg-danger' :
 currentStatus === 'Expired' ? 'bg-danger' :
 currentStatus === 'Archived' ? 'bg-neutral-100' : 'bg-warning'
 }`} />
 <h3 className="text-xl font-black text-neutral-900">{currentStatus}</h3>
 </div>
 </div>
 </div>

 <div className="space-y-3 pt-3.5 border-t border-neutral-100 text-xs">
 <div className="flex justify-between">
 <span className="text-neutral-500">Subscription Status:</span>
 <span className="text-success font-bold">Good Standing</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">Lifecycle State:</span>
 <span className="text-neutral-700 font-medium">Database Synced</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">IP Scope Address:</span>
 <span className="text-neutral-600 font-mono">{lastStatusChange.ip}</span>
 </div>
 </div>
 </div>

 {/* Last Transition Status Change */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-3.5 md:col-span-2 flex flex-col justify-between">
 <div>
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider block">Last Status Change Event</span>
 <span className="text-[10px] font-bold text-neutral-400 font-mono">{lastStatusChange.date}</span>
 </div>
 
 <div className="mt-3 space-y-2">
 <p className="text-xs text-neutral-800 font-bold">Reason: <span className="text-neutral-600 font-semibold">{lastStatusChange.reason}</span></p>
 <p className="text-xs text-neutral-800 font-bold">Notes: <span className="text-neutral-500 font-semibold italic">{lastStatusChange.notes}</span></p>
 </div>
 </div>

 <div className="border-t border-neutral-100 pt-3.5 flex items-center justify-between text-[11px]">
 <span className="text-neutral-500">Transition triggered by: <strong className="text-neutral-700">{lastStatusChange.changedBy}</strong></span>
 <span className="text-[9px] bg-neutral-50 border border-neutral-100 px-2.5 py-0.5 rounded text-neutral-600 uppercase font-black select-none">SYSTEM SYNCED</span>
 </div>
 </div>

 </div>

 {/* CORE CONTROL ROW: STATUS MANAGEMENT CARD & IMPACT SUMMARY */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

 {/* Status Lifecycle Control Card */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-4 lg:col-span-2">
 <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
 <div>
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Operational Lifecycle Transitions</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Select a destination state below to view restriction impacts and activate changes.</p>
 </div>
 <Sliders size={15} className="text-primary" />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
 {[
 { status: 'Active', color: 'border-green-200 hover:border-green-200 bg-success-light', icon: CheckCircle, desc: 'Restore complete operational capabilities.' },
 { status: 'Trial', color: 'border-primary/20 hover:border-primary/20 bg-primary-light', icon: Clock, desc: 'Establish exploratory setup timer.' },
 { status: 'Suspended', color: 'border-red-200 hover:border-red-200 bg-danger-light', icon: AlertTriangle, desc: 'Revoke organization access immediately.' },
 { status: 'Expired', color: 'border-red-200 hover:border-red-200 bg-danger-light', icon: TrendingDown, desc: 'Billing overdue read-only grace phase.' },
 { status: 'Archived', color: 'border-neutral-200 hover:border-neutral-200 bg-neutral-50/20', icon: Lock, desc: 'Soft-delete workspace while retaining database logs.' },
 { status: 'Pending Verification', color: 'border-amber-200 hover:border-amber-200 bg-warning-light', icon: Shield, desc: 'Restrict operations to wizard settings setup.' }
 ].map((transition) => {
 const isCurrent = currentStatus === transition.status;
 const Icon = transition.icon;
 return (
 <button
 key={transition.status}
 disabled={!canModifyStatus || isCurrent}
 onClick={() => handleOpenStatusFlow(transition.status as StatusType)}
 className={`w-full p-4 border rounded-2xl text-left transition-all relative ${
 isCurrent ? 'border-primary/20 bg-primary-light ring-1 ring-primary/20' :
 !canModifyStatus ? 'opacity-50 cursor-not-allowed border-neutral-100 hover:border-neutral-100 bg-neutral-50/10' :
 transition.color
 }`}
 >
 {isCurrent && (
 <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-primary text-[8px] font-black text-white rounded tracking-wider uppercase select-none">
 Active
 </span>
 )}
 <Icon size={16} className={isCurrent ? 'text-primary' : 'text-neutral-600'} />
 <h4 className="text-xs font-black text-neutral-900 mt-2.5">{transition.status}</h4>
 <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">{transition.desc}</p>
 </button>
 );
 })}
 </div>

 <div className="bg-neutral-50 border border-neutral-100 p-4 rounded-2xl text-xs space-y-1.5 select-none">
 <span className="font-extrabold text-primary block uppercase tracking-wider text-[9px]">Platform Notice</span>
 <p className="text-neutral-600 leading-normal">
 Changing organization state propagates across all API gateways in less than 30 seconds. Clients connected to devices or logged into active browser sessions will be evaluated during their next auth check.
 </p>
 </div>
 </div>

 {/* Subscription Impact Panel */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-4">
 <div className="pb-2 border-b border-neutral-100 flex justify-between items-center select-none">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Subscription Health</h3>
 <DollarSign className="text-primary font-bold" size={15} />
 </div>

 <div className="space-y-4">
 {activeSubscription ? (
 <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl">
 <div className="flex justify-between items-center">
 <span className="text-[10px] text-neutral-500 font-bold uppercase">Linked Payment Method</span>
 <span className="text-[9px] px-2 py-0.5 bg-success-light text-success font-bold rounded uppercase border border-green-200">
 {hasPayment ? 'Active Auto' : 'No Card Linked'}
 </span>
 </div>
 <div className="flex items-center gap-3.5 mt-3 text-xs">
 <div className="px-2.5 py-1 rounded bg-neutral-50 border border-neutral-200 text-[10px] font-extrabold text-neutral-600 uppercase tracking-wider">
 {latestPayment?.paymentMethod ? latestPayment.paymentMethod.replace('_', ' ') : 'None'}
 </div>
 <div>
 <span className="block font-bold text-neutral-800">
 {latestPayment?.paymentMethod ? `${latestPayment.paymentMethod.replace('_', ' ')} System` : 'No payment method on file'}
 </span>
 {latestPayment?.transactionId && (
 <span className="text-[9px] text-neutral-500 block font-mono mt-0.5 truncate max-w-[185px]">
 Tx: {latestPayment.transactionId}
 </span>
 )}
 </div>
 </div>
 </div>
 ) : (
 <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl">
 <div className="flex justify-between items-center">
 <span className="text-[10px] text-neutral-500 font-bold uppercase">Linked Payment Method</span>
 <span className="text-[9px] px-2 py-0.5 bg-neutral-50 text-neutral-600 font-bold rounded uppercase border border-neutral-200">
 Free Tier
 </span>
 </div>
 <div className="flex items-center gap-3.5 mt-3 text-xs">
 <div className="px-2.5 py-1 rounded bg-neutral-50 border border-neutral-200 text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider">
 NONE
 </div>
 <div>
 <span className="block font-bold text-neutral-600">No Payment Method Registered</span>
 <span className="text-[10px] text-neutral-500">SaaS subscription is free</span>
 </div>
 </div>
 </div>
 )}

 <div className="space-y-3.5 text-xs select-none">
 <div className="flex justify-between">
 <span className="text-neutral-500">Plan Rate:</span>
 <span className="text-neutral-700 font-bold">
 {activeSubscription 
 ? `$${activeSubscription.plan.price.toFixed(2)} / ${activeSubscription.plan.interval}` 
 : 'Free (SaaS Tier)'}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">Outstanding Invoices:</span>
 <span className="text-success font-bold">
 {invoices.some(inv => inv.status !== 'Paid') ? 'Has Unpaid' : '$0.00 (None)'}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">Subscription Status:</span>
 <span className="text-success font-bold flex items-center gap-1">
 <span className={`w-1.5 h-1.5 rounded-full ${activeSubscription?.status === 'Active' ? 'bg-success' : 'bg-neutral-100'}`} />
 {activeSubscription ? activeSubscription.status : 'Active Free Sync'}
 </span>
 </div>
 </div>
 </div>
 </div>

 </div>

 {/* STATUS RESTRICTIONS MATRIX SECTION */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-4">
 <div className="pb-2 border-b border-neutral-100 flex justify-between items-center select-none">
 <div>
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Status Restrictions Matrix</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Definitive grid mapping operational access capabilities across availability states.</p>
 </div>
 <CheckSquare className="text-primary" size={15} />
 </div>

 <div className="overflow-x-auto select-none">
 <table className="w-full text-xs text-left text-neutral-600">
 <thead className="text-[9px] uppercase tracking-wider text-neutral-500 border-b border-neutral-100">
 <tr>
 <th className="py-3 px-4">Status State</th>
 <th className="py-3 px-4">Login Access</th>
 <th className="py-3 px-4">Workspace Access</th>
 <th className="py-3 px-4">Data Read/Write</th>
 <th className="py-3 px-4">Billing / Settings</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100/60">
 {[
 { status: 'Active', login: 'Allowed', workspace: 'Full Access', data: 'Full Access', billing: 'Full Access', highlight: true },
 { status: 'Trial', login: 'Allowed', workspace: 'Limited Access', data: 'Full Access', billing: 'Settings Only' },
 { status: 'Suspended', login: 'Blocked', workspace: 'No Access', data: 'Locked (Intact)', billing: 'Support Ticket Only' },
 { status: 'Expired', login: 'Allowed', workspace: 'Read Only', data: 'Read Only', billing: 'Renewal Gateway Only' },
 { status: 'Archived', login: 'Blocked', workspace: 'No Access', data: 'Cold Storage (Read)', billing: 'None' },
 { status: 'Pending Verification', login: 'Owner Only', workspace: 'Wizard Onboarding', data: 'Restricted (Setup)', billing: 'Full Access' }
 ].map((row, idx) => (
 <tr 
 key={idx} 
 className={`hover:bg-neutral-50/20 transition-colors ${row.status === currentStatus ? 'bg-primary-light' : ''}`}
 >
 <td className="py-3.5 px-4 font-bold text-neutral-900 flex items-center gap-1.5">
 {row.status === currentStatus && <span className="w-1.5 h-1.5 bg-primary rounded-full" />}
 {row.status}
 </td>
 <td className="py-3.5 px-4">{row.login}</td>
 <td className="py-3.5 px-4">{row.workspace}</td>
 <td className="py-3.5 px-4">{row.data}</td>
 <td className="py-3.5 px-4">{row.billing}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* FILTER & HISTORY SECTION */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-4">
 
 {/* Header with Search and Filter Toggle */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-neutral-100">
 <div>
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Lifecycle Audit History</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5 font-bold">Comprehensive database audit logs of all lifecycle state transitions.</p>
 </div>
 
 <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
 {/* Search Input */}
 <div className="relative flex-1 sm:flex-initial">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 shrink-0">
 <Search size={13} />
 </span>
 <input
 type="text"
 placeholder="Search logs..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full sm:w-48 pl-8 pr-3 py-1.5 bg-neutral-50 border border-neutral-100 rounded-xl text-xs text-neutral-700 focus:outline-none focus:border-neutral-200"
 />
 </div>

 {/* Status Filter */}
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="py-1.5 px-2 bg-neutral-50 border border-neutral-100 rounded-xl text-xs text-neutral-600 focus:outline-none focus:border-neutral-200 cursor-pointer"
 >
 <option value="all">All States</option>
 <option value="Active">Active Only</option>
 <option value="Trial">Trial Only</option>
 <option value="Suspended">Suspended Only</option>
 <option value="Expired">Expired Only</option>
 <option value="Archived">Archived Only</option>
 <option value="Pending Verification">Pending verification</option>
 </select>

 {/* Clear Filters CTA */}
 {(searchQuery || statusFilter !== 'all' || dateRange.start || dateRange.end) && (
 <button
 onClick={() => {
 setSearchQuery('');
 setStatusFilter('all');
 setDateRange({ start: '', end: '' });
 }}
 className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
 >
 Clear
 </button>
 )}
 </div>
 </div>

 {/* Date Filters Expandable */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 select-none">
 <div className="flex items-center gap-2">
 <span className="text-[10px] text-neutral-500 font-bold uppercase shrink-0">From Date</span>
 <input
 type="date"
 value={dateRange.start}
 onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
 className="flex-1 px-3 py-1.5 bg-neutral-50 border border-neutral-100 rounded-xl text-xs text-neutral-600 focus:outline-none"
 />
 </div>
 <div className="flex items-center gap-2">
 <span className="text-[10px] text-neutral-500 font-bold uppercase shrink-0">To Date</span>
 <input
 type="date"
 value={dateRange.end}
 onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
 className="flex-1 px-3 py-1.5 bg-neutral-50 border border-neutral-100 rounded-xl text-xs text-neutral-500 focus:outline-none"
 />
 </div>
 </div>

 {/* Timeline Event Feed / Logs */}
 <div className="space-y-4 pt-2">
 {filteredHistory.length === 0 ? (
 <div className="p-8 bg-neutral-50/40 border border-neutral-100 border-dashed rounded-2xl text-center flex flex-col items-center select-none">
 <History className="text-neutral-400 mb-3" size={24} />
 <span className="text-xs font-bold text-neutral-600">No database status logs found</span>
 <p className="text-[10px] text-neutral-500 mt-1 max-w-xs leading-normal">
 No organization lifecycle history events have been logged yet.
 </p>
 </div>
 ) : (
 <div className="border-l border-neutral-100 pl-4 space-y-5">
 {filteredHistory.map((event) => (
 <div key={event.id} className="relative group">
 <span className={`absolute left-[-21px] top-1.5 w-2.5 h-2.5 rounded-full border border-neutral-200 ${
 event.newStatus === 'Active' ? 'bg-success' :
 event.newStatus === 'Trial' ? 'bg-primary' :
 event.newStatus === 'Suspended' ? 'bg-danger' :
 event.newStatus === 'Expired' ? 'bg-danger' :
 event.newStatus === 'Archived' ? 'bg-neutral-100' : 'bg-warning'
 }`} />
 <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-1.5">
 <div>
 <span className="text-xs font-black text-neutral-900">
 Changed to {event.newStatus}
 </span>
 <span className="text-[10px] text-neutral-400 ml-2">
 (Previous State: {event.previousStatus})
 </span>
 </div>
 <span className="text-[9px] font-mono text-neutral-400 font-semibold">{event.timestamp}</span>
 </div>

 <div className="mt-1.5 text-[11px] text-neutral-600 space-y-1">
 <p className="font-semibold text-neutral-700">Reason: <span className="font-medium text-neutral-600">{event.reason}</span></p>
 {event.notes && <p className="font-semibold text-neutral-700">Notes: <span className="font-medium text-neutral-500 italic">{event.notes}</span></p>}
 <div className="flex items-center gap-3 mt-1.5 text-[9px] text-neutral-400">
 <span>By: <b>{event.changedBy}</b></span>
 <span>IP: <b>{event.ipAddress}</b></span>
 <span>Effective: <b>{event.effectiveDate}</b></span>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 </div>

 {/* NOTIFICATION PREVIEWS DRAWER */}
 {notifications.length > 0 && (
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-4 select-none animate-fade-in">
 <div className="pb-2 border-b border-neutral-100 flex justify-between items-center">
 <div>
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Automated Notification Previews</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5 font-bold">Alert logs dispatch previews triggered by the latest lifecycle event.</p>
 </div>
 <Mail className="text-primary" size={15} />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {notifications.map((n) => (
 <div key={n.id} className="p-4 bg-neutral-50/60 border border-neutral-100 rounded-2xl flex flex-col justify-between min-h-[160px]">
 <div>
 <div className="flex justify-between items-center">
 <span className="text-[9px] text-neutral-400 font-bold uppercase">{n.channel} alert</span>
 <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-success-light text-success border border-green-200`}>
 {n.status}
 </span>
 </div>
 <h4 className="text-xs font-black text-neutral-800 mt-2.5 truncate">{n.subject}</h4>
 <p className="text-[10px] text-neutral-500 mt-1.5 leading-relaxed line-clamp-3">{n.body}</p>
 </div>
 
 <span className="text-[9px] text-neutral-400 mt-3 block font-semibold truncate font-mono">To: {n.recipient}</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* MODAL: GENERAL STATUS CHANGE FLOW */}
 {/* ========================================================================= */}
 {changeModalOpen && (
 <div className="fixed inset-0 bg-background backdrop-blur-sm flex items-center justify-center z-[100] p-4 select-none animate-fade-in">
 <div className="bg-white border border-neutral-200 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-in">
 {/* Header */}
 <div className="flex justify-between items-center p-6 border-b border-neutral-100 bg-neutral-50/20">
 <div>
 <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Request Lifecycle Change</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Transition organization to target status <strong>{targetStatus}</strong>.</p>
 </div>
 <button 
 onClick={() => setChangeModalOpen(false)}
 className="p-1 text-neutral-600 hover:text-neutral-900 bg-transparent border-none cursor-pointer"
 >
 <X size={18} />
 </button>
 </div>

 {/* Content Form */}
 <form onSubmit={(e) => {
 e.preventDefault();
 executeStatusChange(targetStatus, changeReason, changeNotes, changeEffectiveDate);
 }} className="p-6 space-y-4 text-xs">
 
 {/* Target Indicator */}
 <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-2xl flex justify-between items-center">
 <span className="text-neutral-500">Target Operational State:</span>
 <span className="px-3 py-1 bg-primary-light border border-primary/20 text-primary font-extrabold rounded-xl uppercase">
 {targetStatus}
 </span>
 </div>

 {/* Status Change Form Fields */}
 <div className="space-y-3">
 <div className="space-y-1">
 <label className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider block">Transition Reason *</label>
 <input
 type="text"
 required
 placeholder="e.g., Trial completed successfully, customer linked card"
 value={changeReason}
 onChange={(e) => setChangeReason(e.target.value)}
 className="w-full p-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-xs text-neutral-700 focus:outline-none focus:border-neutral-200"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block">Effective Execution Date</label>
 <input
 type="date"
 required
 value={changeEffectiveDate}
 onChange={(e) => setChangeEffectiveDate(e.target.value)}
 className="w-full p-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-xs text-neutral-700 focus:outline-none"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block">Internal Admin Notes</label>
 <textarea
 rows={3}
 placeholder="Enter context, linked ticketing reference, ledger ID details..."
 value={changeNotes}
 onChange={(e) => setChangeNotes(e.target.value)}
 className="w-full p-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-xs text-neutral-600 focus:outline-none focus:border-neutral-200 resize-none"
 />
 </div>
 </div>

 {/* Impact Preview Section */}
 <div className="border-t border-neutral-100 pt-4 space-y-2.5">
 <span className="text-[9px] font-black text-primary uppercase tracking-wider block">Expected Operational Impact Preview</span>
 
 <div className="grid grid-cols-2 gap-3 text-[10px] bg-neutral-50/40 p-3.5 border border-neutral-100 rounded-2xl">
 <div>
 <span className="block text-neutral-500">Affected Users:</span>
 <span className="block font-bold text-neutral-700 mt-0.5">{getImpactPreview(targetStatus)?.users}</span>
 </div>
 <div>
 <span className="block text-neutral-400">Affected Gyms:</span>
 <span className="block font-bold text-neutral-700 mt-0.5">{getImpactPreview(targetStatus)?.gyms}</span>
 </div>
 <div className="col-span-2 border-t border-neutral-100/60 pt-2">
 <span className="block text-neutral-400">Affected Feature Scopes:</span>
 <span className="block font-bold text-neutral-700 mt-0.5">{getImpactPreview(targetStatus)?.features}</span>
 </div>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="border-t border-neutral-100 pt-4 flex gap-3">
 <button
 type="button"
 onClick={() => setChangeModalOpen(false)}
 className="flex-1 py-2.5 border border-neutral-200 hover:border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-bold rounded-xl transition-all cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="flex-1 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
 >
 Confirm Change
 </button>
 </div>

 </form>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* MODAL: SUSPEND ORGANIZATION FLOW */}
 {/* ========================================================================= */}
 {suspendModalOpen && (
 <div className="fixed inset-0 bg-background backdrop-blur-sm flex items-center justify-center z-[100] p-4 select-none animate-fade-in">
 <div className="bg-white border border-neutral-200 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-in">
 <div className="p-6 text-center space-y-4">
 <div className="w-12 h-12 rounded-full bg-danger-light border border-red-200 flex items-center justify-center text-danger mx-auto">
 <AlertTriangle size={24} />
 </div>
 
 <div className="space-y-1">
 <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Suspend Organization?</h3>
 <p className="text-xs text-neutral-600 leading-normal">
 {orgName} will lose all workspace access until reactivated. This action will log out all active members and trainers instantly.
 </p>
 </div>

 <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-[10px] text-left text-neutral-500 space-y-1.5">
 <div className="flex items-center gap-1.5 text-danger font-bold">
 <Check size={12} /> Log out all active sessions
 </div>
 <div className="flex items-center gap-1.5 text-danger font-bold">
 <Check size={12} /> Lock branch gates & check-in devices
 </div>
 <div className="flex items-center gap-1.5 text-neutral-600">
 <Check size={12} /> Preserve database and transactional logs safely
 </div>
 </div>

 {/* Restrict Owner check */}
 {isOwner && (
 <div className="p-3 bg-danger-light border border-red-200 rounded-xl text-left text-[10px] text-danger">
 ⚠️ Action Blocked: As the Organization Owner, you cannot suspend your own active subscription. Please contact support.
 </div>
 )}

 {/* Form Input fields embedded in flow */}
 <div className="space-y-2.5 text-left text-xs">
 <label className="text-[9px] font-bold text-neutral-500 uppercase block">Suspension Reason</label>
 <input
 type="text"
 placeholder="e.g., Delinquent subscription invoice"
 disabled={isOwner}
 value={changeReason}
 onChange={(e) => setChangeReason(e.target.value)}
 className="w-full p-2.5 bg-neutral-50 border border-neutral-100 rounded-xl focus:outline-none"
 />
 </div>

 <div className="flex gap-3 pt-2">
 <button
 type="button"
 onClick={() => { setSuspendModalOpen(false); setChangeReason(''); }}
 className="flex-1 py-2.5 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-bold rounded-xl cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="button"
 disabled={isOwner || !changeReason}
 onClick={() => executeStatusChange('Suspended', changeReason, 'Suspended during flow confirmation.', changeEffectiveDate)}
 className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
 isOwner || !changeReason ? 'bg-neutral-50 text-neutral-500 cursor-not-allowed' : 'bg-danger text-white shadow-lg'
 }`}
 >
 Suspend Organization
 </button>
 </div>

 </div>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* MODAL: REACTIVATE ORGANIZATION FLOW */}
 {/* ========================================================================= */}
 {reactivateModalOpen && (
 <div className="fixed inset-0 bg-background backdrop-blur-sm flex items-center justify-center z-[100] p-4 select-none animate-fade-in">
 <div className="bg-white border border-neutral-200 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-in">
 <div className="p-6 text-center space-y-4">
 <div className="w-12 h-12 rounded-full bg-success-light border border-green-200 flex items-center justify-center text-success mx-auto">
 <CheckCircle size={24} />
 </div>
 
 <div className="space-y-1">
 <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Reactivate Workspace Access?</h3>
 <p className="text-xs text-neutral-600 leading-normal">
 Restore complete operational access for {orgName}. Membership check-ins and staff logins will resume immediately.
 </p>
 </div>

 <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-[11px] text-left space-y-2 text-neutral-500">
 <div className="flex justify-between">
 <span>Previous Status State:</span>
 <span className="font-bold text-danger">Suspended</span>
 </div>
 <div className="flex items-center gap-2 border-t border-neutral-100 pt-2.5 mt-1 text-[10px]">
 <input type="checkbox" defaultChecked required className="rounded border-neutral-200 bg-neutral-50 text-primary focus:ring-0" />
 <span>Restore full access features instantly</span>
 </div>
 </div>

 <div className="flex gap-3 pt-2">
 <button
 type="button"
 onClick={() => setReactivateModalOpen(false)}
 className="flex-1 py-2.5 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-bold rounded-xl cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={() => executeStatusChange('Active', 'Administrative reactivation override.', 'Workspace manually reactivated.', changeEffectiveDate)}
 className="flex-1 py-2.5 bg-success text-white text-xs font-bold rounded-xl shadow-lg hover:scale-[1.01] transition-all cursor-pointer"
 >
 Reactivate
 </button>
 </div>

 </div>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* MODAL: ARCHIVE ORGANIZATION FLOW */}
 {/* ========================================================================= */}
 {archiveModalOpen && (
 <div className="fixed inset-0 bg-background backdrop-blur-sm flex items-center justify-center z-[100] p-4 select-none animate-fade-in">
 <div className="bg-white border border-neutral-200 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-in">
 <div className="p-6 text-center space-y-4">
 <div className="w-12 h-12 rounded-full bg-danger-light border border-red-200 flex items-center justify-center text-danger mx-auto">
 <AlertTriangle size={24} />
 </div>
 
 <div className="space-y-1">
 <h3 className="text-sm font-black text-danger uppercase tracking-wider">Archive Organization Workspace?</h3>
 <p className="text-xs text-neutral-600 leading-normal">
 Archiving will disable organization access permanently while preserving all transactional data for compliance requirements.
 </p>
 </div>

 <div className="p-3.5 bg-danger-light border border-red-200 rounded-2xl text-[10px] text-left text-neutral-600 space-y-1.5">
 <p className="font-bold text-danger">⚠️ Critical Warnings:</p>
 <p>• Users will be logged out of the dashboard permanently.</p>
 <p>• Data preserved safely in read-only cold storage records.</p>
 <p>• Monthly subscription cycle invoices canceled immediately.</p>
 </div>

 <div className="space-y-2.5 text-left text-xs">
 <label className="text-[9px] font-bold text-neutral-400 uppercase block">Archive Reason Confirmation *</label>
 <input
 type="text"
 required
 placeholder="e.g., Business operations permanently closed"
 value={changeReason}
 onChange={(e) => setChangeReason(e.target.value)}
 className="w-full p-2.5 bg-neutral-50 border border-neutral-100 rounded-xl focus:outline-none"
 />
 </div>

 <div className="flex gap-3 pt-2">
 <button
 type="button"
 onClick={() => { setArchiveModalOpen(false); setChangeReason(''); }}
 className="flex-1 py-2.5 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-bold rounded-xl cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="button"
 disabled={!changeReason}
 onClick={() => executeStatusChange('Archived', changeReason, 'Workspace archived.', changeEffectiveDate)}
 className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
 !changeReason ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed' : 'bg-danger text-white shadow-lg'
 }`}
 >
 Archive Organization
 </button>
 </div>

 </div>
 </div>
 </div>
 )}

 </div>
 );
}
