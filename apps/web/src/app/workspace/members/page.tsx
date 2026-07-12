'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
 Users,
 Search,
 Plus,
 Filter,
 MapPin,
 FileText,
 Activity,
 QrCode,
 QrCode as QrIcon,
 ChevronRight,
 TrendingUp,
 Mail,
 Phone,
 Info,
 Calendar,
 AlertTriangle,
 Scale,
 CreditCard,
 UserCheck,
 X
} from 'lucide-react';
import { membersApi, gymApi } from '../../../lib/api';

interface Member {
 id: string;
 firstName: string;
 lastName: string;
 phoneNumber: string;
 dob?: string;
 gender?: string;
 createdAt: string;
 homeGymId: string;
 homeGym?: {
 id: string;
 name: string;
 };
 aiInsights?: {
 memberNumber?: string;
 occupation?: string;
 fitnessGoal?: string;
 assignedTrainerName?: string;
 assignedDietitianName?: string;
 counselor?: string;
 source?: string;
 status?: string;
 };
 memberMeasurements?: Array<{
 id: string;
 height?: number;
 weight?: number;
 bodyFatPercentage?: number;
 date: string;
 }>;
 memberDocuments?: Array<{
 id: string;
 documentType: string;
 url: string;
 status: string;
 }>;
 activeMembership?: {
 id: string;
 status: string;
 startDate: string;
 endDate: string;
 membershipPlan?: {
 name: string;
 } | null;
 } | null;
}

