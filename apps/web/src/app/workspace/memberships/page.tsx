'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
 FileText,
 Plus,
 Search,
 Filter,
 Layers,
 MapPin,
 Clock,
 DollarSign,
 Users,
 CheckCircle,
 HelpCircle,
 MoreVertical,
 Activity,
 Calendar,
 Lock,
 Shield,
 TrendingUp,
 Inbox,
 AlertTriangle,
 CreditCard,
 History
} from 'lucide-react';
import { orgApi, gymApi, membershipsApi } from '../../../lib/api';
import MembershipsTabs from './MembershipsTabs';

interface MembershipPlan {
 id: string;
 name: string;
 code: string;
 description?: string;
 category: string;
 status: 'Draft' | 'Active' | 'Inactive' | 'Archived';
 durationType: 'Days' | 'Weeks' | 'Months' | 'Years';
 durationValue: number;
 basePrice: number;
 joiningFee: number;
 taxPercentage: number;
 branchAccess: 'all' | string[];
 benefits: string[];
 enrolledCount?: number;
 revenueGenerated?: number;
}

export default function MembershipPlansListingPage() {
 const router = useRouter();

 // States
 const [loading, setLoading] = useState(true);
 const [plans, setPlans] = useState<MembershipPlan[]>([]);
 const [activeOrg, setActiveOrg] = useState<any>(null);
 const [branches, setBranches] = useState<any[]>([]);
 const [searchQuery, setSearchQuery] = useState('');
 const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
 const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
 const [userRole, setUserRole] = useState('owner');
 const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
 const [showBulkConfirmation, setShowBulkConfirmation] = useState<boolean>(false);
 const [bulkActionType, setBulkActionType] = useState<'Active' | 'Inactive' | 'Archived' | null>(null);

 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 const parseBenefits = (benefits: any): string[] => {
 if (!benefits) return [];
 if (Array.isArray(benefits)) return benefits;
 if (typeof benefits === 'string') {
 const trimmed = benefits.trim();
 if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
 try {
 return JSON.parse(trimmed);
 } catch (_) { }
 }
 return trimmed.split(',').map(b => b.trim()).filter(Boolean);
 }
 return [];
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

 // Fetch organization settings
 const orgs = await orgApi.list();
 const matchedOrg = orgs.find(o => o.id === orgId);
 if (matchedOrg) {
 setActiveOrg(matchedOrg);
 }

 // Fetch plans from DB
 const dbPlans = await membershipsApi.listPlans();
 setPlans(dbPlans || []);
 } catch (err) {
 console.error(err);
 showToast('Failed to load membership plans', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, []);

 const handleUpdateStatus = async (planId: string, newStatus: 'Draft' | 'Active' | 'Inactive' | 'Archived') => {
 try {
 await membershipsApi.updatePlan(planId, { status: newStatus });
 const updatedPlans = plans.map(p => {
 if (p.id === planId) {
 return { ...p, status: newStatus };
 }
 return p;
 });
 setPlans(updatedPlans);
 showToast(`Plan status updated to ${newStatus}`);
 } catch (_) {
 showToast('Failed to update plan status', 'error');
 }
 };

 const handleToggleArchive = async (planId: string) => {
 const plan = plans.find(p => p.id === planId);
 if (!plan) return;
 const nextStatus = plan.status === 'Archived' ? 'Draft' : 'Archived';
 await handleUpdateStatus(planId, nextStatus);
 };

 const handleBulkAction = async () => {
 if (!bulkActionType) return;
 try {
 setLoading(true);
 for (const id of selectedPlanIds) {
 await membershipsApi.updatePlan(id, { status: bulkActionType });
 }
 showToast(`Selected plans successfully transitioned to ${bulkActionType}`);
 setSelectedPlanIds([]);
 setShowBulkConfirmation(false);
 loadData();
 } catch (_) {
 showToast('Failed to apply bulk status changes', 'error');
 } finally {
 setLoading(false);
 }
 };

 const canEdit = userRole === 'owner' || userRole === 'manager';
 const isTrainerOrDietitian = userRole === 'trainer' || userRole === 'dietitian';

 // Filters
 const filteredPlans = plans.filter(p => {
 const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 p.code.toLowerCase().includes(searchQuery.toLowerCase());
 const matchesStatus = selectedStatusFilter === 'all' || p.status.toLowerCase() === selectedStatusFilter.toLowerCase();
 const matchesCategory = selectedCategoryFilter === 'all' || p.category.toLowerCase() === selectedCategoryFilter.toLowerCase();
 return matchesSearch && matchesStatus && matchesCategory;
 });

 const getBranchNames = (access: any) => {
 if (!access) return 'No Access';
 if (access === 'all') return 'All Branches';
 const accessArray = typeof access === 'string' ? access.split(',') : access;
 if (!Array.isArray(accessArray)) return 'No Access';
 return accessArray.map(id => {
 const b = branches.find(x => x.id === id.trim());
 return b ? b.name : 'Unknown Branch';
 }).join(', ');
 };

 const getStatusBadge = (status: string) => {
 const s = status.toLowerCase();
 if (s === 'active') return 'bg-success-light text-success border-green-200';
 if (s === 'draft') return 'bg-neutral-100/20 text-neutral-600 border-neutral-200/30';
 if (s === 'inactive') return 'bg-warning-light text-amber-700 border-amber-200';
 return 'bg-danger-light text-danger border-red-200'; // Archived
 };

 if (loading) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Fetching membership plan catalog...
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-white text-neutral-900 p-8 space-y-6 relative overflow-hidden">

 {/* Toast Notification */}
 {toast && (
 <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border ${toast.type === 'success'
 ? 'bg-success-light text-success border-green-200'
 : 'bg-danger-light text-danger border-red-200'
 }`}>
 <span className="text-sm font-medium">{toast.message}</span>
 </div>
 )}

 {/* HEADER BAR */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-200/80 pb-6">
 <div>
 <h1 className="text-2xl font-bold text-neutral-900 font-display flex items-center gap-2">
 <FileText className="w-6 h-6 text-danger" />
 Memberships Hub
 </h1>
 <p className="text-xs text-neutral-600 mt-1">Design, track, and manage membership agreement templates and subscription lifecycles.</p>
 </div>

 <div className="flex gap-2">
 {canEdit && (
 <button
 onClick={() => router.push('/workspace/memberships/purchase')}
 className="px-4 py-2.5 bg-neutral-50 border border-neutral-200 hover:text-neutral-900 text-neutral-700 text-xs font-semibold rounded-xl transition flex items-center gap-2"
 >
 <CreditCard className="w-4 h-4 text-danger" />
 <span>Sell Membership</span>
 </button>
 )}

 {canEdit && (
 <button
 onClick={() => router.push('/workspace/memberships/create')}
 className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-neutral-900 text-xs font-semibold rounded-xl transition flex items-center gap-2 shadow-lg"
 >
 <Plus className="w-4 h-4" />
 <span>Create Plan</span>
 </button>
 )}
 </div>
 </div>

 {/* TABS ROW */}
 <MembershipsTabs />

 {/* OVERVIEW METRICS SECTION */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
 <div className="bg-white border border-neutral-200/60 p-5 rounded-2xl flex items-center gap-4 backdrop-blur-md">
 <div className="w-10 h-10 rounded-xl bg-danger-light border border-red-200 flex items-center justify-center text-danger">
 <Layers className="w-5 h-5" />
 </div>
 <div>
 <span className="text-[10px] text-neutral-500 block uppercase font-mono">Total Plans</span>
 <span className="text-lg font-bold text-neutral-900">{plans.length}</span>
 </div>
 </div>

 <div className="bg-white border border-neutral-200/60 p-5 rounded-2xl flex items-center gap-4 backdrop-blur-md">
 <div className="w-10 h-10 rounded-xl bg-success-light border border-green-200 flex items-center justify-center text-success">
 <CheckCircle className="w-5 h-5" />
 </div>
 <div>
 <span className="text-[10px] text-neutral-500 block uppercase font-mono">Active Packages</span>
 <span className="text-lg font-bold text-neutral-900">{plans.filter(p => p.status === 'Active').length}</span>
 </div>
 </div>

 <div className="bg-white border border-neutral-200/60 p-5 rounded-2xl flex items-center gap-4 backdrop-blur-md">
 <div className="w-10 h-10 rounded-xl bg-primary-light border border-primary/20 flex items-center justify-center text-primary">
 <Users className="w-5 h-5" />
 </div>
 <div>
 <span className="text-[10px] text-neutral-500 block uppercase font-mono">Total Enrolled</span>
 <span className="text-lg font-bold text-neutral-900">
 {plans.reduce((sum, p) => sum + (p.enrolledCount || 0), 0)} members
 </span>
 </div>
 </div>

 <div className="bg-white border border-neutral-200/60 p-5 rounded-2xl flex items-center gap-4 backdrop-blur-md">
 <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
 <DollarSign className="w-5 h-5" />
 </div>
 <div>
 <span className="text-[10px] text-neutral-500 block uppercase font-mono">Total Revenue</span>
 <span className="text-lg font-bold text-neutral-900">
 ₹{plans.reduce((sum, p) => sum + (p.revenueGenerated || 0), 0).toLocaleString()}
 </span>
 </div>
 </div>
 </div>

 {/* FILTER CONTROLS */}
 <div className="bg-white border border-neutral-200/60 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between">
 <div className="flex flex-1 items-center gap-3 min-w-[280px]">
 <div className="relative flex-1">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
 <input
 type="text"
 placeholder="Search by plan name or code..."
 className="w-full bg-white border border-neutral-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-red-200"
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 />
 </div>
 </div>

 <div className="flex items-center gap-3">
 {/* Status filter */}
 <select
 className="bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-700 focus:outline-none"
 value={selectedStatusFilter}
 onChange={e => setSelectedStatusFilter(e.target.value)}
 >
 <option value="all">All Statuses</option>
 <option value="active">Active</option>
 <option value="draft">Draft</option>
 <option value="inactive">Inactive</option>
 <option value="archived">Archived</option>
 </select>

 {/* Category filter */}
 <select
 className="bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-700 focus:outline-none"
 value={selectedCategoryFilter}
 onChange={e => setSelectedCategoryFilter(e.target.value)}
 >
 <option value="all">All Categories</option>
 <option value="monthly">Monthly</option>
 <option value="yearly">Yearly</option>
 <option value="student">Student</option>
 <option value="corporate">Corporate</option>
 <option value="custom">Custom</option>
 </select>
 </div>
 </div>

 {/* PLAN GRID & CARDS */}
 {filteredPlans.length === 0 ? (
 <div className="p-16 text-center max-w-sm mx-auto flex flex-col items-center bg-neutral-50/10 border border-neutral-200/40 rounded-3xl">
 <Inbox className="text-neutral-400 mb-4" size={40} />
 <h3 className="text-sm font-bold text-neutral-900">No Plans Configured</h3>
 <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
 There are no membership plans matching your criteria. Get started by designing your first gym package template.
 </p>
 {canEdit && (
 <button
 onClick={() => router.push('/workspace/memberships/create')}
 className="mt-6 px-4 py-2.5 bg-primary hover:bg-primary-hover text-neutral-900 text-xs font-semibold rounded-xl transition shadow-lg"
 >
 Add Membership Plan
 </button>
 )}
 </div>
 ) : (
 <div className="space-y-4">
 {/* BULK ACTION BAR */}
 {selectedPlanIds.length > 0 && (
 <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 flex justify-between items-center text-xs animate-slide-in">
 <span className="font-semibold text-neutral-700">{selectedPlanIds.length} plans selected</span>
 <div className="flex gap-2">
 <button
 onClick={() => { setBulkActionType('Active'); setShowBulkConfirmation(true); }}
 className="px-3 py-1.5 bg-success-light border border-green-200 hover:bg-neutral-100 text-success font-bold uppercase rounded-lg transition"
 >
 Bulk Activate
 </button>
 <button
 onClick={() => { setBulkActionType('Inactive'); setShowBulkConfirmation(true); }}
 className="px-3 py-1.5 bg-warning-light border border-amber-200 hover:bg-neutral-100 text-amber-700 font-bold uppercase rounded-lg transition"
 >
 Bulk Deactivate
 </button>
 <button
 onClick={() => { setBulkActionType('Archived'); setShowBulkConfirmation(true); }}
 className="px-3 py-1.5 bg-danger-light border border-red-200 hover:bg-neutral-100 text-danger font-bold uppercase rounded-lg transition"
 >
 Bulk Archive
 </button>
 <button
 onClick={() => setSelectedPlanIds([])}
 className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-800 rounded-lg transition"
 >
 Clear Selection
 </button>
 </div>
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
 {filteredPlans.map((plan) => {
 const benefits = parseBenefits(plan.benefits);
 const totalPrice = plan.taxPercentage > 0
 ? plan.basePrice * (1 + plan.taxPercentage / 100)
 : plan.basePrice;
 const categoryColors: Record<string, string> = {
 Standard: 'from-blue-500 to-blue-400',
 Premium: 'from-violet-500 to-purple-400',
 VIP: 'from-amber-500 to-orange-400',
 Student: 'from-emerald-500 to-green-400',
 Corporate: 'from-sky-500 to-cyan-400',
 };
 const accentGradient = categoryColors[plan.category] || 'from-neutral-400 to-neutral-300';

 return (
 <div
 key={plan.id}
 className="bg-white border border-neutral-200 hover:border-neutral-300 hover:shadow-lg rounded-2xl overflow-hidden flex flex-col transition-all duration-200"
 >
 {/* Top gradient strip */}
 <div className={`h-1 w-full bg-gradient-to-r ${accentGradient}`} />

 <div className="p-5 flex flex-col flex-1">
 {/* Header row: checkbox + name + status */}
 <div className="flex items-start justify-between gap-3 mb-4">
 <div className="flex items-start gap-2.5 min-w-0">
 <input
 type="checkbox"
 className="mt-0.5 shrink-0 w-4 h-4 rounded border-neutral-300 text-primary focus:ring-0 cursor-pointer"
 checked={selectedPlanIds.includes(plan.id)}
 onChange={(e) => {
 const checked = e.target.checked;
 setSelectedPlanIds(prev => checked ? [...prev, plan.id] : prev.filter(id => id !== plan.id));
 }}
 />
 <div className="min-w-0">
 <div className="flex items-center gap-1.5 mb-1">
 <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">{plan.category}</span>
 <span className="text-neutral-200">·</span>
 <span className="text-[9px] font-mono text-neutral-400">{plan.code}</span>
 </div>
 <h3 className="text-sm font-bold text-neutral-900 leading-snug truncate">{plan.name}</h3>
 </div>
 </div>
 <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${getStatusBadge(plan.status)}`}>
 {plan.status}
 </span>
 </div>

 {/* Price hero block */}
 <div className="bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 mb-4">
 <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium mb-1">Membership Price</p>
 <div className="flex items-baseline gap-1.5">
 <span className="text-2xl font-extrabold text-neutral-900 tracking-tight">₹{plan.basePrice.toLocaleString()}</span>
 <span className="text-xs text-neutral-400 font-medium">/ {plan.durationValue} {plan.durationType}</span>
 </div>
 <div className="flex items-center gap-3 mt-1.5 text-[10px] text-neutral-400">
 {plan.joiningFee > 0 && (
 <span>+₹{plan.joiningFee.toLocaleString()} joining fee</span>
 )}
 {plan.taxPercentage > 0 && (
 <span>+{plan.taxPercentage}% tax → ₹{Math.round(totalPrice).toLocaleString()} total</span>
 )}
 </div>
 </div>

 {/* Description */}
 {plan.description && (
 <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2 mb-4">
 {plan.description}
 </p>
 )}

 {/* Branch */}
 <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 mb-3">
 <MapPin size={11} className="shrink-0 text-neutral-400" />
 <span className="truncate">{getBranchNames(plan.branchAccess)}</span>
 </div>

 {/* Benefits chips */}
 {benefits.length > 0 && (
 <div className="flex flex-wrap gap-1 mb-4">
 {benefits.slice(0, 4).map((b, idx) => (
 <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-medium rounded-full">
 {b}
 </span>
 ))}
 {benefits.length > 4 && (
 <span className="px-2 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] font-medium rounded-full border border-neutral-200">
 +{benefits.length - 4} more
 </span>
 )}
 </div>
 )}

 <div className="flex-1" />

 {/* Stats bar */}
 <div className="flex items-center justify-between py-3 border-t border-neutral-100 text-[10px] text-neutral-500 mb-3">
 <div className="flex items-center gap-1.5">
 <Users size={11} className="text-neutral-400" />
 <span><strong className="text-neutral-700 font-semibold">{plan.enrolledCount || 0}</strong> enrolled</span>
 </div>
 <div className="flex items-center gap-1.5 font-mono">
 <DollarSign size={11} className="text-neutral-400" />
 <span><strong className="text-neutral-700 font-semibold">₹{(plan.revenueGenerated || 0).toLocaleString()}</strong> revenue</span>
 </div>
 </div>

 {/* Actions row — always visible */}
 <div className="flex items-center gap-1.5">
 <button
 onClick={() => router.push(`/workspace/memberships/${plan.id}`)}
 className="flex-1 py-1.5 text-[10px] font-semibold text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg transition"
 >
 View
 </button>
 {canEdit && (
 <>
 <button
 onClick={() => router.push(`/workspace/memberships/${plan.id}/edit`)}
 className="flex-1 py-1.5 text-[10px] font-semibold text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg transition"
 >
 Edit
 </button>
 {plan.status !== 'Active' && (
 <button
 onClick={() => handleUpdateStatus(plan.id, 'Active')}
 className="flex-1 py-1.5 text-[10px] font-semibold text-success bg-success-light hover:bg-green-100 border border-green-200 rounded-lg transition"
 >
 Publish
 </button>
 )}
 <button
 onClick={() => handleToggleArchive(plan.id)}
 className="py-1.5 px-2.5 text-[10px] font-semibold text-danger bg-white hover:bg-danger-light border border-red-100 rounded-lg transition"
 title={plan.status === 'Archived' ? 'Restore' : 'Archive'}
 >
 {plan.status === 'Archived' ? '↩' : '⊘'}
 </button>
 </>
 )}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* BULK CONFIRMATION MODAL */}
 {showBulkConfirmation && (
 <div className="fixed inset-0 bg-neutral-50/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
 <div className="flex items-center gap-3">
 <AlertTriangle className="w-5 h-5 text-amber-700" />
 <h3 className="text-base font-bold text-neutral-900 font-display">Confirm Bulk Transition</h3>
 </div>
 <p className="text-xs text-neutral-600 leading-relaxed font-mono">
 Are you sure you want to transition **{selectedPlanIds.length} selected plans** to status **{bulkActionType}**?
 </p>
 <div className="flex gap-3 justify-end pt-2">
 <button
 type="button"
 onClick={() => setShowBulkConfirmation(false)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={handleBulkAction}
 className="px-4 py-2 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Confirm Bulk Action
 </button>
 </div>
 </div>
 </div>
 )}

 </div>
 );
}
