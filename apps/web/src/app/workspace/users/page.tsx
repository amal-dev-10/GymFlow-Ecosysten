'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { orgUsersApi, rolesApi, gymApi } from '../../../lib/api';
import { Tabs } from '../../../components/ui';
import {
 Users,
 Search,
 Plus,
 X,
 Check,
 Copy,
 Trash2,
 Lock,
 MapPin,
 History,
 UserCheck,
 RefreshCw,
 Edit,
 CheckSquare,
 Square,
 AlertCircle,
 Mail,
 Phone,
 Clock,
 ShieldCheck,
 Download
} from 'lucide-react';

interface UserItem {
 id: string;
 name: string;
 phone: string;
 email: string;
 role: {
 id: string;
 name: string;
 category: string;
 isSystem: boolean;
 };
 roles?: {
 id: string;
 name: string;
 category: string;
 isSystem: boolean;
 }[];
 gyms: { id: string; name: string }[];
 status: 'active' | 'inactive';
 joinedDate: string;
 lastActive: string;
}

interface InvitationItem {
 id: string;
 phoneNumber: string;
 role: {
 id: string;
 name: string;
 };
 roles?: {
 id: string;
 name: string;
 }[];
 invitedBy: string;
 sentDate: string;
 expiryDate: string;
 status: 'Pending' | 'Accepted' | 'Expired';
}

interface GymBranch {
 id: string;
 name: string;
}

interface RoleItem {
 id: string;
 name: string;
 description: string;
 category: string;
 isSystem: boolean;
 permissions: string[];
}

interface UserDetails {
 id: string;
 name: string;
 phone: string;
 email: string;
 role: {
 id: string;
 name: string;
 category: string;
 isSystem: boolean;
 description: string;
 };
 roles?: {
 id: string;
 name: string;
 category: string;
 isSystem: boolean;
 description: string;
 }[];
 gyms: { id: string; name: string }[];
 status: 'active' | 'inactive';
 joinedDate: string;
 lastActive: string;
 permissions: string[];
 activityLog: {
 id: string;
 timestamp: string;
 action: string;
 user: string;
 details: string;
 }[];
}

interface SuccessInviteDetails {
 phoneNumber: string;
 assignedRole: string;
 expiryDate: string;
 link: string;
}

