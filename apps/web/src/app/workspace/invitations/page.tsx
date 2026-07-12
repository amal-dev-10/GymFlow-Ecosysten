'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { orgUsersApi, rolesApi, gymApi } from '../../../lib/api';
import {
 Mail,
 Search,
 Plus,
 X,
 Check,
 Copy,
 Trash2,
 MapPin,
 History,
 Clock,
 ShieldCheck,
 Download,
 AlertCircle,
 Phone,
 User,
 ArrowRight,
 Info,
 Calendar,
 RefreshCw,
 Send,
 CheckCircle2,
 Settings
} from 'lucide-react';

interface InvitationItem {
 id: string;
 phoneNumber: string;
 email?: string;
 fullName?: string;
 role: {
 id: string;
 name: string;
 };
 gymIds: 'all' | string[];
 invitedBy: string;
 sentDate: string;
 expiryDate: string;
 status: 'Pending' | 'Accepted' | 'Expired' | 'Cancelled' | 'Rejected';
 viewedAt?: string;
 acceptedAt?: string;
 declinedAt?: string;
 cancelledAt?: string;
}

interface GymBranch {
 id: string;
 name: string;
}

interface RoleItem {
 id: string;
 name: string;
 description: string;
 permissions: string[];
}

export default function InvitationsPage() {
 // Data States
 const [invitations, setInvitations] = useState<InvitationItem[]>([]);
 const [roles, setRoles] = useState<RoleItem[]>([]);
 const [gyms, setGyms] = useState<GymBranch[]>([]);
 const [loading, setLoading] = useState(true);

 // Statistics
 const [stats, setStats] = useState({
 pending: 0,
 accepted: 0,
 expired: 0,
 cancelled: 0
 });

 // Filter & Search States
 const [searchQuery, setSearchQuery] = useState('');
 const [statusFilter, setStatusFilter] = useState('all');
 const [roleFilter, setRoleFilter] = useState('all');
 const [gymFilter, setGymFilter] = useState('all');

 // UI Control States
 const [inviteDrawerOpen, setInviteDrawerOpen] = useState(false);
 const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
 const [cancelModalOpen, setCancelModalOpen] = useState(false);
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 // Selected Records
 const [selectedInvite, setSelectedInvite] = useState<InvitationItem | null>(null);

 // Invite Wizard States
 const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
 const [inviteForm, setInviteForm] = useState({
 phoneNumber: '',
 email: '',
 fullName: '',
 roleId: '',
 gymSelectionType: 'all' as 'all' | 'specific',
 selectedGyms: [] as string[],
 message: ''
 });
 const [successState, setSuccessState] = useState<any | null>(null);

 // Load Data
 const loadData = useCallback(async () => {
 const orgId = localStorage.getItem('organizationId');
 if (!orgId) return;
 setLoading(true);
 try {
 const [invitesData, rolesData, gymsData] = await Promise.all([
 orgUsersApi.getInvitations(),
 rolesApi.list(),
 gymApi.list(orgId)
 ]);

 setInvitations(invitesData);
 setRoles(rolesData);
 setGyms(gymsData);

 // Compute statistics based on database records
 const pendingCount = invitesData.filter((i: any) => i.status === 'Pending').length;
 const acceptedCount = invitesData.filter((i: any) => i.status === 'Accepted').length;
 const expiredCount = invitesData.filter((i: any) => i.status === 'Expired').length;
 const cancelledCount = invitesData.filter((i: any) => i.status === 'Cancelled' || i.status === 'Rejected').length;

 setStats({
 pending: pendingCount,
 accepted: acceptedCount,
 expired: expiredCount,
 cancelled: cancelledCount
 });
 } catch (err: any) {
 showToast('Failed to retrieve invitations information', 'error');
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => {
 loadData();
 }, [loadData]);

 const showToast = (message: string, type: 'success' | 'error') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 // Export Invitations to CSV
 const handleExport = () => {
 const csvContent ="data:text/csv;charset=utf-8,"
 + ["Phone Number,Email,Full Name,Role,Status,Sent Date,Expiry Date"].join(",") +"\n"
 + invitations.map(i => `"${i.phoneNumber}","${i.email || ''}","${i.fullName || ''}","${i.role.name}","${i.status}","${i.sentDate}","${i.expiryDate}"`).join("\n");
 const encodedUri = encodeURI(csvContent);
 const link = document.createElement("a");
 link.setAttribute("href", encodedUri);
 link.setAttribute("download", `gymflow_invitations_${new Date().toISOString().split('T')[0]}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 showToast('Invitations list exported successfully', 'success');
 };

 // Copy Invitation Acceptance Link
 const handleCopyLink = (inviteId: string) => {
 const link = `${window.location.origin}/accept-invite?token=${inviteId}`;
 navigator.clipboard.writeText(link);
 showToast('Invitation onboarding link copied to clipboard!', 'success');
 };

 // Submit new invitation
 const handleSendInvitation = async () => {
 const userStr = localStorage.getItem('user');
 if (userStr) {
 try {
 const u = JSON.parse(userStr);
 const normCaller = (u.phoneNumber || '').replace(/\D/g, '');
 const normTarget = (inviteForm.phoneNumber || '').replace(/\D/g, '');
 if (normCaller === normTarget && normCaller.length > 0) {
 showToast('You cannot invite yourself to this organization.', 'error');
 return;
 }
 } catch {}
 }

 try {
 const inviteResult = await orgUsersApi.inviteUser({
 phoneNumber: inviteForm.phoneNumber,
 roleId: inviteForm.roleId,
 email: inviteForm.email || undefined,
 fullName: inviteForm.fullName || undefined,
 gymIds: inviteForm.gymSelectionType === 'specific' ? inviteForm.selectedGyms : undefined,
 message: inviteForm.message || undefined
 });

 const selectedRole = roles.find(r => r.id === inviteForm.roleId);
 const selectedGymNames = inviteForm.gymSelectionType === 'all'
 ? ['All Gym Branches']
 : gyms.filter(g => inviteForm.selectedGyms.includes(g.id)).map(g => g.name);

 setSuccessState({
 id: inviteResult.id,
 phoneNumber: inviteForm.phoneNumber,
 roleName: selectedRole?.name || 'Staff',
 gyms: selectedGymNames,
 expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
 });

 // Clear wizard
 setInviteForm({
 phoneNumber: '',
 email: '',
 fullName: '',
 roleId: '',
 gymSelectionType: 'all',
 selectedGyms: [],
 message: ''
 });
 setWizardStep(1);
 loadData();
 showToast('Invitation successfully dispatched!', 'success');
 } catch (err: any) {
 showToast('Failed to create invitation', 'error');
 }
 };

 // Resend invitation
 const handleResend = async (id: string) => {
 try {
 await orgUsersApi.resendInvitation(id);
 showToast('Invitation SMS re-sent & token extended!', 'success');
 loadData();
 } catch {
 showToast('Failed to resend invitation', 'error');
 }
 };

 // Cancel invitation
 const handleCancelConfirm = async () => {
 if (!selectedInvite) return;
 try {
 await orgUsersApi.deleteInvitation(selectedInvite.id);
 showToast('Invitation has been cancelled and deactivated', 'success');
 setCancelModalOpen(false);
 setSelectedInvite(null);
 loadData();
 } catch {
 showToast('Failed to cancel invitation', 'error');
 }
 };

 // Filter logic
 const filteredInvitations = invitations.filter(invite => {
 const matchesSearch =
 invite.phoneNumber.includes(searchQuery) ||
 (invite.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
 (invite.email || '').toLowerCase().includes(searchQuery.toLowerCase());

 const matchesStatus = statusFilter === 'all' || invite.status.toLowerCase() === statusFilter.toLowerCase();
 const matchesRole = roleFilter === 'all' || invite.role.id === roleFilter;
 const matchesGym = gymFilter === 'all' ||
 (invite.gymIds === 'all' || invite.gymIds.includes(gymFilter));

 return matchesSearch && matchesStatus && matchesRole && matchesGym;
 });

 return (
 <div className="relative min-h-full">
 {/* TOAST NOTIFICATIONS */}
 {toast && (
 <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs font-bold shadow-2xl animate-fade-in ${
 toast.type === 'success'
 ? 'bg-success-light border-green-200 text-success'
 : 'bg-danger-light border-red-200 text-danger'
 }`}>
 <AlertCircle size={14} />
 <span>{toast.message}</span>
 </div>
 )}

 {/* PAGE HEADER */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
 <div>
 <h1 className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
 <Mail className="text-primary" />
 <span>Invitations</span>
 </h1>
 <p className="text-xs text-neutral-600 mt-1">Manage organization invitations, onboard staff, and monitor pending invitations status.</p>
 </div>
 <div className="flex items-center gap-2.5">
 <button
 onClick={handleExport}
 className="px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-100 hover:border-neutral-200 text-xs font-bold text-neutral-700 hover:text-neutral-900 flex items-center gap-1.5 transition-all cursor-pointer"
 >
 <Download size={13} />
 <span>Export Invitations</span>
 </button>
 <button
 onClick={() => { setInviteDrawerOpen(true); setSuccessState(null); }}
 className="px-3.5 py-2 rounded-xl bg-primary hover:scale-[1.02] active:scale-[0.98] text-xs font-black text-white flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
 >
 <Plus size={13} />
 <span>Invite User</span>
 </button>
 </div>
 </div>

 {/* STATISTICS CARDS */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
 {[
 { label: 'Pending Invitations', val: stats.pending, desc: 'Awaiting registration', icon: Clock, color: 'bg-primary-light border-primary/20 text-primary' },
 { label: 'Accepted Invitations', val: stats.accepted, desc: 'Joined workspace', icon: CheckCircle2, color: 'bg-primary-light border-green-200 text-success' },
 { label: 'Expired Invitations', val: stats.expired, desc: 'Token timeout', icon: Calendar, color: 'from-indigo-500/15 to-indigo-600/5 border-indigo-500/15 text-indigo-400' },
 { label: 'Cancelled / Rejected', val: stats.cancelled, desc: 'Deactivated invites', icon: Trash2, color: 'bg-primary-light border-red-200 text-danger' }
 ].map((card, idx) => (
 <div key={idx} className={`p-4 bg-neutral-50/30 border rounded-2xl bg-gradient-to-br transition-all hover:-translate-y-0.5 ${card.color}`}>
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-600">{card.label}</span>
 <card.icon size={16} />
 </div>
 <div className="text-2xl font-black text-neutral-900 mt-2">{card.val}</div>
 <span className="text-[9px] text-neutral-500 mt-1 block">{card.desc}</span>
 </div>
 ))}
 </div>

 {/* ADVANCED FILTERING PANEL */}
 <div className="bg-white border border-neutral-100 rounded-3xl p-5 mb-8">
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-100 pb-4 mb-5">
 {/* Quick tab filters */}
 <div className="flex items-center gap-1.5 p-1 bg-neutral-50 border border-neutral-100 rounded-xl w-fit">
 {['all', 'pending', 'accepted', 'expired'].map((tab) => (
 <button
 key={tab}
 onClick={() => setStatusFilter(tab)}
 className={`px-4 py-1.5 rounded-lg text-xs font-black capitalize transition-all cursor-pointer ${
 statusFilter === tab ? 'bg-primary text-white shadow-md' : 'text-neutral-600 hover:text-neutral-900'
 }`}
 >
 {tab}
 </button>
 ))}
 </div>

 {/* Search bar */}
 <div className="relative flex-1 max-w-sm">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={13} />
 <input
 type="text"
 placeholder="Search by name, phone, or email..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-xl pl-9.5 pr-4 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none"
 />
 </div>
 </div>

 {/* Dropdowns filters */}
 <div className="flex flex-wrap items-center gap-3">
 <div className="flex items-center gap-1.5">
 <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Role:</span>
 <select
 value={roleFilter}
 onChange={(e) => setRoleFilter(e.target.value)}
 className="bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-lg text-xs px-2.5 py-1 text-neutral-700 focus:outline-none"
 >
 <option value="all">All Roles</option>
 {roles.map(r => (
 <option key={r.id} value={r.id}>{r.name}</option>
 ))}
 </select>
 </div>

 <div className="flex items-center gap-1.5">
 <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Gym Branch:</span>
 <select
 value={gymFilter}
 onChange={(e) => setGymFilter(e.target.value)}
 className="bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-lg text-xs px-2.5 py-1 text-neutral-700 focus:outline-none"
 >
 <option value="all">All Branches</option>
 {gyms.map(g => (
 <option key={g.id} value={g.id}>{g.name}</option>
 ))}
 </select>
 </div>

 {(roleFilter !== 'all' || gymFilter !== 'all' || statusFilter !== 'all' || searchQuery !== '') && (
 <button
 onClick={() => {
 setRoleFilter('all');
 setGymFilter('all');
 setStatusFilter('all');
 setSearchQuery('');
 }}
 className="text-[10px] font-bold text-primary hover:text-primary hover:underline flex items-center gap-1 ml-auto cursor-pointer"
 >
 Clear Filters
 </button>
 )}
 </div>
 </div>

 {/* TABLE */}
 {loading ? (
 <div className="space-y-4">
 <div className="h-12 bg-neutral-50/40 rounded-2xl animate-pulse" />
 <div className="h-32 bg-neutral-50/40 rounded-2xl animate-pulse" />
 </div>
 ) : filteredInvitations.length === 0 ? (
 <div className="bg-white border border-neutral-100 rounded-3xl p-12 text-center flex flex-col items-center">
 <div className="w-12 h-12 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500 mb-4">
 <Mail size={20} />
 </div>
 <h3 className="text-sm font-bold text-neutral-900">No Invitations Found</h3>
 <p className="text-xs text-neutral-600 max-w-sm mt-1">Try tweaking your search keywords, clearing your filters, or invite a user into this organization workspace.</p>
 <button
 onClick={() => { setInviteDrawerOpen(true); setSuccessState(null); }}
 className="mt-4 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-xs font-bold text-white transition-colors cursor-pointer"
 >
 Invite User
 </button>
 </div>
 ) : (
 <div className="overflow-x-auto bg-white border border-neutral-100 rounded-3xl shadow-xl">
 <table className="w-full text-left border-collapse min-w-[900px]">
 <thead>
 <tr className="border-b border-neutral-100 text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 bg-neutral-50/40">
 <th className="py-4 px-6">Invitee</th>
 <th className="py-4 px-4">Role</th>
 <th className="py-4 px-4">Gym Access</th>
 <th className="py-4 px-4">Invited By</th>
 <th className="py-4 px-4">Sent Date</th>
 <th className="py-4 px-4">Expiry Date</th>
 <th className="py-4 px-4">Status</th>
 <th className="py-4 pr-6 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100/40 text-xs text-neutral-700">
 {filteredInvitations.map((invite) => {
 const statusStyles =
 invite.status === 'Accepted'
 ? 'bg-success-light text-success border-green-200'
 : invite.status === 'Pending'
 ? 'bg-primary-light text-primary border-primary/20 animate-pulse'
 : invite.status === 'Expired'
 ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
 : 'bg-danger-light text-danger border-red-200';

 return (
 <tr key={invite.id} className="hover:bg-neutral-50/20 group transition-colors">
 <td className="py-4 px-6">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center font-black text-[10px] text-primary">
 {invite.fullName ? invite.fullName.substring(0, 2).toUpperCase() : <Phone size={10} />}
 </div>
 <div>
 <span className="block font-black text-neutral-800">{invite.fullName || invite.phoneNumber}</span>
 {invite.fullName && <span className="block text-[9px] text-neutral-500 mt-0.5">{invite.phoneNumber}</span>}
 {invite.email && <span className="block text-[9px] text-neutral-500">{invite.email}</span>}
 </div>
 </div>
 </td>
 <td className="py-4 px-4">
 <span className="font-extrabold text-neutral-700">{invite.role.name}</span>
 </td>
 <td className="py-4 px-4">
 {invite.gymIds === 'all' ? (
 <span className="text-[10px] font-bold text-primary bg-primary-light border border-primary/20 px-2 py-0.5 rounded">All Branches</span>
 ) : (
 <div className="flex flex-wrap gap-1">
 {gyms
 .filter(g => invite.gymIds.includes(g.id))
 .map(g => (
 <span key={g.id} className="text-[9px] font-bold bg-neutral-50 border border-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
 {g.name}
 </span>
 ))}
 </div>
 )}
 </td>
 <td className="py-4 px-4 text-neutral-600">{invite.invitedBy}</td>
 <td className="py-4 px-4 text-neutral-600">{invite.sentDate}</td>
 <td className="py-4 px-4 text-neutral-600">{invite.expiryDate}</td>
 <td className="py-4 px-4">
 <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-black ${statusStyles}`}>
 {invite.status}
 </span>
 </td>
 <td className="py-4 pr-6 text-right">
 <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => { setSelectedInvite(invite); setDetailsDrawerOpen(true); }}
 className="p-1.5 rounded bg-neutral-50 hover:bg-neutral-50 border border-neutral-100 text-neutral-600 hover:text-neutral-900 cursor-pointer"
 title="View Details & Timeline"
 >
 <History size={12} />
 </button>
 {invite.status === 'Pending' && (
 <>
 <button
 onClick={() => handleCopyLink(invite.id)}
 className="p-1.5 rounded bg-neutral-50 hover:bg-neutral-50 border border-neutral-100 text-neutral-600 hover:text-neutral-900 cursor-pointer"
 title="Copy Invite Link"
 >
 <Copy size={12} />
 </button>
 <button
 onClick={() => handleResend(invite.id)}
 className="p-1.5 rounded bg-neutral-50 hover:bg-neutral-50 border border-neutral-100 text-neutral-600 hover:text-neutral-900 cursor-pointer"
 title="Resend SMS"
 >
 <Send size={12} />
 </button>
 </>
 )}
 <button
 onClick={() => { setSelectedInvite(invite); setCancelModalOpen(true); }}
 className="p-1.5 rounded bg-neutral-50 hover:bg-danger-light border border-neutral-100 text-neutral-500 hover:text-danger cursor-pointer"
 title="Delete Onboarding/Revoke Onboarding"
 >
 <Trash2 size={12} />
 </button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}

 {/* ========================================================================= */}
 {/* DRAWER: INVITE WIZARD */}
 {/* ========================================================================= */}
 {inviteDrawerOpen && (
 <div className="fixed inset-0 z-[100] overflow-hidden flex justify-end">
 <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setInviteDrawerOpen(false)} />

 <div className="relative w-full max-w-md bg-white border-l border-neutral-100 h-full shadow-2xl flex flex-col z-10 animate-slide-left">
 {/* Header */}
 <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/20">
 <div>
 <h3 className="font-extrabold text-sm text-neutral-900">Invite Team Member</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Wizard step {wizardStep} of 4</p>
 </div>
 <button onClick={() => setInviteDrawerOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 cursor-pointer">
 <X size={15} />
 </button>
 </div>

 {/* Success state override */}
 {successState ? (
 <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center text-center space-y-6">
 <div className="w-14 h-14 rounded-full bg-success-light border border-green-200 flex items-center justify-center text-success mx-auto">
 <CheckCircle2 size={28} className="animate-pulse" />
 </div>
 <div>
 <h4 className="font-black text-neutral-900 text-base">Invitation Dispatched!</h4>
 <p className="text-xs text-neutral-600 mt-1">Onboarding code was sent successfully to phone number.</p>
 </div>

 <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4 text-left space-y-2.5">
 <div className="text-xs text-neutral-600 flex justify-between">
 <span>Phone:</span>
 <span className="text-neutral-900 font-bold">{successState.phoneNumber}</span>
 </div>
 <div className="text-xs text-neutral-600 flex justify-between">
 <span>Assigned Role:</span>
 <span className="text-primary font-bold">{successState.roleName}</span>
 </div>
 <div className="text-xs text-neutral-600 flex justify-between">
 <span>Gym Scope:</span>
 <span className="text-neutral-800 truncate font-semibold">{successState.gyms.join(', ')}</span>
 </div>
 <div className="text-xs text-neutral-600 flex justify-between">
 <span>Expiry Date:</span>
 <span className="text-neutral-500">{successState.expiry} (7 days)</span>
 </div>
 </div>

 <div className="space-y-2 pt-4">
 <button
 onClick={() => handleCopyLink(successState.id)}
 className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-lg transition-colors cursor-pointer"
 >
 <Copy size={13} />
 <span>Copy Invitation Link</span>
 </button>
 <button
 onClick={() => handleResend(successState.id)}
 className="w-full py-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-colors cursor-pointer"
 >
 <span>Resend Notification SMS</span>
 </button>
 <button
 onClick={() => { setSuccessState(null); setWizardStep(1); }}
 className="w-full py-2 text-xs font-bold text-primary hover:underline cursor-pointer"
 >
 Invite Another User
 </button>
 </div>
 </div>
 ) : (
 /* WIZARD STEPS CONTENT */
 <div className="flex-1 flex flex-col justify-between overflow-hidden">
 {/* Form fields */}
 <div className="flex-1 overflow-y-auto p-5 space-y-6">
 {/* STEP 1: USER INFORMATION */}
 {wizardStep === 1 && (
 <div className="space-y-4 animate-fade-in">
 <div className="p-3 bg-primary-light border border-primary/20 rounded-xl text-[10px] text-primary font-semibold leading-relaxed flex gap-2">
 <Info size={14} className="shrink-0 mt-0.5" />
 <span>GymFlow invites users by phone number. They will receive an SMS containing a direct verification link.</span>
 </div>

 <div className="space-y-1">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Phone Number *</label>
 <input
 required
 type="tel"
 value={inviteForm.phoneNumber}
 onChange={(e) => setInviteForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
 placeholder="+15550000000"
 className="w-full bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
 />
 </div>

 <div className="space-y-1">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Full Name (Optional)</label>
 <input
 type="text"
 value={inviteForm.fullName}
 onChange={(e) => setInviteForm(prev => ({ ...prev, fullName: e.target.value }))}
 placeholder="Amal Dev"
 className="w-full bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
 />
 </div>

 <div className="space-y-1">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Email Address (Optional)</label>
 <input
 type="email"
 value={inviteForm.email}
 onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
 placeholder="amal.dev@example.com"
 className="w-full bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
 />
 </div>
 </div>
 )}

 {/* STEP 2: ROLE ASSIGNMENT */}
 {wizardStep === 2 && (
 <div className="space-y-4 animate-fade-in">
 <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Select Access Role:</span>

 <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
 {roles.map((role) => {
 const isSelected = inviteForm.roleId === role.id;
 return (
 <button
 key={role.id}
 type="button"
 onClick={() => setInviteForm(prev => ({ ...prev, roleId: role.id }))}
 className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex gap-3 ${
 isSelected
 ? 'bg-primary-light border-primary/20'
 : 'bg-neutral-50/60 border-neutral-100 hover:border-neutral-200'
 }`}
 >
 <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
 isSelected ? 'border-primary/20 bg-primary text-white' : 'border-neutral-200'
 }`}>
 {isSelected && <Check size={10} />}
 </div>
 <div>
 <span className={`block text-xs font-black ${isSelected ? 'text-primary' : 'text-neutral-800'}`}>
 {role.name}
 </span>
 <span className="block text-[10px] text-neutral-500 mt-1 leading-relaxed">
 {role.description || 'No description provided.'}
 </span>
 {role.permissions && role.permissions.length > 0 && (
 <div className="flex flex-wrap gap-1 mt-2.5">
 {role.permissions.slice(0, 3).map((p, idx) => (
 <span key={idx} className="text-[8px] font-bold bg-neutral-50 text-neutral-500 px-1 py-0.5 rounded">
 {p}
 </span>
 ))}
 {role.permissions.length > 3 && (
 <span className="text-[8px] font-bold text-primary py-0.5 px-1 bg-primary-light rounded">
 +{role.permissions.length - 3} more
 </span>
 )}
 </div>
 )}
 </div>
 </button>
 );
 })}
 </div>
 </div>
 )}

 {/* STEP 3: GYM BRANCH ACCESS */}
 {wizardStep === 3 && (
 <div className="space-y-4 animate-fade-in">
 <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Gym Branch Access Scopes:</span>

 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => setInviteForm(prev => ({ ...prev, gymSelectionType: 'all', selectedGyms: [] }))}
 className={`flex-1 p-3.5 rounded-2xl border text-center font-bold text-xs cursor-pointer transition-all ${
 inviteForm.gymSelectionType === 'all'
 ? 'bg-primary-light border-primary/20 text-primary'
 : 'bg-neutral-50/60 border-neutral-100 hover:border-neutral-200 text-neutral-600'
 }`}
 >
 All Gym Branches
 </button>
 <button
 type="button"
 onClick={() => setInviteForm(prev => ({ ...prev, gymSelectionType: 'specific' }))}
 className={`flex-1 p-3.5 rounded-2xl border text-center font-bold text-xs cursor-pointer transition-all ${
 inviteForm.gymSelectionType === 'specific'
 ? 'bg-primary-light border-primary/20 text-primary'
 : 'bg-neutral-50/60 border-neutral-100 hover:border-neutral-200 text-neutral-600'
 }`}
 >
 Specific Branches
 </button>
 </div>

 {inviteForm.gymSelectionType === 'specific' && (
 <div className="space-y-2 animate-fade-in">
 <span className="block text-[9px] font-black uppercase text-neutral-500 mb-1">Select Branches:</span>
 <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-1">
 {gyms.map((g) => {
 const isChecked = inviteForm.selectedGyms.includes(g.id);
 return (
 <button
 key={g.id}
 type="button"
 onClick={() => {
 if (isChecked) {
 setInviteForm(prev => ({ ...prev, selectedGyms: prev.selectedGyms.filter(id => id !== g.id) }));
 } else {
 setInviteForm(prev => ({ ...prev, selectedGyms: [...prev.selectedGyms, g.id] }));
 }
 }}
 className={`p-3 bg-neutral-50 border rounded-xl flex items-center justify-between text-left cursor-pointer transition-colors ${
 isChecked ? 'border-primary/20 bg-primary-light text-primary' : 'border-neutral-100 hover:border-neutral-200'
 }`}
 >
 <span className="text-xs font-bold">{g.name}</span>
 <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
 isChecked ? 'border-primary/20 bg-primary text-white' : 'border-neutral-200'
 }`}>
 {isChecked && <Check size={10} />}
 </div>
 </button>
 );
 })}
 </div>

 {/* Selection Chips Preview */}
 {inviteForm.selectedGyms.length > 0 && (
 <div className="flex flex-wrap gap-1.5 pt-2">
 {gyms
 .filter(g => inviteForm.selectedGyms.includes(g.id))
 .map(g => (
 <span key={g.id} className="text-[9px] font-bold bg-neutral-50 text-neutral-700 border border-neutral-200 px-2 py-0.5 rounded-full flex items-center gap-1.5">
 <MapPin size={8} />
 <span>{g.name}</span>
 </span>
 ))}
 </div>
 )}
 </div>
 )}

 <div className="space-y-1 pt-2">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Custom Onboarding Message (Optional)</label>
 <textarea
 value={inviteForm.message}
 onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
 placeholder="Hey, join our workspace team! Here is your access setup."
 rows={3}
 className="w-full bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-xl p-3 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all resize-none"
 />
 </div>
 </div>
 )}

 {/* STEP 4: INVITATION REVIEW */}
 {wizardStep === 4 && (
 <div className="space-y-4 animate-fade-in">
 <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Confirm Invitation Details:</span>

 <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4 space-y-4">
 <div>
 <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Invitee Information</span>
 <span className="block text-xs font-black text-neutral-800 mt-1">{inviteForm.fullName || 'No Name Provided'}</span>
 <span className="block text-xs font-semibold text-neutral-700 mt-0.5">{inviteForm.phoneNumber}</span>
 {inviteForm.email && <span className="block text-[10px] text-neutral-500 mt-0.5">{inviteForm.email}</span>}
 </div>

 <div className="border-t border-neutral-100 pt-3.5">
 <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Assigned Role</span>
 <span className="block text-xs font-extrabold text-primary mt-1">
 {roles.find(r => r.id === inviteForm.roleId)?.name || 'Role Not Selected'}
 </span>
 </div>

 <div className="border-t border-neutral-100 pt-3.5">
 <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Gym Scope Access</span>
 <span className="block text-xs font-bold text-neutral-800 mt-1">
 {inviteForm.gymSelectionType === 'all'
 ? 'All Gym Branches'
 : gyms.filter(g => inviteForm.selectedGyms.includes(g.id)).map(g => g.name).join(', ') || 'No Gym Branches Selected'}
 </span>
 </div>

 {inviteForm.message && (
 <div className="border-t border-neutral-100 pt-3.5">
 <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Personal Message</span>
 <p className="text-xs text-neutral-600 italic mt-1 leading-relaxed">"{inviteForm.message}"</p>
 </div>
 )}

 <div className="border-t border-neutral-100 pt-3.5 text-[10px] text-neutral-500 flex justify-between">
 <span>Expiration:</span>
 <span className="font-bold text-neutral-600">7 Days (Tokenized Link)</span>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Footer Controls */}
 <div className="p-5 border-t border-neutral-100 bg-neutral-50/20 flex gap-2.5">
 {wizardStep > 1 && (
 <button
 type="button"
 onClick={() => setWizardStep(prev => (prev - 1) as any)}
 className="flex-1 py-3 border border-neutral-200 hover:bg-neutral-50 text-xs font-bold text-neutral-700 rounded-xl transition-colors cursor-pointer"
 >
 Back
 </button>
 )}
 {wizardStep < 4 ? (
 <button
 type="button"
 disabled={
 (wizardStep === 1 && !inviteForm.phoneNumber.trim()) ||
 (wizardStep === 2 && !inviteForm.roleId) ||
 (wizardStep === 3 && inviteForm.gymSelectionType === 'specific' && inviteForm.selectedGyms.length === 0)
 }
 onClick={() => setWizardStep(prev => (prev + 1) as any)}
 className="flex-1 py-3 bg-neutral-50 hover:bg-neutral-50 border border-neutral-200 disabled:opacity-40 text-xs font-bold text-neutral-900 flex items-center justify-center gap-1.5 rounded-xl transition-colors cursor-pointer"
 >
 <span>Continue</span>
 <ArrowRight size={13} />
 </button>
 ) : (
 <button
 type="button"
 onClick={handleSendInvitation}
 className="flex-1 py-3 bg-primary hover:scale-[1.01] active:scale-[0.99] text-xs font-black text-white flex items-center justify-center gap-1.5 rounded-xl shadow-lg transition-transform cursor-pointer"
 >
 <span>Send Invitation</span>
 </button>
 )}
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* DRAWER: PENDING DETAILS & TIMELINE */}
 {/* ========================================================================= */}
 {detailsDrawerOpen && selectedInvite && (
 <div className="fixed inset-0 z-[100] overflow-hidden flex justify-end">
 <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setDetailsDrawerOpen(false)} />

 <div className="relative w-full max-w-md bg-white border-l border-neutral-100 h-full shadow-2xl flex flex-col z-10 animate-slide-left">
 <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/20">
 <div>
 <h3 className="font-extrabold text-sm text-neutral-900">Invitation Overview</h3>
 <span className="text-[10px] text-neutral-500">ID: {selectedInvite.id}</span>
 </div>
 <button onClick={() => setDetailsDrawerOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 cursor-pointer">
 <X size={15} />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto p-5 space-y-6">
 {/* Invitee Contact Info Card */}
 <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4 space-y-3.5">
 <div>
 <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Invitee Contact details</span>
 <span className="block text-xs font-black text-neutral-900 mt-1">{selectedInvite.fullName || 'No Name Provided'}</span>
 <span className="block text-xs font-semibold text-neutral-700 mt-0.5">{selectedInvite.phoneNumber}</span>
 {selectedInvite.email && <span className="block text-[10px] text-neutral-500 mt-0.5">{selectedInvite.email}</span>}
 </div>

 <div className="border-t border-neutral-100 pt-3 flex justify-between">
 <div>
 <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Assigned Role</span>
 <span className="block text-xs font-extrabold text-primary mt-1">{selectedInvite.role.name}</span>
 </div>
 <div className="text-right">
 <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Status</span>
 <span className="inline-block px-2 py-0.5 bg-primary-light text-primary border border-primary/20 rounded-full text-[9px] font-black mt-1">
 {selectedInvite.status}
 </span>
 </div>
 </div>

 <div className="border-t border-neutral-100 pt-3">
 <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Gym Branch Access Scope</span>
 <span className="block text-xs font-bold text-neutral-800 mt-1">
 {selectedInvite.gymIds === 'all'
 ? 'All Gym Branches'
 : gyms.filter(g => selectedInvite.gymIds.includes(g.id)).map(g => g.name).join(', ') || 'No Gym Branches Selected'}
 </span>
 </div>
 </div>

 {/* Action buttons (if Pending) */}
 {selectedInvite.status === 'Pending' && (
 <div className="flex gap-2">
 <button
 onClick={() => handleCopyLink(selectedInvite.id)}
 className="flex-1 py-2 bg-neutral-50 hover:bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 flex items-center justify-center gap-1 cursor-pointer transition-colors"
 >
 <Copy size={12} />
 <span>Copy Link</span>
 </button>
 <button
 onClick={() => handleResend(selectedInvite.id)}
 className="flex-1 py-2 bg-neutral-50 hover:bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 flex items-center justify-center gap-1 cursor-pointer transition-colors"
 >
 <Send size={12} />
 <span>Resend SMS</span>
 </button>
 </div>
 )}

 {/* ACTIVITY TIMELINE */}
 <div className="space-y-4">
 <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Activity Timeline Tracker:</span>

 <div className="relative border-l border-neutral-200 pl-4.5 ml-2.5 space-y-5">
 {/* Timeline Node: Created */}
 <div className="relative">
 <div className="absolute -left-7 top-0.5 w-3 h-3 rounded-full bg-primary border border-neutral-100 flex items-center justify-center" />
 <div className="text-xs font-black text-neutral-800">Invitation Created</div>
 <div className="text-[10px] text-neutral-500 mt-0.5">Dispatched by {selectedInvite.invitedBy}</div>
 <div className="text-[9px] text-neutral-400 mt-1">{selectedInvite.sentDate}</div>
 </div>

 {/* Timeline Node: Viewed */}
 <div className="relative">
 <div className={`absolute -left-7 top-0.5 w-3 h-3 rounded-full border border-neutral-100 flex items-center justify-center ${
 selectedInvite.viewedAt ? 'bg-primary' : 'bg-neutral-50'
 }`} />
 <div className={`text-xs font-black ${selectedInvite.viewedAt ? 'text-neutral-800' : 'text-neutral-500'}`}>Invitation Viewed</div>
 {selectedInvite.viewedAt ? (
 <>
 <div className="text-[10px] text-neutral-600 mt-0.5">Invitee opened the onboarding landing page.</div>
 <div className="text-[9px] text-neutral-400 mt-1">{selectedInvite.viewedAt}</div>
 </>
 ) : (
 <div className="text-[10px] text-neutral-400 mt-0.5">Not yet opened by invitee.</div>
 )}
 </div>

 {/* Timeline Node: Accept / Decline / Cancel */}
 {selectedInvite.status === 'Accepted' && (
 <div className="relative">
 <div className="absolute -left-7 top-0.5 w-3 h-3 rounded-full bg-success border border-neutral-100 flex items-center justify-center" />
 <div className="text-xs font-black text-success">Invitation Accepted</div>
 <div className="text-[10px] text-neutral-600 mt-0.5">User successfully verified OTP and joined workspace.</div>
 <div className="text-[9px] text-neutral-400 mt-1">{selectedInvite.acceptedAt}</div>
 </div>
 )}

 {selectedInvite.status === 'Rejected' && (
 <div className="relative">
 <div className="absolute -left-7 top-0.5 w-3 h-3 rounded-full bg-danger border border-neutral-100 flex items-center justify-center" />
 <div className="text-xs font-black text-danger">Invitation Declined</div>
 <div className="text-[10px] text-neutral-600 mt-0.5">User rejected the workspace invitation.</div>
 <div className="text-[9px] text-neutral-400 mt-1">{selectedInvite.declinedAt}</div>
 </div>
 )}

 {selectedInvite.status === 'Cancelled' && (
 <div className="relative">
 <div className="absolute -left-7 top-0.5 w-3 h-3 rounded-full bg-danger border border-neutral-100 flex items-center justify-center" />
 <div className="text-xs font-black text-danger">Invitation Cancelled</div>
 <div className="text-[10px] text-neutral-600 mt-0.5">Workspace administrator revoked invitation access.</div>
 <div className="text-[9px] text-neutral-400 mt-1">{selectedInvite.cancelledAt}</div>
 </div>
 )}

 {selectedInvite.status === 'Expired' && (
 <div className="relative">
 <div className="absolute -left-7 top-0.5 w-3 h-3 rounded-full bg-indigo-500 border border-neutral-100 flex items-center justify-center" />
 <div className="text-xs font-black text-indigo-400">Invitation Expired</div>
 <div className="text-[10px] text-neutral-500 mt-0.5">Token expired before verification.</div>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* DIALOG: DELETE CONFIRMATION */}
 {/* ========================================================================= */}
 {cancelModalOpen && selectedInvite && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
 <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCancelModalOpen(false)} />

 <div className="relative w-full max-w-sm bg-white border border-neutral-200 rounded-3xl p-6 z-10 shadow-2xl text-center space-y-4 animate-scale-up">
 <div className="w-12 h-12 rounded-full bg-danger-light border border-red-200 flex items-center justify-center text-danger mx-auto">
 <Trash2 size={24} />
 </div>

 <div className="space-y-1">
 <h4 className="font-extrabold text-sm text-neutral-900">Delete Onboarding Invitation</h4>
 <p className="text-xs text-neutral-600 leading-relaxed">
 Are you sure you want to delete the onboarding invitation for <b className="text-neutral-800">'{selectedInvite.fullName || selectedInvite.phoneNumber}'</b>? This invitation token will no longer be valid.
 </p>
 </div>

 <div className="flex gap-2.5 pt-2">
 <button
 onClick={() => setCancelModalOpen(false)}
 className="flex-1 py-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-colors cursor-pointer"
 >
 Keep Invitation
 </button>
 <button
 onClick={handleCancelConfirm}
 className="flex-1 py-2.5 rounded-xl bg-danger hover:bg-red-600 text-xs font-bold text-white transition-colors cursor-pointer"
 >
 Delete Onboarding Invitation
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
