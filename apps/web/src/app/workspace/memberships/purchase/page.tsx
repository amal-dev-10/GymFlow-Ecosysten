'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
 Users,
 FileText,
 Search,
 Filter,
 MapPin,
 Clock,
 DollarSign,
 CheckCircle,
 Plus,
 Trash2,
 Lock,
 ArrowRight,
 ChevronLeft,
 Percent,
 Calendar,
 AlertTriangle,
 CreditCard,
 Printer,
 Mail,
 RefreshCw,
 Bell,
 Check,
 UserPlus,
 Sparkles,
 Info,
 Layers,
 ArrowLeft
} from 'lucide-react';
import { gymApi, rolesApi, membersApi, membershipsApi } from '../../../../lib/api';

export default function PurchaseMembershipPage() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const initialMemberId = searchParams.get('memberId');

 // Page States
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [step, setStep] = useState(1);
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 // Fetch lists
 const [members, setMembers] = useState<any[]>([]);
 const [plans, setPlans] = useState<any[]>([]);
 const [branches, setBranches] = useState<any[]>([]);
 const [staff, setStaff] = useState<any[]>([]);

 // Selection state
 const [selectedMember, setSelectedMember] = useState<any>(null);
 const [selectedPlan, setSelectedPlan] = useState<any>(null);

 // Search/Filters
 const [memberSearchQuery, setMemberSearchQuery] = useState('');
 const [planSearchQuery, setPlanSearchQuery] = useState('');
 const [selectedPlanCategory, setSelectedPlanCategory] = useState('all');
 const [selectedPlanBranch, setSelectedPlanBranch] = useState('all');

 // Configuration
 const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
 const [endDate, setEndDate] = useState('');
 const [assignedTrainerId, setAssignedTrainerId] = useState('');
 const [assignedDietitianId, setAssignedDietitianId] = useState('');
 const [salesExecutive, setSalesExecutive] = useState('');

 // Add-ons
 const [addOns, setAddOns] = useState({
 personalTraining: false,
 dietConsultation: false,
 lockerRental: false,
 parkingAccess: false,
 groupClasses: false,
 });

 const addOnPrices = {
 personalTraining: 5000,
 dietConsultation: 2500,
 lockerRental: 800,
 parkingAccess: 1200,
 groupClasses: 1800,
 };

 // Discount
 const [discountType, setDiscountType] = useState<'None' | 'Fixed' | 'Percentage'>('None');
 const [discountValue, setDiscountValue] = useState(0);
 const [couponCode, setCouponCode] = useState('');
 const [discountReason, setDiscountReason] = useState('');
 const [approvedBy, setApprovedBy] = useState('');

 // Payment State
 const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Split'>('UPI');
 const [splitAmounts, setSplitAmounts] = useState({
 Cash: 0,
 UPI: 0,
 Card: 0
 });
 
 // Quick Create Member State
 const [showNewMemberDrawer, setShowNewMemberDrawer] = useState(false);
 const [newMemberForm, setNewMemberForm] = useState({
 firstName: '',
 lastName: '',
 phone: '',
 email: '',
 gender: 'Male',
 homeGymId: ''
 });

 // Invoice / Success details
 const [successInfo, setSuccessInfo] = useState<any>(null);

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 const loadData = async () => {
 try {
 setLoading(true);
 const orgId = localStorage.getItem('organizationId') || '';

 // Branches
 const branchList = await gymApi.list(orgId);
 setBranches(branchList || []);

 // Members
 const memberList = await membersApi.list({ homeGymId: undefined });
 setMembers(memberList || []);

 // Active Plans
 const dbPlans = await membershipsApi.listPlans();
 const activeOnly = (dbPlans || []).filter((p: any) => p.status === 'Active');
 setPlans(activeOnly);

 // Employees (Trainers/Dietitians)
 const employeeList = await rolesApi.getEmployees();
 setStaff(employeeList || []);

 // Pre-select member if query param present
 if (initialMemberId) {
 const matched = memberList.find((m: any) => m.id === initialMemberId);
 if (matched) {
 setSelectedMember(matched);
 setStep(2); // Jump to plan selection
 }
 }

 } catch (err) {
 console.error(err);
 showToast('Failed to load purchase configurations', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [initialMemberId]);

 // Recalculate end date based on plan selection & start date
 useEffect(() => {
 if (!selectedPlan) return;
 const start = new Date(startDate);
 const val = selectedPlan.durationValue;
 const type = selectedPlan.durationType.toLowerCase(); // days, weeks, months, years
 
 if (type.includes('month')) {
 start.setMonth(start.getMonth() + val);
 } else if (type.includes('week')) {
 start.setDate(start.getDate() + val * 7);
 } else if (type.includes('year')) {
 start.setFullYear(start.getFullYear() + val);
 } else {
 start.setDate(start.getDate() + val);
 }

 setEndDate(start.toISOString().split('T')[0]);
 }, [selectedPlan, startDate]);

 // Parse benefits safely
 const parseBenefits = (benefits: any): string[] => {
 if (!benefits) return [];
 if (Array.isArray(benefits)) return benefits;
 if (typeof benefits === 'string') {
 const trimmed = benefits.trim();
 if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
 try {
 return JSON.parse(trimmed);
 } catch (_) {}
 }
 return trimmed.split(',').map(b => b.trim()).filter(Boolean);
 }
 return [];
 };

 // Calculations
 const getPricingSummary = () => {
 if (!selectedPlan) {
 return {
 baseFee: 0,
 joiningFee: 0,
 addOnsTotal: 0,
 subtotalBeforeDiscount: 0,
 discountAmount: 0,
 taxableAmount: 0,
 taxAmount: 0,
 totalPayable: 0
 };
 }

 const baseFee = selectedPlan.basePrice || 0;
 const joiningFee = selectedPlan.joiningFee || 0;
 
 // Add-ons
 let addOnsTotal = 0;
 if (addOns.personalTraining) addOnsTotal += addOnPrices.personalTraining;
 if (addOns.dietConsultation) addOnsTotal += addOnPrices.dietConsultation;
 if (addOns.lockerRental) addOnsTotal += addOnPrices.lockerRental;
 if (addOns.parkingAccess) addOnsTotal += addOnPrices.parkingAccess;
 if (addOns.groupClasses) addOnsTotal += addOnPrices.groupClasses;

 const subtotalBeforeDiscount = baseFee + joiningFee + addOnsTotal;

 // Discount
 let discountAmount = 0;
 if (discountType === 'Fixed') {
 discountAmount = Math.min(discountValue, subtotalBeforeDiscount);
 } else if (discountType === 'Percentage') {
 discountAmount = Math.round((subtotalBeforeDiscount * discountValue) / 100);
 }

 const taxableAmount = Math.max(0, subtotalBeforeDiscount - discountAmount);
 
 // Tax (Plan specific tax percentage or default 18%)
 const taxRate = selectedPlan.taxPercentage >= 0 ? selectedPlan.taxPercentage : 18;
 const taxAmount = Math.round((taxableAmount * taxRate) / 100);

 const totalPayable = taxableAmount + taxAmount;

 return {
 baseFee,
 joiningFee,
 addOnsTotal,
 subtotalBeforeDiscount,
 discountAmount,
 taxableAmount,
 taxAmount,
 totalPayable
 };
 };

 const pricing = getPricingSummary();

 // Handle Quick Create Member Submit
 const handleQuickCreateMember = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newMemberForm.firstName || !newMemberForm.lastName || !newMemberForm.phone || !newMemberForm.homeGymId) {
 showToast('Please fill out all required fields', 'error');
 return;
 }

 try {
 setSaving(true);
 const payload = {
 homeGymId: newMemberForm.homeGymId,
 firstName: newMemberForm.firstName,
 lastName: newMemberForm.lastName,
 phoneNumber: newMemberForm.phone,
 dob: new Date(new Date().setFullYear(new Date().getFullYear() - 25)).toISOString().split('T')[0], // placeholder age 25
 gender: newMemberForm.gender,
 aiInsights: {
 email: newMemberForm.email,
 status: 'Active',
 source: 'Walk-In'
 }
 };

 const result = await membersApi.create(payload);
 showToast('Member created successfully');
 
 // Refresh members list and auto-select new member
 const memberList = await membersApi.list({ homeGymId: undefined });
 setMembers(memberList || []);
 
 const newCreated = memberList.find((m: any) => m.id === result.id || m.phoneNumber === newMemberForm.phone);
 if (newCreated) {
 setSelectedMember(newCreated);
 } else {
 setSelectedMember(result);
 }

 setShowNewMemberDrawer(false);
 setStep(2); // advance
 } catch (err) {
 console.error(err);
 showToast('Failed to create new member', 'error');
 } finally {
 setSaving(false);
 }
 };

 // Handle Purchase Checkout Submit
 const handlePurchaseSubmit = async (status: 'Active' | 'Pending Payment') => {
 if (!selectedMember || !selectedPlan) {
 showToast('Member or plan not selected', 'error');
 return;
 }

 try {
 setSaving(true);

 const payload = {
 memberId: selectedMember.id,
 membershipPlanId: selectedPlan.id,
 startDate: startDate,
 endDate: endDate,
 amountPaid: status === 'Active' ? pricing.totalPayable : 0,
 status: status
 };

 const result = await membershipsApi.purchaseMembership(payload);

 // Generate invoice codes
 const invNum = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
 const membNum = `MEMB-2026-${Math.floor(1000 + Math.random() * 9000)}`;

 setSuccessInfo({
 invoiceNumber: invNum,
 membershipNumber: membNum,
 member: selectedMember,
 plan: selectedPlan,
 totalPaid: status === 'Active' ? pricing.totalPayable : 0,
 paymentStatus: status === 'Active' ? 'Paid' : 'Pending Payment',
 startDate,
 endDate
 });

 showToast('Membership purchased successfully!');
 setStep(7); // success state step
 } catch (err) {
 console.error(err);
 showToast('Failed to purchase membership', 'error');
 } finally {
 setSaving(false);
 }
 };

 // Filter members
 const filteredMembers = members.filter(m => {
 const q = memberSearchQuery.toLowerCase();
 const nameStr = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase();
 const phoneStr = (m.phoneNumber || '').toLowerCase();
 const idStr = (m.id || '').toLowerCase();
 return nameStr.includes(q) || phoneStr.includes(q) || idStr.includes(q);
 });

 // Filter plans
 const filteredPlans = plans.filter(p => {
 const q = planSearchQuery.toLowerCase();
 const nameStr = (p.name || '').toLowerCase();
 const codeStr = (p.code || '').toLowerCase();
 const matchesQuery = nameStr.includes(q) || codeStr.includes(q);

 const matchesCategory = selectedPlanCategory === 'all' || p.category.toLowerCase() === selectedPlanCategory.toLowerCase();
 const matchesBranch = selectedPlanBranch === 'all' || p.branchAccess === 'all' || (p.branchAccess || '').split(',').includes(selectedPlanBranch);

 return matchesQuery && matchesCategory && matchesBranch;
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
 if (s === 'inactive') return 'bg-warning-light text-amber-700 border-amber-200';
 return 'bg-neutral-100/20 text-neutral-600 border-neutral-200/30';
 };

 if (loading) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Initializing Checkout Terminal...
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-white text-neutral-900 p-8 space-y-6 relative overflow-hidden flex flex-col justify-between">
 
 {/* BACKGROUND GLOW */}

 {/* TOAST */}
 {toast && (
 <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border ${
 toast.type === 'success' 
 ? 'bg-success-light text-success border-green-200' 
 : 'bg-danger-light text-danger border-red-200'
 }`}>
 <span className="text-sm font-medium">{toast.message}</span>
 </div>
 )}

 {/* MAIN CHECKOUT CONTAINER */}
 <div className="max-w-6xl mx-auto w-full space-y-6 flex-1 flex flex-col justify-between">
 
 {/* HEADER */}
 {step < 7 && (
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-200/80 pb-6 shrink-0">
 <div className="flex items-center gap-3">
 <button
 onClick={() => {
 if (step > 1) setStep(prev => prev - 1);
 else router.push('/workspace/memberships');
 }}
 className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 hover:text-neutral-800 transition"
 >
 <ArrowLeft size={16} />
 </button>
 <div>
 <h1 className="text-xl font-bold font-display text-neutral-900 flex items-center gap-2">
 <CreditCard className="w-5 h-5 text-danger" />
 Membership Purchase Terminal
 </h1>
 <p className="text-xs text-neutral-600 mt-1">Stripe-style membership checkout workflow.</p>
 </div>
 </div>

 {/* Stepper Steps */}
 <div className="flex items-center gap-1.5 font-mono text-[10px] text-neutral-500">
 {[
 'Member',
 'Plan',
 'Configure',
 'Pricing',
 'Payment',
 'Confirm'
 ].map((name, idx) => (
 <div key={idx} className="flex items-center gap-1.5">
 <span className={`px-2 py-0.5 rounded-md border font-bold ${
 step === idx + 1 
 ? 'bg-danger-light text-danger border-red-200' 
 : step > idx + 1 
 ? 'bg-success-light text-success border-green-200' 
 : 'bg-neutral-50/20 border-neutral-200'
 }`}>
 {idx + 1}
 </span>
 <span className={step === idx + 1 ? 'text-neutral-800 font-semibold' : ''}>{name}</span>
 {idx < 5 && <span className="text-neutral-400">→</span>}
 </div>
 ))}
 </div>
 </div>
 )}

 {/* STEP-BY-STEP SCREENS */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-4 flex-1 items-start">
 
 {/* STEP CONTENT SECTION (Col span 2) */}
 <div className="lg:col-span-2 space-y-6">
 
 {/* STEP 1: MEMBER SELECTION */}
 {step === 1 && (
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h3 className="text-sm font-bold text-neutral-900 font-display">Step 1: Select Member</h3>
 <p className="text-xs text-neutral-600 mt-0.5">Identify or register the member purchasing this agreement.</p>
 </div>
 <button
 type="button"
 onClick={() => setShowNewMemberDrawer(true)}
 className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 hover:text-neutral-900 text-xs font-semibold rounded-xl transition flex items-center gap-2"
 >
 <UserPlus size={14} className="text-danger" />
 <span>Quick Create Member</span>
 </button>
 </div>

 {/* Member Search input */}
 <div className="relative">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
 <input
 type="text"
 placeholder="Search by name, email, phone, or member ID..."
 className="w-full bg-white border border-neutral-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-red-200 font-sans"
 value={memberSearchQuery}
 onChange={e => setMemberSearchQuery(e.target.value)}
 />
 </div>

 {/* Members list */}
 <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
 {filteredMembers.length === 0 ? (
 <div className="p-12 text-center text-xs text-neutral-500 border border-dashed border-neutral-200 rounded-2xl">
 No members match search query. Click"Quick Create Member" above.
 </div>
 ) : (
 filteredMembers.slice(0, 5).map(m => (
 <div
 key={m.id}
 onClick={() => setSelectedMember(m)}
 className={`p-4 border rounded-2xl cursor-pointer flex justify-between items-center transition ${
 selectedMember?.id === m.id 
 ? 'bg-danger-light border-red-200 text-neutral-900' 
 : 'bg-neutral-50/10 border-neutral-200 hover:border-neutral-200 text-neutral-700'
 }`}
 >
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center border border-neutral-200 text-xs font-bold text-neutral-600">
 {m.firstName?.[0]}{m.lastName?.[0]}
 </div>
 <div>
 <span className="text-xs font-bold text-neutral-800 block">{m.firstName} {m.lastName}</span>
 <span className="text-[10px] text-neutral-500 block font-mono">ID: {m.id} • Phone: {m.phoneNumber}</span>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
 m.aiInsights?.status === 'Active' ? 'bg-success-light text-success border-green-200' : 'bg-neutral-100/20 text-neutral-600 border-neutral-200/30'
 }`}>
 {m.aiInsights?.status || 'Inactive'}
 </span>
 {selectedMember?.id === m.id && <CheckCircle className="text-danger w-4.5 h-4.5" />}
 </div>
 </div>
 ))
 )}
 </div>

 {selectedMember && (
 <div className="flex justify-end pt-2">
 <button
 onClick={() => setStep(2)}
 className="px-4 py-2 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
 <span>Next: Select Plan</span>
 <ArrowRight size={14} />
 </button>
 </div>
 )}
 </div>
 )}

 {/* STEP 2: PLAN SELECTION */}
 {step === 2 && (
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-900 font-display font-semibold">Step 2: Choose Membership Plan</h3>
 <p className="text-xs text-neutral-600 mt-0.5">Select a subscription package to configure.</p>
 </div>

 {/* Filters */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 <input
 type="text"
 placeholder="Filter plans..."
 className="bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs text-neutral-900 focus:outline-none"
 value={planSearchQuery}
 onChange={e => setPlanSearchQuery(e.target.value)}
 />
 <select
 className="bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs text-neutral-700 focus:outline-none"
 value={selectedPlanCategory}
 onChange={e => setSelectedPlanCategory(e.target.value)}
 >
 <option value="all">All Categories</option>
 <option value="monthly">Monthly</option>
 <option value="yearly">Yearly</option>
 <option value="corporate">Corporate</option>
 <option value="student">Student</option>
 </select>
 <select
 className="bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs text-neutral-700 focus:outline-none"
 value={selectedPlanBranch}
 onChange={e => setSelectedPlanBranch(e.target.value)}
 >
 <option value="all">All Branches</option>
 {branches.map(b => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>
 </div>

 {/* Plan catalog grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-1">
 {filteredPlans.map(p => (
 <div
 key={p.id}
 onClick={() => setSelectedPlan(p)}
 className={`p-4 border rounded-2xl cursor-pointer flex flex-col justify-between transition min-h-[160px] ${
 selectedPlan?.id === p.id 
 ? 'bg-danger-light border-red-200 text-neutral-900' 
 : 'bg-neutral-50/10 border-neutral-200 hover:border-neutral-200 text-neutral-700'
 }`}
 >
 <div>
 <div className="flex justify-between items-start">
 <span className="text-[9px] text-neutral-500 font-mono uppercase block">{p.category}</span>
 {selectedPlan?.id === p.id && <CheckCircle size={14} className="text-danger" />}
 </div>
 <h4 className="text-xs font-bold text-neutral-900 mt-1">{p.name}</h4>
 <span className="text-[9px] text-neutral-500 block font-mono mt-0.5">Code: {p.code}</span>
 
 {/* Benefits list */}
 <div className="flex flex-wrap gap-1 mt-2.5">
 {parseBenefits(p.benefits).slice(0, 3).map((b, idx) => (
 <span key={idx} className="px-1.5 py-0.5 rounded bg-neutral-50/40 text-[9px] text-neutral-500 font-sans border border-neutral-200">
 {b}
 </span>
 ))}
 </div>
 </div>

 <div className="border-t border-neutral-200/60 pt-3 mt-3 flex justify-between items-center text-xs font-mono">
 <div>
 <span className="text-success font-bold block">₹{p.basePrice.toLocaleString()}</span>
 </div>
 <span className="text-neutral-600 font-semibold">{p.durationValue} {p.durationType}</span>
 </div>
 </div>
 ))}
 </div>

 {selectedPlan && (
 <div className="flex justify-between pt-2">
 <button
 onClick={() => setStep(1)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition"
 >
 Back
 </button>
 <button
 onClick={() => setStep(3)}
 className="px-4 py-2 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
 <span>Next: Configure</span>
 <ArrowRight size={14} />
 </button>
 </div>
 )}
 </div>
 )}

 {/* STEP 3: MEMBERSHIP CONFIGURATION */}
 {step === 3 && (
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-900 font-display font-semibold">Step 3: Configuration & Add-ons</h3>
 <p className="text-xs text-neutral-600 mt-0.5">Customize timelines, assign employees, and choose optional packages.</p>
 </div>

 {/* Date selections & staff */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Start Date</label>
 <input
 type="date"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={startDate}
 onChange={e => setStartDate(e.target.value)}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">End Date (Auto-calculated)</label>
 <input
 type="date"
 disabled
 className="w-full bg-neutral-50/50 border border-neutral-200/60 rounded-xl px-4 py-2.5 text-xs text-neutral-500 cursor-not-allowed"
 value={endDate}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Assign Trainer</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={assignedTrainerId}
 onChange={e => setAssignedTrainerId(e.target.value)}
 >
 <option value="">No Trainer Assigned</option>
 {staff.filter(s => (s.role || '').toLowerCase().includes('trainer')).map(s => (
 <option key={s.id} value={s.id}>{s.name}</option>
 ))}
 </select>
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Assign Dietitian</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={assignedDietitianId}
 onChange={e => setAssignedDietitianId(e.target.value)}
 >
 <option value="">No Dietitian Assigned</option>
 {staff.filter(s => (s.role || '').toLowerCase().includes('diet')).map(s => (
 <option key={s.id} value={s.id}>{s.name}</option>
 ))}
 </select>
 </div>
 </div>

 {/* Optional Add-ons */}
 <div className="space-y-3">
 <span className="text-[10px] text-neutral-600 font-mono uppercase font-semibold block">Optional Service Add-ons</span>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {Object.entries(addOnPrices).map(([key, price]) => {
 const typedKey = key as keyof typeof addOns;
 const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
 return (
 <div
 key={key}
 onClick={() => setAddOns(prev => ({ ...prev, [typedKey]: !prev[typedKey] }))}
 className={`p-3 border rounded-xl cursor-pointer flex justify-between items-center transition ${
 addOns[typedKey]
 ? 'bg-danger-light border-red-200 text-neutral-800'
 : 'bg-neutral-50/15 border-neutral-200 text-neutral-600 hover:border-neutral-200'
 }`}
 >
 <span className="text-xs font-semibold">{label}</span>
 <span className="text-[11px] font-mono text-neutral-500">+₹{price.toLocaleString()}</span>
 </div>
 );
 })}
 </div>
 </div>

 <div className="flex justify-between pt-2 border-t border-neutral-200">
 <button
 onClick={() => setStep(2)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition"
 >
 Back
 </button>
 <button
 onClick={() => setStep(4)}
 className="px-4 py-2 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
 <span>Next: Review Pricing</span>
 <ArrowRight size={14} />
 </button>
 </div>
 </div>
 )}

 {/* STEP 4: PRICING & DISCOUNTS */}
 {step === 4 && (
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-900 font-display font-semibold">Step 4: Discount & Pricing Configuration</h3>
 <p className="text-xs text-neutral-600 mt-0.5">Configure discounts, analyze tax structures, and view summaries.</p>
 </div>

 {/* Discount selectors */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Discount Type</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={discountType}
 onChange={e => {
 setDiscountType(e.target.value as any);
 setDiscountValue(0);
 }}
 >
 <option value="None">No Discount</option>
 <option value="Fixed">Fixed Amount (₹)</option>
 <option value="Percentage">Percentage (%)</option>
 </select>
 </div>
 {discountType !== 'None' && (
 <div className="space-y-1 animate-slide-in">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">
 Discount Value ({discountType === 'Fixed' ? '₹' : '%'})
 </label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={discountValue}
 onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
 />
 </div>
 )}
 </div>

 {discountType !== 'None' && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-in">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Discount Reason</label>
 <input
 type="text"
 placeholder="Corporate, Referral, seasonal Offer..."
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={discountReason}
 onChange={e => setDiscountReason(e.target.value)}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Approved By (Owner/Manager)</label>
 <input
 type="text"
 placeholder="Operator Name"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={approvedBy}
 onChange={e => setApprovedBy(e.target.value)}
 />
 </div>
 </div>
 )}

 {/* Discount Alert trigger */}
 {discountType === 'Percentage' && discountValue >= 30 && (
 <div className="flex gap-2 bg-warning-light border border-amber-200 p-3 rounded-2xl text-xs text-amber-700">
 <AlertTriangle size={15} className="shrink-0 mt-0.5" />
 <span>High discount applied (≥30%). Requires Owner approval logged in the audited record.</span>
 </div>
 )}

 <div className="flex justify-between pt-2 border-t border-neutral-200">
 <button
 onClick={() => setStep(3)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition"
 >
 Back
 </button>
 <button
 onClick={() => setStep(5)}
 className="px-4 py-2 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
 <span>Next: Select Payment</span>
 <ArrowRight size={14} />
 </button>
 </div>
 </div>
 )}

 {/* STEP 5: PAYMENT SELECTION */}
 {step === 5 && (
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-900 font-display font-semibold">Step 5: Collect Payment</h3>
 <p className="text-xs text-neutral-600 mt-0.5">Select checkout payment configurations, support split payments.</p>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {['UPI', 'Cash', 'Card', 'Split'].map(method => (
 <div
 key={method}
 onClick={() => {
 setPaymentMethod(method as any);
 // reset split values
 setSplitAmounts({ Cash: 0, UPI: 0, Card: 0 });
 }}
 className={`p-3 border rounded-xl cursor-pointer text-center transition ${
 paymentMethod === method
 ? 'bg-danger-light border-red-200 text-danger font-bold'
 : 'bg-neutral-50/15 border-neutral-200 text-neutral-600 hover:border-neutral-200'
 }`}
 >
 <span className="text-xs">{method}</span>
 </div>
 ))}
 </div>

 {/* Split payment forms */}
 {paymentMethod === 'Split' && (
 <div className="bg-neutral-50/40 p-4 rounded-2xl border border-neutral-200 space-y-3.5 animate-slide-in text-xs">
 <span className="text-[10px] text-neutral-500 font-mono uppercase font-semibold block">Split Amounts Configuration</span>
 
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono">Cash Part (₹)</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl p-2 text-xs text-neutral-900"
 value={splitAmounts.Cash}
 onChange={e => setSplitAmounts({ ...splitAmounts, Cash: parseFloat(e.target.value) || 0 })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono">UPI Part (₹)</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl p-2 text-xs text-neutral-900"
 value={splitAmounts.UPI}
 onChange={e => setSplitAmounts({ ...splitAmounts, UPI: parseFloat(e.target.value) || 0 })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono">Card Part (₹)</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl p-2 text-xs text-neutral-900"
 value={splitAmounts.Card}
 onChange={e => setSplitAmounts({ ...splitAmounts, Card: parseFloat(e.target.value) || 0 })}
 />
 </div>
 </div>

 {/* Split balance summary */}
 {(() => {
 const totalPaid = splitAmounts.Cash + splitAmounts.UPI + splitAmounts.Card;
 const balance = pricing.totalPayable - totalPaid;
 return (
 <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-neutral-200 mt-3 font-mono text-[11px]">
 <span>Collected: <strong className="text-neutral-800">₹{totalPaid.toLocaleString()}</strong></span>
 <span>Remaining Balance: <strong className={balance === 0 ? 'text-success' : 'text-danger'}>
 ₹{balance.toLocaleString()}
 </strong></span>
 </div>
 );
 })()}
 </div>
 )}

 <div className="flex justify-between pt-2 border-t border-neutral-200">
 <button
 onClick={() => setStep(4)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition"
 >
 Back
 </button>
 <button
 onClick={() => setStep(6)}
 disabled={
 paymentMethod === 'Split' && 
 (splitAmounts.Cash + splitAmounts.UPI + splitAmounts.Card !== pricing.totalPayable)
 }
 className="px-4 py-2 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 disabled:opacity-30"
 >
 <span>Next: Review & Confirm</span>
 <ArrowRight size={14} />
 </button>
 </div>
 </div>
 )}

 {/* STEP 6: FINAL ACTIVATION REVIEW */}
 {step === 6 && (
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-900 font-display font-semibold">Step 6: Review & Finalize</h3>
 <p className="text-xs text-neutral-600 mt-0.5">Please verify checkout information before saving or activating.</p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
 <div className="bg-neutral-50/40 p-4 border border-neutral-200 rounded-2xl space-y-1.5">
 <span className="text-[9px] text-neutral-500 block font-mono uppercase">Member Details</span>
 <span className="text-neutral-900 font-bold block">{selectedMember.firstName} {selectedMember.lastName}</span>
 <span className="text-neutral-600 block font-mono">Phone: {selectedMember.phoneNumber}</span>
 <span className="text-neutral-600 block font-mono text-[10px]">ID: {selectedMember.id}</span>
 </div>

 <div className="bg-neutral-50/40 p-4 border border-neutral-200 rounded-2xl space-y-1.5">
 <span className="text-[9px] text-neutral-500 block font-mono uppercase">Agreement Details</span>
 <span className="text-neutral-900 font-bold block">{selectedPlan.name}</span>
 <span className="text-neutral-600 block font-mono">Period: {selectedPlan.durationValue} {selectedPlan.durationType}</span>
 <span className="text-neutral-600 block font-mono text-[10px]">{startDate} to {endDate}</span>
 </div>
 </div>

 <div className="flex gap-3 justify-end border-t border-neutral-200 pt-4 mt-4">
 <button
 onClick={() => setStep(5)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition"
 >
 Back
 </button>
 <button
 onClick={() => handlePurchaseSubmit('Pending Payment')}
 disabled={saving}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 hover:text-neutral-900 text-neutral-700 text-xs font-semibold rounded-xl transition"
 >
 Save Draft (Unpaid)
 </button>
 <button
 onClick={() => handlePurchaseSubmit('Active')}
 disabled={saving}
 className="px-4 py-2 bg-success text-white text-xs font-semibold rounded-xl transition flex items-center gap-2"
 >
 {saving ? 'Processing...' : 'Collect Payment & Activate'}
 </button>
 </div>
 </div>
 )}

 {/* STEP 7: CHECKOUT SUCCESS SCREEN */}
 {step === 7 && successInfo && (
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-8 space-y-6 text-center animate-slide-in">
 <div className="w-16 h-16 rounded-full bg-success-light border border-green-200 flex items-center justify-center text-success mx-auto animate-bounce mb-2">
 <Check size={36} />
 </div>

 <div>
 <h2 className="text-xl font-bold font-display text-neutral-900">Membership Purchased Successfully</h2>
 <p className="text-xs text-neutral-600 mt-2 max-w-sm mx-auto">
 Agreement transaction completed. Invoices and membership records have been generated.
 </p>
 </div>

 {/* Summary Box */}
 <div className="max-w-md mx-auto bg-white border border-neutral-200 p-6 rounded-2xl text-left text-xs space-y-3 font-mono">
 <div className="flex justify-between border-b border-neutral-200 pb-2 mb-2">
 <span className="text-neutral-500">Invoice Number</span>
 <span className="text-neutral-800 font-bold">{successInfo.invoiceNumber}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">Membership ID</span>
 <span className="text-neutral-800 font-bold">{successInfo.membershipNumber}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">Member</span>
 <span className="text-neutral-800 font-bold">
 {successInfo.member.firstName} {successInfo.member.lastName}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">Plan</span>
 <span className="text-neutral-800 font-bold">{successInfo.plan.name}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">Total Paid</span>
 <span className="text-neutral-800 font-bold text-success">₹{successInfo.totalPaid.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">Validity Period</span>
 <span className="text-neutral-800 font-bold">{successInfo.startDate} to {successInfo.endDate}</span>
 </div>
 </div>

 {/* Actions */}
 <div className="flex flex-wrap justify-center gap-3 mt-6">
 <button
 onClick={() => window.print()}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
 <Printer size={13} />
 <span>Print Invoice</span>
 </button>
 <button
 onClick={() => {
 showToast('Sending receipt via email/SMS...');
 }}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
 <Mail size={13} />
 <span>Send Receipt</span>
 </button>
 <button
 onClick={() => {
 // reset values & restart
 setSelectedMember(null);
 setSelectedPlan(null);
 setStep(1);
 router.push('/workspace/memberships/purchase');
 }}
 className="px-4 py-2.5 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition shadow-lg"
 >
 Purchase Another Membership
 </button>
 </div>
 </div>
 )}

 </div>

 {/* CHECKOUT RIGHT SIDEBAR: ORDER SUMMARY (Col span 1) */}
 <div className="lg:col-span-1 space-y-6 shrink-0">
 
 {/* LIVE SUMMARY CHECKOUT CARD */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-5">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Checkout Cart Summary</span>
 
 <div className="space-y-3.5 text-xs">
 
 {/* Member selection block */}
 <div className="space-y-1">
 <span className="text-[9px] text-neutral-500 block font-mono uppercase">Selected Member</span>
 {selectedMember ? (
 <div className="flex justify-between items-center bg-white border border-neutral-200 p-2.5 rounded-xl">
 <span className="font-semibold text-neutral-800">{selectedMember.firstName} {selectedMember.lastName}</span>
 <span className="text-[10px] text-neutral-500 font-mono">ID: {selectedMember.id.slice(0,6)}</span>
 </div>
 ) : (
 <span className="text-neutral-500 italic">None selected</span>
 )}
 </div>

 {/* Plan selection block */}
 <div className="space-y-1">
 <span className="text-[9px] text-neutral-500 block font-mono uppercase">Selected Package</span>
 {selectedPlan ? (
 <div className="bg-white border border-neutral-200 p-2.5 rounded-xl space-y-1">
 <div className="flex justify-between">
 <span className="font-semibold text-neutral-800">{selectedPlan.name}</span>
 <span className="text-success font-bold">₹{selectedPlan.basePrice.toLocaleString()}</span>
 </div>
 <span className="text-[9px] text-neutral-500 block font-mono">{selectedPlan.durationValue} {selectedPlan.durationType}</span>
 </div>
 ) : (
 <span className="text-neutral-500 italic">None selected</span>
 )}
 </div>

 {/* Breakdown price calculations */}
 {selectedPlan && (
 <div className="border-t border-neutral-200/80 pt-4 space-y-2 font-mono text-[11px]">
 <div className="flex justify-between"><span className="text-neutral-600">Membership Fee</span><span className="text-neutral-800">₹{pricing.baseFee.toLocaleString()}</span></div>
 {pricing.joiningFee > 0 && <div className="flex justify-between"><span className="text-neutral-600">Joining Fee</span><span className="text-neutral-800">₹{pricing.joiningFee.toLocaleString()}</span></div>}
 {pricing.addOnsTotal > 0 && <div className="flex justify-between"><span className="text-neutral-600">Add-ons Pack</span><span className="text-neutral-800">₹{pricing.addOnsTotal.toLocaleString()}</span></div>}
 
 {pricing.discountAmount > 0 && (
 <div className="flex justify-between text-danger">
 <span>Discount ({discountType === 'Percentage' ? `${discountValue}%` : 'Fixed'})</span>
 <span>-₹{pricing.discountAmount.toLocaleString()}</span>
 </div>
 )}

 <div className="flex justify-between border-t border-neutral-200/60 pt-2"><span className="text-neutral-600">Taxable Amount</span><span className="text-neutral-800">₹{pricing.taxableAmount.toLocaleString()}</span></div>
 <div className="flex justify-between text-neutral-600"><span>Tax (GST {selectedPlan.taxPercentage >= 0 ? selectedPlan.taxPercentage : 18}%)</span><span>₹{pricing.taxAmount.toLocaleString()}</span></div>
 
 <div className="flex justify-between border-t border-neutral-200 pt-2 text-xs font-bold font-sans">
 <span className="text-neutral-900">Total Payable</span>
 <span className="text-success">₹{pricing.totalPayable.toLocaleString()}</span>
 </div>
 </div>
 )}

 </div>
 </div>

 {/* QUICK PREVIEW TIMELINE */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Activity Timeline preview</span>
 <div className="space-y-4 text-xs relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-neutral-50">
 <div className="flex gap-2.5 relative">
 <div className="w-4 h-4 rounded-full bg-danger-light border border-red-200 flex items-center justify-center z-10 text-[8px] font-bold text-danger">1</div>
 <div className="space-y-0.5">
 <span className="font-bold text-neutral-700 block">Select Gym Member</span>
 <p className="text-[10px] text-neutral-500">Select active profile to issue terms.</p>
 </div>
 </div>
 <div className="flex gap-2.5 relative">
 <div className="w-4 h-4 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center z-10 text-[8px] font-bold text-neutral-500">2</div>
 <div className="space-y-0.5">
 <span className="font-bold text-neutral-600 block">Configure Packages</span>
 <p className="text-[10px] text-neutral-500">Assign trainers, add services, and customize pricing.</p>
 </div>
 </div>
 </div>
 </div>

 </div>

 </div>

 </div>

 {/* QUICK CREATE MEMBER SLIDE-OVER DRAWER */}
 {showNewMemberDrawer && (
 <div className="fixed inset-0 z-[100] overflow-hidden">
 <div className="absolute inset-0 bg-neutral-50/80 backdrop-blur-sm transition-opacity" onClick={() => setShowNewMemberDrawer(false)} />
 <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
 <div className="w-screen max-w-md bg-white border-l border-neutral-200/80 p-6 flex flex-col justify-between shadow-2xl">
 <div className="space-y-6">
 <div>
 <h3 className="text-base font-bold text-neutral-900 font-display">Quick Register New Member</h3>
 <p className="text-xs text-neutral-600 mt-1">Add basic detail fields to register and jump straight back to purchase.</p>
 </div>

 <form onSubmit={handleQuickCreateMember} className="space-y-4 text-xs">
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">First Name *</label>
 <input
 type="text"
 required
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
 value={newMemberForm.firstName}
 onChange={e => setNewMemberForm({ ...newMemberForm, firstName: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Last Name *</label>
 <input
 type="text"
 required
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
 value={newMemberForm.lastName}
 onChange={e => setNewMemberForm({ ...newMemberForm, lastName: e.target.value })}
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Phone Number *</label>
 <input
 type="text"
 required
 placeholder="e.g. +91 98765 43210"
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
 value={newMemberForm.phone}
 onChange={e => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Email Address</label>
 <input
 type="email"
 placeholder="name@email.com"
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
 value={newMemberForm.email}
 onChange={e => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Gender</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
 value={newMemberForm.gender}
 onChange={e => setNewMemberForm({ ...newMemberForm, gender: e.target.value })}
 >
 <option value="Male">Male</option>
 <option value="Female">Female</option>
 <option value="Other">Other</option>
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Home Branch *</label>
 <select
 required
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
 value={newMemberForm.homeGymId}
 onChange={e => setNewMemberForm({ ...newMemberForm, homeGymId: e.target.value })}
 >
 <option value="">Select Home Branch</option>
 {branches.map(b => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>
 </div>

 <div className="flex gap-3 pt-4 border-t border-neutral-200 mt-6">
 <button
 type="button"
 onClick={() => setShowNewMemberDrawer(false)}
 className="flex-1 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 font-semibold rounded-xl transition"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={saving}
 className="flex-1 py-2 bg-primary text-neutral-900 font-semibold rounded-xl transition"
 >
 {saving ? 'Creating...' : 'Register & Select'}
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