export default function MemberDirectoryPage() {
 const router = useRouter();

 const getMembershipStatusBadge = (status: string) => {
 const s = status.toLowerCase();
 if (s === 'active') return 'bg-success-light text-success border border-green-200';
 if (s === 'expired') return 'bg-danger-light text-danger border border-red-200';
 if (s === 'frozen') return 'bg-warning-light text-amber-700 border border-amber-200';
 if (s === 'suspended') return 'bg-red-500/10 text-red-400 border border-red-500/20';
 return 'bg-neutral-100/10 text-neutral-600 border border-neutral-300/20';
 };

 // State
 const [loading, setLoading] = useState(true);
 const [members, setMembers] = useState<Member[]>([]);
 const [branches, setBranches] = useState<any[]>([]);
 const [searchQuery, setSearchQuery] = useState('');
 const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
 const [selectedGoalFilter, setSelectedGoalFilter] = useState('all');
 const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
 const [selectedGenderFilter, setSelectedGenderFilter] = useState('all');
 const [selectedTrainerFilter, setSelectedTrainerFilter] = useState('all');
 const [userRole, setUserRole] = useState('receptionist');
 const [currentPage, setCurrentPage] = useState(1);
 const itemsPerPage = 10;

 // Modals state
 const [activeQrMember, setActiveQrMember] = useState<Member | null>(null);
 const [qrToken, setQrToken] = useState<string>('');
 const [qrLoading, setQrLoading] = useState(false);

 const [activeMeasureMember, setActiveMeasureMember] = useState<Member | null>(null);
 const [measureHeight, setMeasureHeight] = useState('');
 const [measureWeight, setMeasureWeight] = useState('');
 const [measureFat, setMeasureFat] = useState('');
 const [measureSaving, setMeasureSaving] = useState(false);

 const [showInviteModal, setShowInviteModal] = useState(false);
 const [invitePhone, setInvitePhone] = useState('');
 const [inviteEmail, setInviteEmail] = useState('');
 const [sendingInvite, setSendingInvite] = useState(false);
 const [orgId, setOrgId] = useState('');

 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 const loadData = async () => {
 try {
 setLoading(true);
 const orgId = localStorage.getItem('organizationId') || '';
 setOrgId(orgId);
 const userStr = localStorage.getItem('user');
 if (userStr) {
 try {
 const u = JSON.parse(userStr);
 if (u.role) setUserRole(u.role.toLowerCase());
 } catch (_) { }
 }

 // Load branches
 const branchList = await gymApi.list(orgId);
 setBranches(branchList || []);

 // Load members
 const activeGymName = localStorage.getItem('activeGymName') || 'All Gyms';
 let gymFilterId = 'all';

 if (activeGymName !== 'All Gyms') {
 const matched = branchList.find((g: any) => g.name === activeGymName);
 if (matched) {
 gymFilterId = matched.id;
 setSelectedBranchFilter(matched.id);
 }
 }

 const list = await membersApi.list({ homeGymId: gymFilterId });
 setMembers(list || []);
 } catch (err) {
 console.error(err);
 showToast('Failed to load member records', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, []);

 const handleGenerateQr = async (member: Member) => {
 try {
 setActiveQrMember(member);
 setQrLoading(true);
 const res = await membersApi.generateQrCode(member.id);
 setQrToken(res.qrToken || 'TOKEN_SIMULATED_123890');
 } catch (err) {
 console.error(err);
 setQrToken('TOKEN_SIMULATED_' + Math.floor(Math.random() * 1000000));
 } finally {
 setQrLoading(false);
 }
 };

 const handleSaveMeasurements = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!activeMeasureMember) return;

 try {
 setMeasureSaving(true);
 await membersApi.addMeasurement(activeMeasureMember.id, {
 height: measureHeight ? parseFloat(measureHeight) : undefined,
 weight: measureWeight ? parseFloat(measureWeight) : undefined,
 bodyFatPercentage: measureFat ? parseFloat(measureFat) : undefined,
 });

 showToast(`Measurements recorded for ${activeMeasureMember.firstName}`);
 setActiveMeasureMember(null);
 setMeasureHeight('');
 setMeasureWeight('');
 setMeasureFat('');

 // Reload member data
 const orgId = localStorage.getItem('organizationId') || '';
 const list = await membersApi.list({ homeGymId: selectedBranchFilter });
 setMembers(list || []);
 } catch (err) {
 console.error(err);
 showToast('Failed to save measurements', 'error');
 } finally {
 setMeasureSaving(false);
 }
 };

 const isViewOnly = userRole === 'trainer' || userRole === 'dietitian';

 // Distinct trainer names actually assigned to at least one loaded member -
 // guarantees the filter only ever offers real, non-empty options.
 const trainerOptions = Array.from(
 new Set(members.map(m => m.aiInsights?.assignedTrainerName).filter((t): t is string => !!t))
 ).sort();

 // Filters mapping
 const filteredMembers = members.filter(m => {
 const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
 const phone = m.phoneNumber || '';
 const memNumber = m.aiInsights?.memberNumber?.toLowerCase() || '';
 const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
 phone.includes(searchQuery) ||
 memNumber.includes(searchQuery.toLowerCase());

 const matchesBranch = selectedBranchFilter === 'all' || m.homeGymId === selectedBranchFilter;

 const goal = m.aiInsights?.fitnessGoal || '';
 const matchesGoal = selectedGoalFilter === 'all' || goal.toLowerCase() === selectedGoalFilter.toLowerCase();

 const membershipStatus = m.activeMembership?.status || 'None';
 const matchesStatus = selectedStatusFilter === 'all' || membershipStatus.toLowerCase() === selectedStatusFilter.toLowerCase();

 const matchesGender = selectedGenderFilter === 'all' || (m.gender || '').toLowerCase() === selectedGenderFilter.toLowerCase();

 const matchesTrainer = selectedTrainerFilter === 'all' || m.aiInsights?.assignedTrainerName === selectedTrainerFilter;

 return matchesSearch && matchesBranch && matchesGoal && matchesStatus && matchesGender && matchesTrainer;
 });

 const activeFilterCount = [selectedBranchFilter, selectedGoalFilter, selectedStatusFilter, selectedGenderFilter, selectedTrainerFilter]
 .filter(f => f !== 'all').length;

 const resetFilters = () => {
 setSearchQuery('');
 setSelectedBranchFilter('all');
 setSelectedGoalFilter('all');
 setSelectedStatusFilter('all');
 setSelectedGenderFilter('all');
 setSelectedTrainerFilter('all');
 };

 const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
 const activePage = Math.max(1, Math.min(currentPage, totalPages || 1));
 const paginatedMembers = filteredMembers.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

 useEffect(() => {
 setCurrentPage(1);
 }, [searchQuery, selectedBranchFilter, selectedGoalFilter, selectedStatusFilter, selectedGenderFilter, selectedTrainerFilter]);

 const getAge = (dobString?: string) => {
 if (!dobString) return 'N/A';
 const birthDate = new Date(dobString);
 const today = new Date();
 let age = today.getFullYear() - birthDate.getFullYear();
 const m = today.getMonth() - birthDate.getMonth();
 if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
 age--;
 }
 return age;
 };

 if (loading) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Loading Member Directory...
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-white text-neutral-900 p-8 space-y-6 relative overflow-hidden">

 {/* Toast */}
 {toast && (
 <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border ${toast.type === 'success'
 ? 'bg-success-light text-success border-green-200'
 : 'bg-danger-light text-danger border-red-200'
 }`}>
 <span className="text-sm font-medium">{toast.message}</span>
 </div>
 )}

 {/* Header */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-200/80 pb-6">
 <div>
 <h1 className="text-2xl font-bold text-neutral-900 font-display flex items-center gap-2">
 <Users className="w-6 h-6 text-danger" />
 Member Directory
 </h1>
 <p className="text-xs text-neutral-600 mt-1">Manage memberships, physical check-ins, trainers, and biological progression metrics.</p>
 </div>

 <div className="flex gap-2">
 {!isViewOnly && (
 <button
 type="button"
 onClick={() => router.push('/workspace/memberships/purchase')}
 className="px-4 py-2.5 bg-neutral-50 border border-neutral-200 hover:text-neutral-900 text-neutral-700 text-xs font-semibold rounded-xl transition flex items-center gap-2"
 >
 <CreditCard className="w-4 h-4 text-danger" />
 <span>Sell Membership</span>
 </button>
 )}

 {!isViewOnly && (
 <button
 type="button"
 onClick={() => router.push('/workspace/members/create')}
 className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-neutral-900 text-xs font-semibold rounded-xl transition flex items-center gap-2 shadow-lg"
 >
 <Plus className="w-4 h-4" />
 <span>Create Member</span>
 </button>
 )}
 </div>
 </div>

 {/* Directory Metrics Overview */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="bg-neutral-50/20 border border-neutral-200/60 rounded-2xl p-5 flex items-center gap-4 backdrop-blur-md">
 <div className="w-10 h-10 rounded-xl bg-danger-light border border-red-200 flex items-center justify-center text-danger">
 <Users className="w-5 h-5" />
 </div>
 <div>
 <span className="text-[10px] text-neutral-500 block uppercase font-mono">Total Members</span>
 <span className="text-lg font-bold text-neutral-900">{members.length}</span>
 </div>
 </div>

 <div className="bg-neutral-50/20 border border-neutral-200/60 rounded-2xl p-5 flex items-center gap-4 backdrop-blur-md">
 <div className="w-10 h-10 rounded-xl bg-primary-light border border-primary/20 flex items-center justify-center text-primary">
 <TrendingUp className="w-5 h-5" />
 </div>
 <div>
 <span className="text-[10px] text-neutral-500 block uppercase font-mono">Active Goals</span>
 <span className="text-lg font-bold text-neutral-900">
 {members.filter(m => m.aiInsights?.fitnessGoal).length}
 </span>
 </div>
 </div>

 <div className="bg-neutral-50/20 border border-neutral-200/60 rounded-2xl p-5 flex items-center gap-4 backdrop-blur-md">
 <div className="w-10 h-10 rounded-xl bg-success-light border border-green-200 flex items-center justify-center text-success">
 <Activity className="w-5 h-5" />
 </div>
 <div>
 <span className="text-[10px] text-neutral-500 block uppercase font-mono">Measured Today</span>
 <span className="text-lg font-bold text-neutral-900">
 {members.filter(m => m.memberMeasurements && m.memberMeasurements.length > 0).length}
 </span>
 </div>
 </div>

 <div className="bg-neutral-50/20 border border-neutral-200/60 rounded-2xl p-5 flex items-center gap-4 backdrop-blur-md">
 <div className="w-10 h-10 rounded-xl bg-primary-light border border-primary/20 flex items-center justify-center text-primary">
 <FileText className="w-5 h-5" />
 </div>
 <div>
 <span className="text-[10px] text-neutral-500 block uppercase font-mono">Document Uploads</span>
 <span className="text-lg font-bold text-neutral-900">
 {members.reduce((acc, m) => acc + (m.memberDocuments?.length || 0), 0)}
 </span>
 </div>
 </div>
 </div>

 {/* Filters & Search Bar */}
 <div className="flex flex-col gap-4 bg-neutral-50/10 border border-neutral-200/60 p-4 rounded-2xl backdrop-blur-md">
 <div className="flex flex-col md:flex-row gap-4 items-center">
 <div className="relative flex-1 w-full">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
 <input
 type="text"
 placeholder="Search by Name, Phone, or Member ID..."
 className="w-full bg-white border border-neutral-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-200"
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 />
 </div>

 {activeFilterCount > 0 && (
 <button
 type="button"
 onClick={resetFilters}
 className="flex items-center gap-1.5 px-3 py-2.5 bg-danger-light border border-red-200 text-danger hover:text-danger text-xs font-semibold rounded-xl transition shrink-0"
 >
 <X className="w-3.5 h-3.5" />
 Reset Filters ({activeFilterCount})
 </button>
 )}
 </div>

 <div className="flex flex-wrap gap-3 w-full">
 <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 py-2">
 <MapPin className="w-3.5 h-3.5 text-neutral-500" />
 <select
 className="bg-transparent text-xs text-neutral-700 focus:outline-none border-0 p-0 cursor-pointer"
 value={selectedBranchFilter}
 onChange={e => setSelectedBranchFilter(e.target.value)}
 >
 <option value="all">All Home Gyms</option>
 {branches.map(b => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>
 </div>

 <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 py-2">
 <Filter className="w-3.5 h-3.5 text-neutral-500" />
 <select
 className="bg-transparent text-xs text-neutral-700 focus:outline-none border-0 p-0 cursor-pointer"
 value={selectedGoalFilter}
 onChange={e => setSelectedGoalFilter(e.target.value)}
 >
 <option value="all">All Goals</option>
 <option value="weight loss">Weight Loss</option>
 <option value="muscle gain">Muscle Gain</option>
 <option value="general fitness">General Fitness</option>
 <option value="athletic performance">Athletic Performance</option>
 <option value="rehabilitation">Rehabilitation</option>
 </select>
 </div>

 <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 py-2">
 <Activity className="w-3.5 h-3.5 text-neutral-500" />
 <select
 className="bg-transparent text-xs text-neutral-700 focus:outline-none border-0 p-0 cursor-pointer"
 value={selectedStatusFilter}
 onChange={e => setSelectedStatusFilter(e.target.value)}
 >
 <option value="all">All Membership Status</option>
 <option value="Active">Active</option>
 <option value="Expired">Expired</option>
 <option value="Frozen">Frozen</option>
 <option value="Suspended">Suspended</option>
 <option value="None">No Plan</option>
 </select>
 </div>

 <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 py-2">
 <Info className="w-3.5 h-3.5 text-neutral-500" />
 <select
 className="bg-transparent text-xs text-neutral-700 focus:outline-none border-0 p-0 cursor-pointer"
 value={selectedGenderFilter}
 onChange={e => setSelectedGenderFilter(e.target.value)}
 >
 <option value="all">All Genders</option>
 <option value="Male">Male</option>
 <option value="Female">Female</option>
 <option value="Other">Other</option>
 </select>
 </div>

 {trainerOptions.length > 0 && (
 <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 py-2">
 <UserCheck className="w-3.5 h-3.5 text-neutral-500" />
 <select
 className="bg-transparent text-xs text-neutral-700 focus:outline-none border-0 p-0 cursor-pointer"
 value={selectedTrainerFilter}
 onChange={e => setSelectedTrainerFilter(e.target.value)}
 >
 <option value="all">All Trainers</option>
 {trainerOptions.map(t => (
 <option key={t} value={t}>{t}</option>
 ))}
 </select>
 </div>
 )}
 </div>
 </div>

 {/* Directory Table */}
 <div className="bg-neutral-50/20 border border-neutral-200/60 rounded-3xl overflow-hidden backdrop-blur-md">
 {filteredMembers.length === 0 ? (
 <div className="p-16 text-center max-w-sm mx-auto flex flex-col items-center">
 <Users className="text-neutral-400 mb-4" size={40} />
 <h3 className="text-sm font-bold text-neutral-900">No Members Found</h3>
 <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
 No member files match your active filters or query.
 </p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-neutral-200/80 text-neutral-600 font-mono uppercase text-[10px] tracking-wider bg-neutral-50/20">
 <th className="py-4 px-6">Member ID</th>
 <th className="py-4 px-6">Name</th>
 <th className="py-4 px-6">Home Gym</th>
 <th className="py-4 px-6">Membership</th>
 <th className="py-4 px-6">Phone</th>
 <th className="py-4 px-6">Age / Gender</th>
 <th className="py-4 px-6">Fitness Goal</th>
 {/* <th className="py-4 px-6">Latest Height/Weight</th> */}
 <th className="py-4 px-6 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200/40">
 {paginatedMembers.map((m) => {
 const latestMeasure = m.memberMeasurements && m.memberMeasurements.length > 0
 ? m.memberMeasurements[0]
 : null;

 return (
 <tr key={m.id} className="hover:bg-neutral-50/10 transition duration-150">
 <td className="py-4 px-6 font-mono text-danger font-semibold">
 {m.aiInsights?.memberNumber || 'MEM-000000'}
 </td>
 <td className="py-4 px-6">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center font-bold text-danger">
 {m.firstName.charAt(0)}{m.lastName.charAt(0)}
 </div>
 <div>
 <span className="font-semibold text-neutral-800 block text-xs">{m.firstName} {m.lastName}</span>
 {m.dob && <span className="text-[10px] text-neutral-500 font-mono">{m.dob}</span>}
 </div>
 </div>
 </td>
 <td className="py-4 px-6 text-neutral-700">
 {m.homeGym?.name || 'Unassigned'}
 </td>
 <td className="py-4 px-6">
 {m.activeMembership ? (
 <div className="space-y-1">
 <span className="text-neutral-800 font-medium block text-xs truncate max-w-[150px]" title={m.activeMembership.membershipPlan?.name || 'Plan'}>
 {m.activeMembership.membershipPlan?.name || 'Standard Plan'}
 </span>
 <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider inline-block ${getMembershipStatusBadge(m.activeMembership.status)}`}>
 {m.activeMembership.status}
 </span>
 </div>
 ) : (
 <div className="space-y-1">
 <span className="text-neutral-500 text-xs block">No Plan</span>
 <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider inline-block ${getMembershipStatusBadge('none')}`}>
 None
 </span>
 </div>
 )}
 </td>
 <td className="py-4 px-6 text-neutral-600 font-mono">
 {m.phoneNumber}
 </td>
 <td className="py-4 px-6 text-neutral-700 capitalize">
 {getAge(m.dob)} yrs / {m.gender || 'N/A'}
 </td>
 <td className="py-4 px-6">
 <span className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-danger-light text-danger border border-red-200">
 {m.aiInsights?.fitnessGoal || 'General Fitness'}
 </span>
 </td>
 {/* <td className="py-4 px-6 text-neutral-700 font-mono">
 {latestMeasure 
 ? `${latestMeasure.height || '--'} cm / ${latestMeasure.weight || '--'} kg`
 : 'No measurements'}
 </td> */}
 <td className="py-4 px-6">
 <div className="flex justify-end items-center gap-2">
 <button
 type="button"
 onClick={() => handleGenerateQr(m)}
 className="p-1.5 bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-800 rounded-lg transition"
 title="Generate Access QR"
 >
 <QrIcon size={14} />
 </button>

 <button
 type="button"
 onClick={() => setActiveMeasureMember(m)}
 className="p-1.5 bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-800 rounded-lg transition"
 title="Record Physical Metrics"
 >
 <Scale size={14} />
 </button>

 <button
 type="button"
 onClick={() => router.push(`/workspace/members/${m.id}`)}
 className="p-1.5 bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-800 rounded-lg transition"
 title="View Member details"
 >
 <ChevronRight size={14} />
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

 {/* Pagination Controls */}
 {totalPages > 1 && (
 <div className="p-4 border-t border-neutral-200/60 bg-neutral-50/20 flex items-center justify-between font-mono text-xs text-neutral-600">
 <span>
 Showing <strong className="text-neutral-800">{filteredMembers.length === 0 ? 0 : (activePage - 1) * itemsPerPage + 1}</strong> to{' '}
 <strong className="text-neutral-800">{Math.min(activePage * itemsPerPage, filteredMembers.length)}</strong> of{' '}
 <strong className="text-neutral-800">{filteredMembers.length}</strong> entries
 </span>
 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
 disabled={activePage === 1}
 className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 text-[10px] font-bold rounded-lg transition"
 >
 Previous
 </button>
 <div className="flex gap-1 items-center">
 {Array.from({ length: totalPages }, (_, i) => i + 1)
 .filter(page => page === 1 || page === totalPages || Math.abs(page - activePage) <= 1)
 .map((page, idx, arr) => {
 const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
 return (
 <React.Fragment key={page}>
 {showEllipsis && <span className="text-neutral-500 text-xs px-1">...</span>}
 <button
 type="button"
 onClick={() => setCurrentPage(page)}
 className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition ${activePage === page
 ? 'bg-danger-light text-danger border border-red-200'
 : 'bg-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
 }`}
 >
 {page}
 </button>
 </React.Fragment>
 );
 })}
 </div>
 <button
 type="button"
 onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
 disabled={activePage === totalPages}
 className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 text-[10px] font-bold rounded-lg transition"
 >
 Next
 </button>
 </div>
 </div>
 )}
 </div>

 {/* MODAL 1: QR CODE SIMULATION */}
 {activeQrMember && (
 <div className="fixed inset-0 bg-background backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative">
 <h3 className="text-base font-bold text-neutral-900 mb-2">Member Check-In Pass</h3>
 <p className="text-xs text-neutral-600 mb-6">{activeQrMember.firstName} {activeQrMember.lastName}</p>

 <div className="mx-auto w-48 h-48 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-center p-4 mb-6 relative overflow-hidden">
 {qrLoading ? (
 <span className="text-xs text-neutral-500 animate-pulse">Generating token...</span>
 ) : (
 <div className="w-full h-full flex flex-col justify-center items-center gap-2">
 {/* Styled simulated QR Graphic */}
 <div className="w-36 h-36 border-4 border-dashed border-red-200 rounded-xl flex items-center justify-center p-2">
 <QrCode size={96} className="text-danger animate-pulse" />
 </div>
 <span className="text-[9px] text-neutral-500 font-mono tracking-widest uppercase">{qrToken.slice(0, 16)}</span>
 </div>
 )}
 </div>

 <div className="bg-warning-light border border-amber-200 rounded-xl p-3 text-[10px] text-amber-700 text-left mb-6 flex gap-2">
 <Info size={16} className="shrink-0 mt-0.5" />
 <span>Passes expire every 5 minutes automatically. Scan at branch entry turnstiles.</span>
 </div>

 <button
 type="button"
 onClick={() => {
 setActiveQrMember(null);
 setQrToken('');
 }}
 className="w-full py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Close Pass
 </button>
 </div>
 </div>
 )}

 {/* MODAL 2: RECORD PHYSICAL MEASUREMENT */}
 {activeMeasureMember && (
 <div className="fixed inset-0 bg-background backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <form onSubmit={handleSaveMeasurements} className="bg-white border border-neutral-200/80 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative space-y-6">
 <div>
 <h3 className="text-base font-bold text-neutral-900">Record Biological Metrics</h3>
 <p className="text-xs text-neutral-600 mt-1">Enter physical indicators for {activeMeasureMember.firstName} {activeMeasureMember.lastName}.</p>
 </div>

 <div className="space-y-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-semibold font-mono uppercase">Height (cm)</label>
 <input
 type="number"
 step="0.1"
 required
 placeholder="e.g. 175.5"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={measureHeight}
 onChange={e => setMeasureHeight(e.target.value)}
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-semibold font-mono uppercase">Weight (kg)</label>
 <input
 type="number"
 step="0.1"
 required
 placeholder="e.g. 72.8"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={measureWeight}
 onChange={e => setMeasureWeight(e.target.value)}
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-semibold font-mono uppercase">Body Fat Percentage (%)</label>
 <input
 type="number"
 step="0.1"
 placeholder="e.g. 14.5"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={measureFat}
 onChange={e => setMeasureFat(e.target.value)}
 />
 </div>
 </div>

 <div className="flex gap-3 pt-2">
 <button
 type="button"
 onClick={() => {
 setActiveMeasureMember(null);
 setMeasureHeight('');
 setMeasureWeight('');
 setMeasureFat('');
 }}
 className="flex-1 py-2 bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-800 text-xs font-semibold rounded-xl transition"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={measureSaving}
 className="flex-1 py-2 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 {measureSaving ? 'Saving...' : 'Save Metrics'}
 </button>
 </div>
 </form>
 </div>
 )}

 </div>
 );
}