function OrganizationUsersContent() {
 // States
 const [users, setUsers] = useState<UserItem[]>([]);
 const [invitations, setInvitations] = useState<InvitationItem[]>([]);
 const [roles, setRoles] = useState<RoleItem[]>([]);
 const [gyms, setGyms] = useState<GymBranch[]>([]);
 const [stats, setStats] = useState({
 totalUsers: 0,
 activeUsers: 0,
 pendingInvitations: 0,
 rolesInUse: 0,
 });

 const [loading, setLoading] = useState(true);
 const searchParams = useSearchParams();
 const initialTab = (searchParams.get('tab') as 'users' | 'invitations') || 'users';
 const [activeTab, setActiveTab] = useState<'users' | 'invitations'>(initialTab);
 const [searchQuery, setSearchQuery] = useState('');
 const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
 const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
 const [selectedGymFilter, setSelectedGymFilter] = useState('all');
 const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 // Drawers & Modals States
 const [inviteDrawerOpen, setInviteDrawerOpen] = useState(false);
 const [userDetailsOpen, setUserDetailsOpen] = useState(false);
 const [changeRoleModalOpen, setChangeRoleModalOpen] = useState(false);
 const [gymAccessModalOpen, setGymAccessModalOpen] = useState(false);
 const [bulkActionOpen, setBulkActionOpen] = useState(false);
 const [removeUserOpen, setRemoveUserOpen] = useState(false);
 const [successInviteDetails, setSuccessInviteDetails] = useState<SuccessInviteDetails | null>(null);

 // Targeted data records
 const [selectedUserRecord, setSelectedUserRecord] = useState<UserItem | null>(null);
 const [selectedUserRecordDetails, setSelectedUserRecordDetails] = useState<UserDetails | null>(null);
 const [detailsTab, setDetailsTab] = useState<'overview' | 'permissions' | 'gyms' | 'activity'>('overview');

 // Form Fields
 const [invitePhone, setInvitePhone] = useState('');
 const [inviteRoleId, setInviteRoleId] = useState('');
 const [inviteRoleIds, setInviteRoleIds] = useState<string[]>([]);
 const [inviteGymIds, setInviteGymIds] = useState<string[]>([]);
 const [inviteMessage, setInviteMessage] = useState('');
 
 const [changeRoleId, setChangeRoleId] = useState('');
 const [changeRoleIds, setChangeRoleIds] = useState<string[]>([]);
 const [changeGymIds, setChangeGymIds] = useState<string[]>([]);

 // Load Data
 const loadData = React.useCallback(async () => {
 const activeOrgId = localStorage.getItem('organizationId');
 if (!activeOrgId) return;
 setLoading(true);

 try {
 const [statsData, usersData, invitesData, rolesData, gymsData] = await Promise.all([
 orgUsersApi.getStats(),
 orgUsersApi.list(),
 orgUsersApi.getInvitations(),
 rolesApi.list(),
 gymApi.list(activeOrgId),
 ]);

 setStats(statsData);
 setUsers(usersData);
 setInvitations(invitesData);
 setRoles(rolesData);
 setGyms(gymsData);
 } catch (err: unknown) {
 const errMsg = err instanceof Error ? err.message : 'Failed to load team data';
 showToast(errMsg, 'error');
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

 // Export Users
 const handleExportUsers = () => {
 const csvContent ="data:text/csv;charset=utf-8," 
 + ["Name,Phone,Email,Role,Status,Joined Date"].join(",") +"\n"
 + users.map(u => `"${u.name}","${u.phone}","${u.email}","${u.role.name}","${u.status}","${u.joinedDate}"`).join("\n");
 const encodedUri = encodeURI(csvContent);
 const link = document.createElement("a");
 link.setAttribute("href", encodedUri);
 link.setAttribute("download", `gymflow_users_${new Date().toISOString().split('T')[0]}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 showToast('User list exported successfully', 'success');
 };

 // Invite User Submit
 const handleInviteUserSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!invitePhone.trim() || inviteRoleIds.length === 0) {
 showToast('Please fill in phone number and select at least one role', 'error');
 return;
 }

 try {
 const inviteResult = await orgUsersApi.inviteUser({
 phoneNumber: invitePhone,
 roleId: inviteRoleIds[0],
 roleIds: inviteRoleIds,
 gymIds: inviteGymIds,
 message: inviteMessage,
 });

 const selectedRoleNames = roles.filter(r => inviteRoleIds.includes(r.id)).map(r => r.name).join(', ');

 setSuccessInviteDetails({
 phoneNumber: invitePhone,
 assignedRole: selectedRoleNames || 'Staff',
 expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
 link: `https://gymflow.app/accept-invite?token=${inviteResult.id}`,
 });

 setInvitePhone('');
 setInviteRoleIds([]);
 setInviteGymIds([]);
 setInviteMessage('');
 
 loadData();
 } catch (err: unknown) {
 const errMsg = err instanceof Error ? err.message : 'Failed to invite user';
 showToast(errMsg, 'error');
 }
 };

 // Resend Invitation
 const handleResendInvite = async (id: string) => {
 try {
 await orgUsersApi.resendInvitation(id);
 showToast('Invitation successfully resent and extended!', 'success');
 loadData();
 } catch {
 showToast('Failed to resend invitation', 'error');
 }
 };

 // Cancel Invitation
 const handleCancelInvite = async (id: string) => {
 try {
 await orgUsersApi.deleteInvitation(id);
 showToast('Invitation cancelled successfully', 'success');
 loadData();
 } catch {
 showToast('Failed to cancel invitation', 'error');
 }
 };

 // Open Details Drawer
 const handleOpenDetails = async (user: UserItem) => {
 setSelectedUserRecord(user);
 setDetailsTab('overview');
 setUserDetailsOpen(true);
 try {
 const details = await orgUsersApi.getDetails(user.id);
 setSelectedUserRecordDetails(details);
 } catch {
 showToast('Failed to fetch detailed profile information', 'error');
 }
 };

 // Save Role Changes
 const handleSaveRoleChange = async () => {
 if (!selectedUserRecord || changeRoleIds.length === 0) return;
 try {
 await orgUsersApi.changeRole(selectedUserRecord.id, changeRoleIds[0], changeRoleIds);
 showToast('User roles successfully updated', 'success');
 setChangeRoleModalOpen(false);
 loadData();
 } catch (err: unknown) {
 const errMsg = err instanceof Error ? err.message : 'Failed to update user role';
 showToast(errMsg, 'error');
 }
 };

 // Save Gym Access Changes
 const handleSaveGymAccess = async () => {
 if (!selectedUserRecord) return;
 try {
 await orgUsersApi.assignGyms(selectedUserRecord.id, changeGymIds);
 showToast('Gym branch assignments updated', 'success');
 setGymAccessModalOpen(false);
 loadData();
 } catch (err: unknown) {
 const errMsg = err instanceof Error ? err.message : 'Failed to update gym access';
 showToast(errMsg, 'error');
 }
 };

 // Toggle user active status
 const handleToggleUserStatus = async (user: UserItem) => {
 const nextStatus = user.status === 'active' ? false : true;
 try {
 await orgUsersApi.toggleStatus(user.id, nextStatus);
 showToast(`User workspace access ${nextStatus ? 'enabled' : 'deactivated'}`, 'success');
 loadData();
 } catch (err: unknown) {
 const errMsg = err instanceof Error ? err.message : 'Failed to toggle status';
 showToast(errMsg, 'error');
 }
 };

 // Remove user confirmation
 const handleRemoveUserConfirm = async () => {
 if (!selectedUserRecord) return;
 try {
 await orgUsersApi.removeUser(selectedUserRecord.id);
 showToast('User successfully removed from the organization', 'success');
 setRemoveUserOpen(false);
 loadData();
 } catch (err: unknown) {
 const errMsg = err instanceof Error ? err.message : 'Failed to remove user';
 showToast(errMsg, 'error');
 }
 };

 // Bulk Assign Submit
 const handleBulkUpdateSubmit = async () => {
 if (selectedUsers.length === 0) return;
 try {
 await orgUsersApi.bulkUpdate({
 userIds: selectedUsers,
 roleId: changeRoleIds.length > 0 ? changeRoleIds[0] : undefined,
 roleIds: changeRoleIds.length > 0 ? changeRoleIds : undefined,
 gymIds: changeGymIds.length > 0 ? changeGymIds : undefined,
 });
 showToast('Bulk update applied successfully', 'success');
 setBulkActionOpen(false);
 setSelectedUsers([]);
 setChangeRoleId('');
 setChangeRoleIds([]);
 setChangeGymIds([]);
 loadData();
 } catch (err: unknown) {
 const errMsg = err instanceof Error ? err.message : 'Bulk assignment failed';
 showToast(errMsg, 'error');
 }
 };

 // Helper toggle checkbox selection
 const handleToggleSelectUser = (id: string) => {
 if (selectedUsers.includes(id)) {
 setSelectedUsers(prev => prev.filter(uid => uid !== id));
 } else {
 setSelectedUsers(prev => [...prev, id]);
 }
 };

 const handleSelectAllUsers = () => {
 if (selectedUsers.length === filteredUsers.length) {
 setSelectedUsers([]);
 } else {
 setSelectedUsers(filteredUsers.map(u => u.id));
 }
 };

 // Get lists and filtered records
 const filteredUsers = users.filter(user => {
 const matchesSearch = 
 user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 user.phone.includes(searchQuery) ||
 user.email.toLowerCase().includes(searchQuery.toLowerCase());
 
 const matchesRole = selectedRoleFilter === 'all' || user.role.id === selectedRoleFilter;
 const matchesStatus = selectedStatusFilter === 'all' || user.status === selectedStatusFilter;
 const matchesGym = selectedGymFilter === 'all' || user.gyms.some(g => g.id === selectedGymFilter);

 return matchesSearch && matchesRole && matchesStatus && matchesGym;
 });

 const filteredInvitations = invitations.filter(invite => {
 const matchesSearch = invite.phoneNumber.includes(searchQuery);
 const matchesRole = selectedRoleFilter === 'all' || invite.role.id === selectedRoleFilter;
 const matchesStatus = selectedStatusFilter === 'all' || invite.status.toLowerCase() === selectedStatusFilter.toLowerCase();
 return matchesSearch && matchesRole && matchesStatus;
 });

 // Access Permission preview mappings based on typical roles
 const getPermissionDifferences = (targetRoleId: string) => {
 const role = roles.find(r => r.id === targetRoleId);
 if (!role) return { can: [], cannot: [] };

 // Standard items
 const allModules = ['Members', 'Workouts', 'Diet Plans', 'Billing', 'Expenses', 'Role Management'];
 
 let can: string[] = [];
 let cannot: string[] = [];

 if (role.name === 'Organization Owner') {
 can = allModules;
 } else if (role.name === 'Manager') {
 can = ['Members', 'Workouts', 'Diet Plans'];
 cannot = ['Billing', 'Expenses', 'Role Management'];
 } else if (role.name === 'Trainer') {
 can = ['Members', 'Workouts', 'Diet Plans'];
 cannot = ['Billing', 'Expenses', 'Role Management'];
 } else if (role.name === 'Receptionist') {
 can = ['Members', 'Workouts'];
 cannot = ['Diet Plans', 'Billing', 'Expenses', 'Role Management'];
 } else if (role.name === 'Accountant') {
 can = ['Billing', 'Expenses'];
 cannot = ['Members', 'Workouts', 'Diet Plans', 'Role Management'];
 } else {
 can = ['Members'];
 cannot = ['Workouts', 'Diet Plans', 'Billing', 'Expenses', 'Role Management'];
 }

 return { can, cannot };
 };

 return (
 <div className="relative min-h-full">
 {/* TOAST ALERTS */}
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

 {/* HEADER BAR */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
 <div>
 <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Organization Users</h1>
 <p className="text-xs text-neutral-600 mt-1">Manage users, invitations, and gym access controls within your workspace.</p>
 </div>
 <div className="flex items-center gap-2.5">
 <button 
 onClick={handleExportUsers}
 className="px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-100 hover:border-neutral-200 text-xs font-bold text-neutral-700 hover:text-neutral-900 flex items-center gap-1.5 transition-all"
 >
 <Download size={13} />
 <span>Export Users</span>
 </button>
 <button 
 onClick={() => { setInviteDrawerOpen(true); setSuccessInviteDetails(null); }}
 className="px-3.5 py-2 rounded-xl bg-primary hover:scale-[1.02] active:scale-[0.98] text-xs font-black text-white flex items-center gap-1.5 transition-all shadow-lg"
 >
 <Plus size={13} />
 <span>Invite User</span>
 </button>
 </div>
 </div>

 {/* STATISTICS ROW */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
 {[
 { label: 'Total Users', val: stats.totalUsers, desc: 'Joined team members', icon: Users, color: 'bg-primary-light border-primary/20 text-primary' },
 { label: 'Active Users', val: stats.activeUsers, desc: 'Currently enabled access', icon: UserCheck, color: 'bg-primary-light border-green-200 text-success' },
 { label: 'Pending Invites', val: stats.pendingInvitations, desc: 'Awaiting phone verification', icon: Clock, color: 'from-indigo-500/20 to-indigo-600/5 border-indigo-500/20 text-indigo-400' },
 { label: 'Roles In Use', val: stats.rolesInUse, desc: 'Configured role scopes', icon: ShieldCheck, color: 'bg-primary-light border-red-200 text-danger' },
 ].map((card, i) => (
 <div key={i} className={`p-4 bg-neutral-50/30 border rounded-2xl bg-gradient-to-br transition-transform hover:-translate-y-0.5 ${card.color}`}>
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-600">{card.label}</span>
 <card.icon size={16} />
 </div>
 <div className="text-2xl font-black text-neutral-900 mt-2">{card.val}</div>
 <span className="text-[9px] text-neutral-500 mt-1 block">{card.desc}</span>
 </div>
 ))}
 </div>

 {/* FILTER & TAB NAVIGATION */}
 <div className="bg-white border border-neutral-100 rounded-3xl p-5 mb-8">
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-100 pb-4 mb-5">
 <Tabs
 scrollable={false}
 tabs={[
 { id: 'users', label: `Active Users (${users.length})` },
 { id: 'invitations', label: `Pending Invitations (${invitations.length})` },
 ]}
 activeId={activeTab}
 onChange={(id) => { setActiveTab(id as any); setSelectedStatusFilter('all'); setSearchQuery(''); }}
 />

 {/* SEARCH BAR */}
 <div className="relative flex-1 max-w-sm">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={13} />
 <input
 type="text"
 placeholder={activeTab === 'users' ?"Search users by name, phone or email..." :"Search invitations by phone number..."}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-xl pl-9.5 pr-4 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none"
 />
 </div>
 </div>

 {/* FILTERS PANEL */}
 <div className="flex flex-wrap items-center gap-3">
 <div className="flex items-center gap-1.5">
 <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Role:</span>
 <select
 value={selectedRoleFilter}
 onChange={(e) => setSelectedRoleFilter(e.target.value)}
 className="bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-lg text-xs px-2.5 py-1 text-neutral-700 focus:outline-none"
 >
 <option value="all">All Roles</option>
 {roles.map(r => (
 <option key={r.id} value={r.id}>{r.name}</option>
 ))}
 </select>
 </div>

 {activeTab === 'users' && (
 <>
 <div className="flex items-center gap-1.5">
 <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Status:</span>
 <select
 value={selectedStatusFilter}
 onChange={(e) => setSelectedStatusFilter(e.target.value)}
 className="bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-lg text-xs px-2.5 py-1 text-neutral-700 focus:outline-none"
 >
 <option value="all">All Status</option>
 <option value="active">Active</option>
 <option value="inactive">Inactive</option>
 </select>
 </div>

 <div className="flex items-center gap-1.5">
 <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Gym Branch:</span>
 <select
 value={selectedGymFilter}
 onChange={(e) => setSelectedGymFilter(e.target.value)}
 className="bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-lg text-xs px-2.5 py-1 text-neutral-700 focus:outline-none"
 >
 <option value="all">All Branches</option>
 {gyms.map(g => (
 <option key={g.id} value={g.id}>{g.name}</option>
 ))}
 </select>
 </div>
 </>
 )}

 {activeTab === 'invitations' && (
 <div className="flex items-center gap-1.5">
 <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Status:</span>
 <select
 value={selectedStatusFilter}
 onChange={(e) => setSelectedStatusFilter(e.target.value)}
 className="bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-lg text-xs px-2.5 py-1 text-neutral-700 focus:outline-none"
 >
 <option value="all">All Statuses</option>
 <option value="pending">Pending</option>
 <option value="accepted">Accepted</option>
 <option value="expired">Expired</option>
 </select>
 </div>
 )}

 {(selectedRoleFilter !== 'all' || selectedStatusFilter !== 'all' || selectedGymFilter !== 'all' || searchQuery !== '') && (
 <button
 onClick={() => {
 setSelectedRoleFilter('all');
 setSelectedStatusFilter('all');
 setSelectedGymFilter('all');
 setSearchQuery('');
 }}
 className="text-[10px] font-bold text-primary hover:text-primary hover:underline flex items-center gap-1 ml-auto"
 >
 Clear Filters
 </button>
 )}
 </div>
 </div>

 {/* BULK SELECTION ACTION BAR */}
 {selectedUsers.length > 0 && (
 <div className="sticky bottom-6 left-0 right-0 bg-white border border-primary/20 shadow-2xl rounded-2xl p-4 flex items-center justify-between z-40 animate-slide-up mb-8">
 <div className="flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
 <span className="text-xs font-bold text-neutral-900">{selectedUsers.length} Users Selected</span>
 </div>
 <div className="flex items-center gap-2.5">
 <button
 onClick={() => {
 setChangeRoleId('');
 setChangeRoleIds([]);
 setChangeGymIds([]);
 setBulkActionOpen(true);
 }}
 className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-[11px] font-bold transition-all"
 >
 Bulk Assign Role & Branch
 </button>
 <button
 onClick={() => setSelectedUsers([])}
 className="text-neutral-600 hover:text-neutral-900 text-xs px-2"
 >
 Cancel
 </button>
 </div>
 </div>
 )}

 {/* SKELETON LOADING STATE */}
 {loading ? (
 <div className="space-y-4">
 <div className="h-12 bg-neutral-50/40 rounded-2xl animate-pulse" />
 <div className="h-40 bg-neutral-50/40 rounded-2xl animate-pulse" />
 <div className="h-40 bg-neutral-50/40 rounded-2xl animate-pulse" />
 </div>
 ) : activeTab === 'users' ? (
 /* ACTIVE USERS TABLE */
 filteredUsers.length === 0 ? (
 /* EMPTY STATE */
 <div className="bg-white border border-neutral-100 rounded-3xl p-10 text-center flex flex-col items-center">
 <div className="w-12 h-12 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500 mb-4">
 <Users size={20} />
 </div>
 <h3 className="text-sm font-bold text-neutral-900">No Users Found</h3>
 <p className="text-xs text-neutral-600 max-w-sm mt-1">Try modifying your filters or inviting a new team member to this organization.</p>
 <button 
 onClick={() => setInviteDrawerOpen(true)}
 className="mt-4 px-4 py-2 rounded-xl bg-primary text-xs font-bold text-white hover:bg-primary-hover"
 >
 Invite First User
 </button>
 </div>
 ) : (
 <div className="overflow-x-auto bg-white border border-neutral-100 rounded-3xl shadow-xl">
 <table className="w-full text-left border-collapse min-w-[900px]">
 <thead>
 <tr className="border-b border-neutral-100 text-[10px] font-extrabold uppercase tracking-wider text-neutral-600 bg-neutral-50/40">
 <th className="py-4 pl-6 w-12 select-none">
 <button onClick={handleSelectAllUsers} className="text-neutral-500 hover:text-neutral-900">
 {selectedUsers.length === filteredUsers.length ? (
 <CheckSquare size={14} className="text-primary" />
 ) : (
 <Square size={14} />
 )}
 </button>
 </th>
 <th className="py-4 px-4">User Details</th>
 <th className="py-4 px-4">Contact Info</th>
 <th className="py-4 px-4">Workspace Role</th>
 <th className="py-4 px-4">Assigned Gyms</th>
 <th className="py-4 px-4">Status</th>
 <th className="py-4 px-4">Joined Date</th>
 <th className="py-4 pr-6 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100/50 text-xs text-neutral-700">
 {filteredUsers.map((user) => (
 <tr key={user.id} className="hover:bg-neutral-50/20 group transition-colors">
 <td className="py-4 pl-6">
 <button onClick={() => handleToggleSelectUser(user.id)} className="text-neutral-500 hover:text-neutral-900">
 {selectedUsers.includes(user.id) ? (
 <CheckSquare size={14} className="text-primary" />
 ) : (
 <Square size={14} />
 )}
 </button>
 </td>
 <td className="py-4 px-4">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center font-black text-[10px] text-primary">
 {user.name.substring(0, 2).toUpperCase()}
 </div>
 <div>
 <span className="block font-black text-neutral-800">{user.name}</span>
 <span className="block text-[10px] text-neutral-500 mt-0.5">ID: {user.id.substring(0, 8)}...</span>
 </div>
 </div>
 </td>
 <td className="py-4 px-4 space-y-0.5">
 <span className="block text-neutral-800 flex items-center gap-1">
 <Phone size={10} className="text-neutral-500" />
 {user.phone}
 </span>
 {user.email && (
 <span className="block text-[10px] text-neutral-500 flex items-center gap-1">
 <Mail size={10} className="text-neutral-500" />
 {user.email}
 </span>
 )}
 </td>
 <td className="py-4 px-4">
 <div className="flex flex-wrap gap-1">
 {(user.roles && user.roles.length > 0 ? user.roles : [user.role]).map((r: any) => (
 <span key={r.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
 r.isSystem 
 ? 'bg-primary-light text-primary border border-primary/20' 
 : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
 }`}>
 {r.isSystem && <Lock size={8} />}
 {r.name}
 </span>
 ))}
 </div>
 </td>
 <td className="py-4 px-4">
 {user.gyms.length === 0 ? (
 <span className="text-[10px] text-neutral-500 italic">No assigned branches</span>
 ) : (
 <div className="flex flex-wrap gap-1">
 {user.gyms.map((g) => (
 <span key={g.id} className="text-[9px] font-bold bg-neutral-50 border border-neutral-100 px-1.5 py-0.5 rounded text-neutral-600">
 {g.name}
 </span>
 ))}
 </div>
 )}
 </td>
 <td className="py-4 px-4">
 <button 
 onClick={() => handleToggleUserStatus(user)}
 className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
 user.status === 'active' 
 ? 'bg-success-light text-success hover:bg-success-light' 
 : 'bg-danger-light text-danger hover:bg-danger-light'
 }`}
 >
 <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-success' : 'bg-danger'}`} />
 <span className="capitalize">{user.status}</span>
 </button>
 </td>
 <td className="py-4 px-4 text-neutral-600">{user.joinedDate}</td>
 <td className="py-4 pr-6 text-right">
 <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => handleOpenDetails(user)}
 className="p-1.5 rounded bg-neutral-50 hover:bg-neutral-50 border border-neutral-100 text-neutral-600 hover:text-neutral-900"
 title="View Details"
 >
 <History size={12} />
 </button>
 <button
 onClick={() => {
 setSelectedUserRecord(user);
 setChangeRoleId(user.role.id);
 setChangeRoleIds(user.roles ? user.roles.map((r: any) => r.id) : [user.role.id]);
 setChangeRoleModalOpen(true);
 }}
 className="p-1.5 rounded bg-neutral-50 hover:bg-neutral-50 border border-neutral-100 text-neutral-600 hover:text-neutral-900"
 title="Change Role"
 >
 <Edit size={12} />
 </button>
 <button
 onClick={() => {
 setSelectedUserRecord(user);
 setChangeGymIds(user.gyms.map(g => g.id));
 setGymAccessModalOpen(true);
 }}
 className="p-1.5 rounded bg-neutral-50 hover:bg-neutral-50 border border-neutral-100 text-neutral-600 hover:text-neutral-900"
 title="Assign Gym Access"
 >
 <MapPin size={12} />
 </button>
 <button
 onClick={() => {
 setSelectedUserRecord(user);
 setRemoveUserOpen(true);
 }}
 className="p-1.5 rounded bg-neutral-50/80 hover:bg-danger-light border border-neutral-100 text-neutral-500 hover:text-danger"
 title="Remove From Org"
 >
 <Trash2 size={12} />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )
 ) : (
 /* PENDING INVITATIONS TAB */
 filteredInvitations.length === 0 ? (
 <div className="bg-white border border-neutral-100 rounded-3xl p-10 text-center flex flex-col items-center">
 <div className="w-12 h-12 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500 mb-4">
 <Mail size={20} />
 </div>
 <h3 className="text-sm font-bold text-neutral-900">No Pending Invitations</h3>
 <p className="text-xs text-neutral-600 max-w-sm mt-1">There are no active invitations waiting for acceptance right now.</p>
 </div>
 ) : (
 <div className="overflow-x-auto bg-white border border-neutral-100 rounded-3xl shadow-xl">
 <table className="w-full text-left border-collapse min-w-[700px]">
 <thead>
 <tr className="border-b border-neutral-100 text-[10px] font-extrabold uppercase tracking-wider text-neutral-600 bg-neutral-50/40">
 <th className="py-4 pl-6">Invited Phone</th>
 <th className="py-4 px-4">Assigned Role</th>
 <th className="py-4 px-4">Invited By</th>
 <th className="py-4 px-4">Sent Date</th>
 <th className="py-4 px-4">Expiry Date</th>
 <th className="py-4 px-4">Status</th>
 <th className="py-4 pr-6 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100/50 text-xs text-neutral-700">
 {filteredInvitations.map((invite) => (
 <tr key={invite.id} className="hover:bg-neutral-50/20 group transition-colors">
 <td className="py-4 pl-6 font-black text-neutral-800">{invite.phoneNumber}</td>
 <td className="py-4 px-4">
 <div className="flex flex-wrap gap-1">
 {(invite.roles && invite.roles.length > 0 ? invite.roles : [invite.role]).map((r: any) => (
 <span key={r.id} className="bg-primary-light text-primary px-2 py-0.5 rounded text-[10px] font-bold">
 {r.name}
 </span>
 ))}
 </div>
 </td>
 <td className="py-4 px-4 text-neutral-600">{invite.invitedBy}</td>
 <td className="py-4 px-4 text-neutral-600">{invite.sentDate}</td>
 <td className="py-4 px-4 text-neutral-600">{invite.expiryDate}</td>
 <td className="py-4 px-4">
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold text-[9px] uppercase">
 {invite.status}
 </span>
 </td>
 <td className="py-4 pr-6 text-right">
 <div className="flex items-center justify-end gap-2">
 <button
 onClick={() => handleResendInvite(invite.id)}
 className="px-2.5 py-1 rounded-lg bg-neutral-50 border border-neutral-100 hover:border-neutral-200 text-[10px] font-bold text-neutral-700 hover:text-neutral-900 flex items-center gap-1"
 >
 <RefreshCw size={10} />
 <span>Resend</span>
 </button>
 <button
 onClick={() => handleCancelInvite(invite.id)}
 className="px-2.5 py-1 rounded-lg bg-neutral-50/80 hover:bg-danger-light border border-neutral-100 text-[10px] font-bold text-neutral-500 hover:text-danger flex items-center gap-1"
 >
 <X size={10} />
 <span>Cancel</span>
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )
 )}

 {/* ========================================================================= */}
 {/* DRAWER: INVITE USER */}
 {/* ========================================================================= */}
 {inviteDrawerOpen && (
 <div className="fixed inset-0 z-[100] flex justify-end animate-fade-in">
 <div className="fixed inset-0 bg-background backdrop-blur-md" onClick={() => setInviteDrawerOpen(false)} />
 
 <div className="relative w-full max-w-lg bg-white border-l border-neutral-100 h-full p-6 flex flex-col justify-between z-10 animate-slide-left shadow-2xl">
 <div className="flex-1 overflow-y-auto pr-1">
 <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-6">
 <div>
 <h3 className="text-base font-black text-neutral-900">Invite Team Member</h3>
 <p className="text-[11px] text-neutral-600 mt-1">Send a phone authentication invite to access this organization.</p>
 </div>
 <button 
 onClick={() => setInviteDrawerOpen(false)}
 className="p-1.5 rounded-lg border border-neutral-100 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
 >
 <X size={16} />
 </button>
 </div>

 {!successInviteDetails ? (
 /* INVITATION FORM */
 <form onSubmit={handleInviteUserSubmit} className="space-y-5">
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">Phone Number (Required)</label>
 <input
 type="text"
 placeholder="+91 9876543210"
 value={invitePhone}
 onChange={(e) => setInvitePhone(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">Workspace Roles (Select all that apply)</label>
 <div className="grid grid-cols-2 gap-2">
 {roles.map((r) => {
 const selected = inviteRoleIds.includes(r.id);
 return (
 <button
 key={r.id}
 type="button"
 onClick={() => {
 if (selected) {
 setInviteRoleIds(prev => prev.filter(id => id !== r.id));
 } else {
 setInviteRoleIds(prev => [...prev, r.id]);
 }
 }}
 className={`p-3 rounded-xl border text-left transition-all ${
 selected 
 ? 'bg-primary-light border-primary/20 text-primary font-bold' 
 : 'bg-neutral-50 border-neutral-100 text-neutral-600 hover:border-neutral-200'
 }`}
 >
 <div className="flex justify-between items-start">
 <span className="block text-xs font-black">{r.name}</span>
 {selected && <Check size={12} className="text-primary" />}
 </div>
 <span className="block text-[9px] text-neutral-500 mt-1 truncate">{r.description}</span>
 </button>
 );
 })}
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">Gym Branch Access</label>
 <span className="block text-[10px] text-neutral-500 mb-2">Assign which locations this staff member can manage.</span>
 <div className="flex flex-wrap gap-2">
 {gyms.map((g) => {
 const selected = inviteGymIds.includes(g.id);
 return (
 <button
 key={g.id}
 type="button"
 onClick={() => {
 if (selected) {
 setInviteGymIds(prev => prev.filter(gid => gid !== g.id));
 } else {
 setInviteGymIds(prev => [...prev, g.id]);
 }
 }}
 className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
 selected 
 ? 'bg-primary-light border-primary/20 text-primary' 
 : 'bg-neutral-50 border-neutral-100 text-neutral-600 hover:border-neutral-200'
 }`}
 >
 {g.name}
 </button>
 );
 })}
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">Invitation Message</label>
 <textarea
 placeholder="Welcome to the team! Use this link to authenticate and access the dashboard."
 value={inviteMessage}
 onChange={(e) => setInviteMessage(e.target.value)}
 rows={3}
 className="w-full bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none resize-none"
 />
 </div>

 <button
 type="submit"
 className="w-full py-3 rounded-xl bg-primary font-extrabold text-white text-xs hover:scale-[1.02] active:scale-[0.98] transition-all"
 >
 Send Invitation
 </button>
 </form>
 ) : (
 /* INVITATION SUCCESS STATE */
 <div className="space-y-6 text-center py-4">
 <div className="w-14 h-14 rounded-full bg-success-light border border-green-200 flex items-center justify-center text-success mx-auto">
 <Check size={28} />
 </div>
 <div>
 <h4 className="text-base font-black text-neutral-900">Invitation Sent Successfully</h4>
 <p className="text-xs text-neutral-600 mt-1">We have registered a pending invitation for authentication.</p>
 </div>

 <div className="bg-neutral-50/80 border border-neutral-100 rounded-2xl p-4 text-left space-y-2.5 text-xs">
 <div className="flex justify-between">
 <span className="text-neutral-500">Invited Phone:</span>
 <span className="font-bold text-neutral-900">{successInviteDetails.phoneNumber}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">Assigned Role:</span>
 <span className="font-bold text-primary">{successInviteDetails.assignedRole}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-400">Expiry Date:</span>
 <span className="font-bold text-neutral-700">{successInviteDetails.expiryDate} (In 7 days)</span>
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 text-left block">Direct Invitation Link</label>
 <div className="flex gap-2">
 <input
 type="text"
 readOnly
 value={successInviteDetails.link}
 className="flex-1 bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2 text-[10px] text-neutral-600 focus:outline-none"
 />
 <button
 onClick={() => {
 navigator.clipboard.writeText(successInviteDetails.link);
 showToast('Invitation link copied!', 'success');
 }}
 className="px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-100 hover:border-neutral-200 text-xs font-bold text-neutral-700 flex items-center gap-1 shrink-0"
 >
 <Copy size={12} />
 <span>Copy</span>
 </button>
 </div>
 </div>

 <div className="border-t border-neutral-100 pt-4 flex gap-2">
 <button
 onClick={() => setSuccessInviteDetails(null)}
 className="flex-1 py-2.5 rounded-xl border border-neutral-100 hover:bg-neutral-50 text-xs font-bold text-neutral-700"
 >
 Invite Another
 </button>
 <button
 onClick={() => setInviteDrawerOpen(false)}
 className="flex-1 py-2.5 rounded-xl bg-primary text-xs font-bold text-white"
 >
 Done
 </button>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* DRAWER: USER DETAILS */}
 {/* ========================================================================= */}
 {userDetailsOpen && selectedUserRecord && (
 <div className="fixed inset-0 z-[100] flex justify-end animate-fade-in">
 <div className="fixed inset-0 bg-background backdrop-blur-md" onClick={() => setUserDetailsOpen(false)} />
 
 <div className="relative w-full max-w-xl bg-white border-l border-neutral-100 h-full p-6 flex flex-col justify-between z-10 animate-slide-left shadow-2xl">
 <div className="flex-grow overflow-y-auto pr-1">
 <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-6">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center font-black text-xs text-primary">
 {selectedUserRecord.name.substring(0, 2).toUpperCase()}
 </div>
 <div>
 <h3 className="text-base font-black text-neutral-900">{selectedUserRecord.name}</h3>
 <span className="block text-[10px] text-neutral-600 uppercase tracking-wider mt-0.5">{selectedUserRecord.role.name}</span>
 </div>
 </div>
 <button 
 onClick={() => setUserDetailsOpen(false)}
 className="p-1.5 rounded-lg border border-neutral-100 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
 >
 <X size={16} />
 </button>
 </div>

 {/* TABS CONTROLS */}
 <div className="flex gap-1.5 border-b border-neutral-100 pb-3 mb-5 text-[11px] font-bold">
 {[
 { id: 'overview', name: 'Overview' },
 { id: 'permissions', name: 'Permissions Matrix' },
 { id: 'gyms', name: 'Gym Branch Scope' },
 { id: 'activity', name: 'Recent Activity' }
 ].map((t) => (
 <button
 key={t.id}
 onClick={() => setDetailsTab(t.id as 'overview' | 'permissions' | 'gyms' | 'activity')}
 className={`px-3 py-1 rounded-lg ${
 detailsTab === t.id ? 'bg-primary-light text-primary border border-primary/20' : 'text-neutral-600 hover:text-neutral-900'
 }`}
 >
 {t.name}
 </button>
 ))}
 </div>

 {/* DETAILED CONTENT AREA */}
 {!selectedUserRecordDetails ? (
 <div className="space-y-3 py-4">
 <div className="h-6 bg-neutral-50 animate-pulse rounded" />
 <div className="h-20 bg-neutral-50 animate-pulse rounded" />
 </div>
 ) : (
 <div className="space-y-6 text-xs">
 {/* OVERVIEW TAB */}
 {detailsTab === 'overview' && (
 <div className="space-y-5">
 <div className="bg-neutral-50/80 border border-neutral-100 rounded-2xl p-4 space-y-3">
 <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Profile Metadata</h4>
 <div className="flex justify-between">
 <span className="text-neutral-600">Phone Number:</span>
 <span className="font-bold text-neutral-900">{selectedUserRecordDetails.phone}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-600">Email Address:</span>
 <span className="font-bold text-neutral-900">{selectedUserRecordDetails.email || 'N/A'}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-600">Joined Date:</span>
 <span className="font-bold text-neutral-700">{selectedUserRecordDetails.joinedDate}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-600">Activity Status:</span>
 <span className={`font-bold ${selectedUserRecordDetails.status === 'active' ? 'text-success' : 'text-danger'}`}>
 {selectedUserRecordDetails.status.toUpperCase()}
 </span>
 </div>
 </div>

 <div className="bg-neutral-50/80 border border-neutral-100 rounded-2xl p-4">
 <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Role Scope Details</h4>
 <span className="block font-bold text-neutral-900 mb-1">{selectedUserRecordDetails.role.name} Badge</span>
 <p className="text-neutral-600 leading-relaxed text-[11px]">{selectedUserRecordDetails.role.description || 'No role description provided.'}</p>
 </div>
 </div>
 )}

 {/* PERMISSIONS TAB */}
 {detailsTab === 'permissions' && (
 <div className="space-y-4">
 <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Accessible System Scope</h4>
 <div className="grid grid-cols-2 gap-2">
 {selectedUserRecordDetails.permissions.length === 0 ? (
 <span className="text-neutral-500 italic">No explicit permissions assigned</span>
 ) : (
 selectedUserRecordDetails.permissions.map((perm: string) => (
 <div key={perm} className="p-2 bg-neutral-50 border border-neutral-100 rounded-lg flex items-center gap-2 text-[10px] text-neutral-700 font-bold">
 <span className="w-1.5 h-1.5 rounded-full bg-primary" />
 <span>{perm}</span>
 </div>
 ))
 )}
 </div>
 </div>
 )}

 {/* GYM BRANCHES TAB */}
 {detailsTab === 'gyms' && (
 <div className="space-y-4">
 <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Assigned Branches ({selectedUserRecordDetails.gyms.length})</h4>
 <div className="space-y-2">
 {selectedUserRecordDetails.gyms.length === 0 ? (
 <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-center text-neutral-500 italic">
 All global branch locations access enabled
 </div>
 ) : (
 selectedUserRecordDetails.gyms.map((g: { id: string; name: string }) => (
 <div key={g.id} className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl flex items-center justify-between">
 <div className="flex items-center gap-2">
 <MapPin size={12} className="text-primary" />
 <span className="font-bold text-neutral-800">{g.name}</span>
 </div>
 <span className="text-[9px] font-bold text-success bg-success-light px-2 py-0.5 rounded">Authorized</span>
 </div>
 ))
 )}
 </div>
 </div>
 )}

 {/* ACTIVITY LOG TAB */}
 {detailsTab === 'activity' && (
 <div className="space-y-4">
 <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Recent User Actions Log</h4>
 {selectedUserRecordDetails.activityLog.length === 0 ? (
 <div className="text-center text-neutral-500 italic p-4">No recent activity logged for this member.</div>
 ) : (
 <div className="relative border-l border-neutral-100 pl-4 space-y-4">
 {selectedUserRecordDetails.activityLog.map((log: { id: string; action: string; details: string; timestamp: string }) => (
 <div key={log.id} className="relative">
 <span className="absolute left-[-21px] top-1 w-2.5 h-2.5 rounded-full bg-primary border border-neutral-100" />
 <span className="block font-bold text-neutral-800">{log.action}</span>
 <p className="text-[10px] text-neutral-600 mt-0.5 leading-relaxed">{log.details}</p>
 <span className="block text-[8px] text-neutral-500 mt-1 flex items-center gap-1">
 <Clock size={8} />
 {log.timestamp}
 </span>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 )}
 </div>
 <div className="border-t border-neutral-100 pt-4 flex gap-2">
 <button
 onClick={() => {
 setChangeRoleId(selectedUserRecord.role.id);
 setChangeRoleIds(selectedUserRecord.roles ? selectedUserRecord.roles.map((r: any) => r.id) : [selectedUserRecord.role.id]);
 setChangeRoleModalOpen(true);
 }}
 className="flex-1 py-2.5 rounded-xl border border-neutral-100 hover:bg-neutral-50 text-xs font-bold text-neutral-700"
 >
 Change Role
 </button>
 <button
 onClick={() => setUserDetailsOpen(false)}
 className="flex-1 py-2.5 rounded-xl bg-primary text-xs font-bold text-white"
 >
 Close
 </button>
 </div>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* MODAL: CHANGE/ASSIGN ROLE EXPERIENCE */}
 {/* ========================================================================= */}
 {changeRoleModalOpen && selectedUserRecord && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background backdrop-blur-md animate-fade-in">
 <div className="fixed inset-0" onClick={() => setChangeRoleModalOpen(false)} />
 
 <div className="relative w-full max-w-xl bg-white border border-neutral-100 rounded-3xl p-6 shadow-2xl animate-scale-in z-10 space-y-6">
 <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
 <div>
 <h3 className="text-base font-black text-neutral-900">Modify Member Access</h3>
 <p className="text-[10px] text-neutral-600 mt-1">Assign a new authorization template to this user account.</p>
 </div>
 <button 
 onClick={() => setChangeRoleModalOpen(false)}
 className="p-1 rounded-lg border border-neutral-100 text-neutral-500 hover:text-neutral-900"
 >
 <X size={14} />
 </button>
 </div>

 {/* COMPARE ROLE PANELS */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="p-3.5 bg-neutral-50/60 border border-neutral-100 rounded-2xl h-fit">
 <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Current Roles</span>
 <div className="flex flex-wrap gap-1 mt-2">
 {(selectedUserRecord.roles && selectedUserRecord.roles.length > 0 ? selectedUserRecord.roles : [selectedUserRecord.role]).map((r: any) => (
 <span key={r.id} className="text-xs font-bold text-neutral-800 bg-neutral-50 border border-neutral-200 px-2 py-1 rounded-lg">
 {r.name}
 </span>
 ))}
 </div>
 </div>
 <div className="p-3.5 bg-neutral-50 border border-primary/20 rounded-2xl">
 <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-2">New Roles Assignment</span>
 <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
 {roles.map((r) => {
 const selected = changeRoleIds.includes(r.id);
 return (
 <button
 key={r.id}
 type="button"
 onClick={() => {
 if (selected) {
 setChangeRoleIds(prev => prev.filter(id => id !== r.id));
 } else {
 setChangeRoleIds(prev => [...prev, r.id]);
 }
 }}
 className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
 selected 
 ? 'bg-primary-light border-primary/20 text-primary font-bold' 
 : 'bg-neutral-50 border-neutral-100 text-neutral-600 hover:border-neutral-200'
 }`}
 >
 <span className="text-[11px] font-bold">{r.name}</span>
 {selected ? (
 <CheckSquare size={13} className="text-primary" />
 ) : (
 <Square size={13} className="text-neutral-400" />
 )}
 </button>
 );
 })}
 </div>
 </div>
 </div>

 {/* PREVIEW PERMISSION DIFFERENCE COMPARE MATRIX */}
 {changeRoleIds.length > 0 && (
 <div className="bg-neutral-50/80 border border-neutral-100 rounded-2xl p-4">
 <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-3">Combined Permission Preview</h4>
 
 <div className="grid grid-cols-1 gap-2 text-xs">
 <div>
 <span className="text-[10px] font-bold text-success block mb-2">Can Access:</span>
 <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-1">
 {Array.from(new Set(
 changeRoleIds.flatMap(id => getPermissionDifferences(id).can)
 )).map((mod) => (
 <div key={mod} className="flex items-center gap-1 bg-success-light text-success border border-green-200 px-2 py-0.5 rounded-lg text-[9px] font-bold">
 <Check size={9} />
 <span>{mod}</span>
 </div>
 ))}
 </div>
 </div>
 <div>
 <span className="text-[10px] font-bold text-danger block mb-2">Cannot Access:</span>
 <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
 {getPermissionDifferences(changeRoleId).cannot.length === 0 ? (
 <span className="text-neutral-500 italic text-[10px]">No restrictions</span>
 ) : (
 getPermissionDifferences(changeRoleId).cannot.map((mod) => (
 <div key={mod} className="flex items-center gap-1.5 text-neutral-500 text-[10px]">
 <X size={11} className="text-danger" />
 <span>{mod}</span>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 </div>
 )}

 <div className="flex gap-3 justify-end pt-3 border-t border-neutral-100">
 <button
 onClick={() => setChangeRoleModalOpen(false)}
 className="px-4 py-2 rounded-xl border border-neutral-100 hover:bg-neutral-50 text-xs font-bold text-neutral-700"
 >
 Cancel
 </button>
 <button
 onClick={handleSaveRoleChange}
 className="px-4 py-2 rounded-xl bg-primary text-xs font-bold text-white hover:bg-primary-hover"
 >
 Save Changes
 </button>
 </div>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* MODAL: ASSIGN GYM ACCESS */}
 {/* ========================================================================= */}
 {gymAccessModalOpen && selectedUserRecord && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background backdrop-blur-md animate-fade-in">
 <div className="fixed inset-0" onClick={() => setGymAccessModalOpen(false)} />
 
 <div className="relative w-full max-w-md bg-white border border-neutral-100 rounded-3xl p-6 shadow-2xl animate-scale-in z-10 space-y-6">
 <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
 <div>
 <h3 className="text-base font-black text-neutral-900">Gym Access Assignment</h3>
 <p className="text-[10px] text-neutral-600 mt-1">Restrict branch-level data scopes for &apos;{selectedUserRecord.name}&apos;.</p>
 </div>
 <button 
 onClick={() => setGymAccessModalOpen(false)}
 className="p-1 rounded-lg border border-neutral-100 text-neutral-500 hover:text-neutral-900"
 >
 <X size={14} />
 </button>
 </div>

 <div className="space-y-4">
 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => setChangeGymIds([])}
 className={`flex-1 py-2 rounded-xl border text-center font-bold text-xs transition-all ${
 changeGymIds.length === 0 
 ? 'bg-primary-light border-primary/20 text-primary' 
 : 'bg-neutral-50 border-neutral-100 text-neutral-600 hover:border-neutral-200'
 }`}
 >
 All Gym Branches
 </button>
 <button
 type="button"
 onClick={() => setChangeGymIds(gyms.map(g => g.id))}
 className="flex-1 py-2 rounded-xl bg-neutral-50 border border-neutral-100 hover:border-neutral-200 text-neutral-600 text-xs font-bold"
 >
 Select All
 </button>
 </div>

 <div className="space-y-2 border border-neutral-100 rounded-2xl p-3 bg-neutral-50/60 max-h-48 overflow-y-auto">
 {gyms.map((g) => {
 const isChecked = changeGymIds.includes(g.id);
 return (
 <button
 key={g.id}
 onClick={() => {
 if (isChecked) {
 setChangeGymIds(prev => prev.filter(gid => gid !== g.id));
 } else {
 setChangeGymIds(prev => [...prev, g.id]);
 }
 }}
 className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50 transition-colors text-left"
 >
 <span className="text-xs text-neutral-700 font-bold">{g.name}</span>
 {isChecked ? (
 <CheckSquare size={14} className="text-primary" />
 ) : (
 <Square size={14} className="text-neutral-400" />
 )}
 </button>
 );
 })}
 </div>

 {/* CHIPS PREVIEW */}
 {changeGymIds.length > 0 && (
 <div className="space-y-1.5">
 <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Selected Branches:</span>
 <div className="flex flex-wrap gap-1.5">
 {gyms.filter(g => changeGymIds.includes(g.id)).map(g => (
 <span key={g.id} className="text-[10px] font-bold bg-primary-light text-primary border border-primary/20 px-2 py-0.5 rounded-lg">
 {g.name}
 </span>
 ))}
 </div>
 </div>
 )}
 </div>

 <div className="flex gap-3 justify-end pt-3 border-t border-neutral-100">
 <button
 onClick={() => setGymAccessModalOpen(false)}
 className="px-4 py-2 rounded-xl border border-neutral-100 hover:bg-neutral-50 text-xs font-bold text-neutral-700"
 >
 Cancel
 </button>
 <button
 onClick={handleSaveGymAccess}
 className="px-4 py-2 rounded-xl bg-primary text-xs font-bold text-white hover:bg-primary-hover"
 >
 Save Scope
 </button>
 </div>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* MODAL: BULK ACTION BAR ASSIGNMENT */}
 {/* ========================================================================= */}
 {bulkActionOpen && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background backdrop-blur-md animate-fade-in">
 <div className="fixed inset-0" onClick={() => setBulkActionOpen(false)} />
 
 <div className="relative w-full max-w-md bg-white border border-neutral-100 rounded-3xl p-6 shadow-2xl animate-scale-in z-10 space-y-6">
 <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
 <div>
 <h3 className="text-base font-black text-neutral-900">Bulk Assign Role & Branch</h3>
 <p className="text-[10px] text-neutral-600 mt-1">Applying modifications to {selectedUsers.length} users simultaneously.</p>
 </div>
 <button 
 onClick={() => setBulkActionOpen(false)}
 className="p-1 rounded-lg border border-neutral-100 text-neutral-500 hover:text-neutral-900"
 >
 <X size={14} />
 </button>
 </div>

 <div className="space-y-4 text-xs">
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Assign Roles (Multiple Select)</label>
 <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1 border border-neutral-100 rounded-2xl p-2.5 bg-neutral-50/60">
 {roles.map((r) => {
 const selected = changeRoleIds.includes(r.id);
 return (
 <button
 key={r.id}
 type="button"
 onClick={() => {
 if (selected) {
 setChangeRoleIds(prev => prev.filter(id => id !== r.id));
 } else {
 setChangeRoleIds(prev => [...prev, r.id]);
 }
 }}
 className={`flex items-center justify-between p-1.5 rounded-lg border text-left transition-all ${
 selected 
 ? 'bg-primary-light border-primary/20 text-primary font-bold' 
 : 'bg-neutral-50 border-neutral-100 text-neutral-600 hover:border-neutral-200'
 }`}
 >
 <span className="text-[10px] truncate max-w-[100px]">{r.name}</span>
 {selected ? (
 <CheckSquare size={11} className="text-primary" />
 ) : (
 <Square size={11} className="text-neutral-400" />
 )}
 </button>
 );
 })}
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Assign Branch Access</label>
 <div className="space-y-1 border border-neutral-100 rounded-2xl p-3 bg-neutral-50/60 max-h-36 overflow-y-auto">
 {gyms.map((g) => {
 const isChecked = changeGymIds.includes(g.id);
 return (
 <button
 key={g.id}
 onClick={() => {
 if (isChecked) {
 setChangeGymIds(prev => prev.filter(gid => gid !== g.id));
 } else {
 setChangeGymIds(prev => [...prev, g.id]);
 }
 }}
 className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-neutral-50 transition-colors text-left"
 >
 <span className="text-neutral-700 text-[11px] font-bold">{g.name}</span>
 {isChecked ? (
 <CheckSquare size={13} className="text-primary" />
 ) : (
 <Square size={13} className="text-neutral-400" />
 )}
 </button>
 );
 })}
 </div>
 <span className="block text-[9px] text-neutral-500 mt-1 italic">Leave unchecked to keep branch allocations unchanged for selected users.</span>
 </div>
 </div>

 <div className="flex gap-3 justify-end pt-3 border-t border-neutral-100">
 <button
 onClick={() => setBulkActionOpen(false)}
 className="px-4 py-2 rounded-xl border border-neutral-100 hover:bg-neutral-50 text-xs font-bold text-neutral-700"
 >
 Cancel
 </button>
 <button
 onClick={handleBulkUpdateSubmit}
 className="px-4 py-2 rounded-xl bg-primary text-xs font-bold text-white hover:bg-primary-hover"
 >
 Apply Changes
 </button>
 </div>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* MODAL: REMOVE USER CONFIRMATION */}
 {/* ========================================================================= */}
 {removeUserOpen && selectedUserRecord && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background backdrop-blur-md animate-fade-in">
 <div className="fixed inset-0" onClick={() => setRemoveUserOpen(false)} />
 
 <div className="relative w-full max-w-md bg-white border border-neutral-100 rounded-3xl p-6 shadow-2xl animate-scale-in z-10 space-y-6">
 <div className="flex items-center gap-3 text-danger border-b border-neutral-100 pb-3">
 <AlertCircle size={22} className="shrink-0 animate-bounce" />
 <div>
 <h3 className="text-base font-black text-neutral-900">Remove User Account</h3>
 <span className="block text-[10px] text-neutral-600 mt-0.5">Dangerous Action Profile</span>
 </div>
 </div>

 <div className="text-xs space-y-3">
 <p className="text-neutral-700 leading-relaxed">
 Are you sure you want to remove &apos;{selectedUserRecord.name}&apos; from the organization?
 </p>
 
 <div className="p-3.5 bg-neutral-50/80 border border-neutral-100 rounded-2xl space-y-2">
 <div className="flex justify-between">
 <span className="text-neutral-500">Workspace Role:</span>
 <span className="font-bold text-neutral-800">{selectedUserRecord.role.name}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">Branch Allocation:</span>
 <span className="font-bold text-neutral-800">
 {selectedUserRecord.gyms.length === 0 ? 'All Branches' : `${selectedUserRecord.gyms.length} Gyms`}
 </span>
 </div>
 </div>

 <div className="p-3 bg-danger-light border border-red-200 text-danger rounded-xl flex gap-2 font-bold text-[10px] leading-normal">
 <AlertCircle size={14} className="shrink-0 mt-0.5" />
 <span>Warning: This user will lose all workspace access, check-in controls, and dashboard configurations associated with this organization.</span>
 </div>
 </div>

 <div className="flex gap-3 justify-end pt-3 border-t border-neutral-100">
 <button
 onClick={() => setRemoveUserOpen(false)}
 className="px-4 py-2 rounded-xl border border-neutral-100 hover:bg-neutral-50 text-xs font-bold text-neutral-700"
 >
 Cancel
 </button>
 <button
 onClick={handleRemoveUserConfirm}
 className="px-4 py-2 rounded-xl bg-danger hover:bg-red-600 text-xs font-bold text-white transition-colors"
 >
 Remove User
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}

export default function OrganizationUsersPage() {
 return (
 <Suspense fallback={<div className="p-8 text-center text-xs text-neutral-500 animate-pulse">Loading Users Dashboard...</div>}>
 <OrganizationUsersContent />
 </Suspense>
 );
}
