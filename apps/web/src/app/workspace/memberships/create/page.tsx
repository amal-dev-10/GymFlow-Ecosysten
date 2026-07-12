'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
 FileText,
 ChevronLeft,
 ChevronRight,
 CheckCircle,
 Clock,
 DollarSign,
 MapPin,
 Sparkles,
 Info,
 Shield,
 Dumbbell,
 Check,
 Plus,
 Trash2,
 Lock,
 ArrowRight,
 Eye,
 Percent,
 Calendar,
 AlertTriangle,
 Users
} from 'lucide-react';
import { orgApi, gymApi, membershipsApi } from '../../../../lib/api';

export default function CreateMembershipPlanPage() {
 const router = useRouter();

 // Navigation
 const [step, setStep] = useState(1);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [showSuccessState, setShowSuccessState] = useState(false);
 const [activeOrg, setActiveOrg] = useState<any>(null);
 const [branches, setBranches] = useState<any[]>([]);

 // Form Fields
 const [formData, setFormData] = useState({
 name: '',
 code: '',
 description: '',
 category: 'Monthly', // Monthly, Quarterly, Half-Yearly, Yearly, Student, Corporate, Personal Training, Custom
 status: 'Active', // Draft, Active, Inactive, Archived
 
 durationType: 'Months', // Days, Weeks, Months, Years
 durationValue: '1',

 basePrice: '',
 joiningFee: '0',
 registrationFee: '0',
 taxPercentage: '18',
 discountEligible: false,
 currency: 'INR',

 branchAccessType: 'all', // all, specific
 selectedBranchIds: [] as string[],

 gymAccessType: 'All Branches', // Single Branch, Multi Branch, All Branches
 visitsAllowed: 'Unlimited', // Unlimited, Limited Visits
 visitsPerType: 'Visits Per Month', // Visits Per Month, Visits Per Week, Visits Per Day
 visitsCount: '',

 benefits: [] as string[],
 
 ptSessions: '',
 ptValidityDays: '',
 ptSessionExpiry: '30 Days after issue',

 dietConsultations: '',
 dietRevisions: '',
 dietValidityDays: '',

 allowFreeze: false,
 maxFreezeDays: '',
 maxFreezeRequests: '',
 freezeApprovalRequired: false,

 renewalGracePeriod: '',
 autoRenewal: false,
 renewalDiscount: '',
 renewalReminderDays: '7',

 maxMembers: '',
 minAge: '16',
 maxAge: '',
 genderRestriction: 'None', // None, Male Only, Female Only

 commissionEligible: false,
 commissionPercent: '',
 salesCategory: '',

 allowOnlinePurchase: true,
 allowMobilePurchase: true,
 requireApproval: false,
 });

 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 useEffect(() => {
 const fetchData = async () => {
 try {
 setLoading(true);
 const orgId = localStorage.getItem('organizationId') || '';

 // Fetch branches
 const branchList = await gymApi.list(orgId);
 setBranches(branchList || []);

 // Fetch organization
 const orgs = await orgApi.list();
 const matchedOrg = orgs.find(o => o.id === orgId);
 if (matchedOrg) {
 setActiveOrg(matchedOrg);
 }
 } catch (err) {
 console.error(err);
 showToast('Failed to load initial configurations', 'error');
 } finally {
 setLoading(false);
 }
 };

 fetchData();
 }, []);

 const toggleBranch = (id: string) => {
 setFormData(prev => {
 const selected = [...prev.selectedBranchIds];
 const idx = selected.indexOf(id);
 if (idx > -1) {
 selected.splice(idx, 1);
 } else {
 selected.push(id);
 }
 return { ...prev, selectedBranchIds: selected };
 });
 };

 const toggleBenefit = (benefitName: string) => {
 setFormData(prev => {
 const b = [...prev.benefits];
 const idx = b.indexOf(benefitName);
 if (idx > -1) {
 b.splice(idx, 1);
 } else {
 b.push(benefitName);
 }
 return { ...prev, benefits: b };
 });
 };

 // Pricing Summary calculations
 const calculatePricingSummary = () => {
 const base = parseFloat(formData.basePrice) || 0;
 const joining = parseFloat(formData.joiningFee) || 0;
 const registration = parseFloat(formData.registrationFee) || 0;
 const taxRate = parseFloat(formData.taxPercentage) || 0;
 const subtotal = base + joining + registration;
 const taxAmount = (subtotal * taxRate) / 100;
 const total = subtotal + taxAmount;
 return {
 subtotal,
 taxAmount,
 total
 };
 };

 const pricingSummary = calculatePricingSummary();

 // Validation Rules
 const validateStep = (currentStep: number) => {
 if (currentStep === 1) {
 if (!formData.name.trim()) {
 showToast('Plan Name is required', 'error');
 return false;
 }
 if (!formData.code.trim()) {
 showToast('Plan Code is required', 'error');
 return false;
 }
 }
 if (currentStep === 2) {
 if (!formData.durationValue || parseInt(formData.durationValue) <= 0) {
 showToast('Valid duration is required', 'error');
 return false;
 }
 if (!formData.basePrice || parseFloat(formData.basePrice) <= 0) {
 showToast('Valid price is required', 'error');
 return false;
 }
 }
 if (currentStep === 3) {
 if (formData.branchAccessType === 'specific' && formData.selectedBranchIds.length === 0) {
 showToast('Please assign at least one branch', 'error');
 return false;
 }
 }
 return true;
 };

 const handleNext = () => {
 if (validateStep(step)) {
 setStep(prev => prev + 1);
 }
 };

 const handleBack = () => {
 setStep(prev => Math.max(1, prev - 1));
 };

 const handleSubmit = async (isDraftMode = false) => {
 // Validate final checks
 if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
 return;
 }

 try {
 setSaving(true);
 
 const newPlan = {
 name: formData.name,
 code: formData.code,
 description: formData.description,
 category: formData.category,
 status: isDraftMode ? 'Draft' : formData.status,
 durationType: formData.durationType,
 durationValue: parseInt(formData.durationValue),
 basePrice: parseFloat(formData.basePrice),
 joiningFee: parseFloat(formData.joiningFee),
 taxPercentage: parseFloat(formData.taxPercentage),
 branchAccess: formData.branchAccessType === 'all' ? 'all' : formData.selectedBranchIds.join(','),
 benefits: formData.benefits,
 };

 await membershipsApi.createPlan(newPlan);

 setShowSuccessState(true);
 } catch (err) {
 console.error(err);
 showToast('Failed to create membership plan', 'error');
 } finally {
 setSaving(false);
 }
 };

 const getBranchNames = (ids: string[]) => {
 if (formData.branchAccessType === 'all') return 'All Branches';
 return ids.map(id => {
 const b = branches.find(x => x.id === id);
 return b ? b.name : 'Unknown Branch';
 }).join(', ');
 };

 if (loading) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Initializing plan designer...
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-white text-neutral-900 p-8 flex flex-col relative">
 
 {/* Toast Notification */}
 {toast && (
 <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border ${
 toast.type === 'success' 
 ? 'bg-success-light text-success border-green-200' 
 : 'bg-danger-light text-danger border-red-200'
 }`}>
 <span className="text-sm font-medium">{toast.message}</span>
 </div>
 )}

 {/* HEADER */}
 <div className="flex items-center justify-between border-b border-neutral-200/80 pb-6 mb-6">
 <div>
 <h1 className="text-2xl font-bold text-neutral-900 font-display">Create Membership Plan</h1>
 <p className="text-xs text-neutral-600 mt-1">Design flexible templates with specific durations, pricing, and branch privileges.</p>
 </div>
 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => handleSubmit(true)}
 disabled={saving}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Save As Draft
 </button>
 <button
 type="button"
 onClick={() => router.push('/workspace/memberships')}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-800 text-xs font-semibold rounded-xl transition"
 >
 Cancel
 </button>
 </div>
 </div>

 {/* MAIN CONTAINER */}
 <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8">
 
 {/* LEFT COLUMN: WIZARD FORM (75%) */}
 <div className="lg:col-span-3 space-y-6 flex flex-col justify-between">
 
 <div className="bg-neutral-50/20 border border-neutral-200/60 rounded-3xl p-8 backdrop-blur-md min-h-[460px]">
 
 {/* STEP PROGRESS TRACKER */}
 <div className="flex justify-between items-center mb-8 border-b border-neutral-200 pb-6">
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-danger font-mono">Step {step} of 5</span>
 <span className="text-xs text-neutral-500">•</span>
 <span className="text-xs text-neutral-700 font-semibold">
 {step === 1 && 'Plan Information'}
 {step === 2 && 'Pricing & Duration'}
 {step === 3 && 'Branch Access & Rules'}
 {step === 4 && 'Benefits & Limits'}
 {step === 5 && 'Review & Confirm'}
 </span>
 </div>

 {/* Graphical Steps */}
 <div className="flex gap-1.5">
 {[1, 2, 3, 4, 5].map((s) => (
 <div
 key={s}
 className={`w-8 h-1.5 rounded-full transition-all duration-300 ${
 step >= s ? 'bg-primary' : 'bg-neutral-100'
 }`}
 />
 ))}
 </div>
 </div>

 {/* STEP 1: PLAN INFORMATION */}
 {step === 1 && (
 <div className="space-y-6">
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold font-mono uppercase">Plan Name <span className="text-danger">*</span></label>
 <input
 type="text"
 required
 placeholder="e.g. Elite Annual Access"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-red-200"
 value={formData.name}
 onChange={e => setFormData({ ...formData, name: e.target.value })}
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold font-mono uppercase">Unique Plan Code <span className="text-danger">*</span></label>
 <input
 type="text"
 required
 placeholder="e.g. ELITE-ANNUAL-01"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-red-200 font-mono"
 value={formData.code}
 onChange={e => setFormData({ ...formData, code: e.target.value })}
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold font-mono uppercase">Description</label>
 <textarea
 rows={3}
 placeholder="Provide a detailed description of the membership benefits and details..."
 className="w-full bg-white border border-neutral-200 rounded-xl p-3.5 text-xs text-neutral-900 focus:outline-none focus:border-red-200"
 value={formData.description}
 onChange={e => setFormData({ ...formData, description: e.target.value })}
 />
 </div>

 <div className="grid grid-cols-2 gap-6 pt-2">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold font-mono uppercase">Plan Category</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.category}
 onChange={e => setFormData({ ...formData, category: e.target.value })}
 >
 <option value="Monthly">Monthly Pass</option>
 <option value="Quarterly">Quarterly Pass</option>
 <option value="Half-Yearly">Half-Yearly Pass</option>
 <option value="Yearly">Yearly Pass</option>
 <option value="Student">Student Discounted</option>
 <option value="Corporate">Corporate Package</option>
 <option value="Personal Training">Personal Training</option>
 <option value="Custom">Custom Duration</option>
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold font-mono uppercase">Initial Status</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.status}
 onChange={e => setFormData({ ...formData, status: e.target.value as any })}
 >
 <option value="Active">Active (Available for purchase)</option>
 <option value="Draft">Draft (Hidden)</option>
 <option value="Inactive">Inactive</option>
 </select>
 </div>
 </div>
 </div>
 )}

 {/* STEP 2: PRICING & DURATION */}
 {step === 2 && (
 <div className="space-y-6">
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold font-mono uppercase">Duration Value <span className="text-danger">*</span></label>
 <input
 type="number"
 required
 placeholder="e.g. 12"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={formData.durationValue}
 onChange={e => setFormData({ ...formData, durationValue: e.target.value })}
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold font-mono uppercase">Duration Type</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.durationType}
 onChange={e => setFormData({ ...formData, durationType: e.target.value as any })}
 >
 <option value="Days">Days</option>
 <option value="Weeks">Weeks</option>
 <option value="Months">Months</option>
 <option value="Years">Years</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold font-mono uppercase">Base Price <span className="text-danger">*</span></label>
 <input
 type="number"
 required
 placeholder="₹3,000"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={formData.basePrice}
 onChange={e => setFormData({ ...formData, basePrice: e.target.value })}
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold font-mono uppercase">Joining Fee</label>
 <input
 type="number"
 placeholder="₹500"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={formData.joiningFee}
 onChange={e => setFormData({ ...formData, joiningFee: e.target.value })}
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold font-mono uppercase">Tax Percentage (%)</label>
 <input
 type="number"
 placeholder="18"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={formData.taxPercentage}
 onChange={e => setFormData({ ...formData, taxPercentage: e.target.value })}
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold font-mono uppercase">Currency</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={formData.currency}
 onChange={e => setFormData({ ...formData, currency: e.target.value })}
 >
 <option value="INR">INR (₹)</option>
 <option value="USD">USD ($)</option>
 <option value="EUR">EUR (€)</option>
 </select>
 </div>
 </div>

 <div className="flex items-center gap-3 bg-white border border-neutral-200 rounded-2xl p-4">
 <input
 type="checkbox"
 id="discountEligible"
 className="w-4 h-4 rounded text-danger focus:ring-0 cursor-pointer bg-neutral-50 border-neutral-200"
 checked={formData.discountEligible}
 onChange={e => setFormData({ ...formData, discountEligible: e.target.checked })}
 />
 <label htmlFor="discountEligible" className="text-xs text-neutral-700 select-none cursor-pointer">
 Eligible for promotional discounts / corporate coupons
 </label>
 </div>
 </div>
 )}

 {/* STEP 3: BRANCH ACCESS & RULES */}
 {step === 3 && (
 <div className="space-y-6">
 <div className="space-y-3">
 <label className="text-[10px] text-neutral-700 font-semibold font-mono uppercase block">Branch Availability</label>
 <div className="flex gap-4">
 <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
 <input
 type="radio"
 name="branchAccess"
 className="text-danger focus:ring-0 bg-neutral-50 border-neutral-200"
 checked={formData.branchAccessType === 'all'}
 onChange={() => setFormData({ ...formData, branchAccessType: 'all' })}
 />
 All Branches
 </label>
 <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
 <input
 type="radio"
 name="branchAccess"
 className="text-danger focus:ring-0 bg-neutral-50 border-neutral-200"
 checked={formData.branchAccessType === 'specific'}
 onChange={() => setFormData({ ...formData, branchAccessType: 'specific' })}
 />
 Specific Branches
 </label>
 </div>

 {formData.branchAccessType === 'specific' && (
 <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3">
 <span className="text-[9px] text-neutral-500 font-mono uppercase block">Select Authorized Branches</span>
 <div className="flex flex-wrap gap-2">
 {branches.map(b => {
 const isSelected = formData.selectedBranchIds.includes(b.id);
 return (
 <button
 key={b.id}
 type="button"
 onClick={() => toggleBranch(b.id)}
 className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition flex items-center gap-1.5 ${
 isSelected
 ? 'bg-danger-light text-danger border-red-200'
 : 'bg-white text-neutral-600 border-neutral-200'
 }`}
 >
 {b.name}
 {isSelected && <Check size={12} />}
 </button>
 );
 })}
 </div>
 </div>
 )}
 </div>

 <div className="grid grid-cols-2 gap-6 border-t border-neutral-200/80 pt-6">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold font-mono uppercase">Gym Access Scope</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.gymAccessType}
 onChange={e => setFormData({ ...formData, gymAccessType: e.target.value })}
 >
 <option value="Single Branch">Single Branch Only</option>
 <option value="Multi Branch">Multi Branch (Selected)</option>
 <option value="All Branches">All Branches Access</option>
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold font-mono uppercase">Visits Allowed</label>
 <div className="flex gap-2">
 <select
 className="bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none flex-1"
 value={formData.visitsAllowed}
 onChange={e => setFormData({ ...formData, visitsAllowed: e.target.value })}
 >
 <option value="Unlimited">Unlimited Visits</option>
 <option value="Limited Visits">Limited Visits</option>
 </select>
 {formData.visitsAllowed === 'Limited Visits' && (
 <input
 type="number"
 placeholder="Visits Count"
 className="bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-900 focus:outline-none w-24 font-mono text-center"
 value={formData.visitsCount}
 onChange={e => setFormData({ ...formData, visitsCount: e.target.value })}
 />
 )}
 </div>
 </div>
 </div>
 </div>
 )}

 {/* STEP 4: BENEFITS & LIMITS */}
 {step === 4 && (
 <div className="space-y-6">
 {/* Benefits */}
 <div className="space-y-3">
 <span className="text-[10px] text-neutral-700 font-semibold font-mono uppercase block">Included Gym Benefits</span>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
 {[
 'Gym Access',
 'Personal Training Sessions',
 'Diet Consultation',
 'Yoga Classes',
 'Zumba Classes',
 'CrossFit Access',
 'Locker Access',
 'Parking',
 'Steam Room',
 'Sauna',
 'Swimming Pool'
 ].map((b, idx) => {
 const isSelected = formData.benefits.includes(b);
 return (
 <button
 key={idx}
 type="button"
 onClick={() => toggleBenefit(b)}
 className={`p-3 rounded-2xl border text-[11px] font-semibold text-left transition flex items-center justify-between ${
 isSelected
 ? 'bg-danger-light text-danger border-red-200'
 : 'bg-white text-neutral-600 border-neutral-200'
 }`}
 >
 {b}
 {isSelected ? <CheckCircle size={14} className="text-danger" /> : <Plus size={12} />}
 </button>
 );
 })}
 </div>
 </div>

 {/* PT & Diet */}
 <div className="grid grid-cols-2 gap-6 border-t border-neutral-200 pt-6">
 <div className="space-y-3">
 <span className="text-[10px] text-neutral-700 font-semibold font-mono uppercase block">Personal Training (PT) Packages</span>
 <div className="grid grid-cols-2 gap-2">
 <input
 type="number"
 placeholder="PT Sessions (Qty)"
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono"
 value={formData.ptSessions}
 onChange={e => setFormData({ ...formData, ptSessions: e.target.value })}
 />
 <input
 type="number"
 placeholder="PT Validity (Days)"
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono"
 value={formData.ptValidityDays}
 onChange={e => setFormData({ ...formData, ptValidityDays: e.target.value })}
 />
 </div>
 </div>

 <div className="space-y-3">
 <span className="text-[10px] text-neutral-700 font-semibold font-mono uppercase block">Diet Consultation Options</span>
 <div className="grid grid-cols-2 gap-2">
 <input
 type="number"
 placeholder="Consultations Included"
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono"
 value={formData.dietConsultations}
 onChange={e => setFormData({ ...formData, dietConsultations: e.target.value })}
 />
 <input
 type="number"
 placeholder="Revisions Included"
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono"
 value={formData.dietRevisions}
 onChange={e => setFormData({ ...formData, dietRevisions: e.target.value })}
 />
 </div>
 </div>
 </div>

 {/* Freeze rules */}
 <div className="border-t border-neutral-200 pt-6 space-y-4">
 <div className="flex items-center gap-3">
 <input
 type="checkbox"
 id="allowFreeze"
 className="w-4 h-4 rounded text-danger focus:ring-0 cursor-pointer bg-neutral-50 border-neutral-200"
 checked={formData.allowFreeze}
 onChange={e => setFormData({ ...formData, allowFreeze: e.target.checked })}
 />
 <label htmlFor="allowFreeze" className="text-xs text-neutral-700 font-semibold select-none cursor-pointer">
 Allow membership freezing (hold requests)
 </label>
 </div>

 {formData.allowFreeze && (
 <div className="grid grid-cols-2 gap-4 bg-white border border-neutral-200 rounded-2xl p-4">
 <div className="space-y-1">
 <label className="text-[9px] text-neutral-500 font-mono uppercase">Max Freeze Days</label>
 <input
 type="number"
 placeholder="e.g. 30"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs text-neutral-900 font-mono"
 value={formData.maxFreezeDays}
 onChange={e => setFormData({ ...formData, maxFreezeDays: e.target.value })}
 />
 </div>
 <div className="space-y-1 flex items-end">
 <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer pb-2">
 <input
 type="checkbox"
 className="text-danger focus:ring-0 bg-neutral-50 border-neutral-200"
 checked={formData.freezeApprovalRequired}
 onChange={e => setFormData({ ...formData, freezeApprovalRequired: e.target.checked })}
 />
 Requires Manager Approval
 </label>
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 {/* STEP 5: REVIEW SCREEN */}
 {step === 5 && (
 <div className="space-y-6">
 <div>
 <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
 <CheckCircle className="w-5 h-5 text-danger" />
 Review Membership Configuration
 </h3>
 <p className="text-xs text-neutral-600 mt-1">Please verify all plan options are correct before publishing.</p>
 </div>

 <div className="space-y-4">
 {/* Info */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex justify-between items-start">
 <div>
 <span className="text-[10px] text-neutral-500 font-mono block uppercase">1. Plan Description</span>
 <span className="text-xs font-bold text-neutral-800 block mt-1">{formData.name} ({formData.code})</span>
 <span className="text-[11px] text-neutral-600 block mt-1">{formData.category} Pass • Status: {formData.status}</span>
 </div>
 <button onClick={() => setStep(1)} className="text-[10px] text-danger hover:underline">Edit Step 1</button>
 </div>

 {/* Pricing */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex justify-between items-start">
 <div>
 <span className="text-[10px] text-neutral-500 font-mono block uppercase">2. Price & Period</span>
 <span className="text-xs font-bold text-neutral-800 block mt-1">₹{pricingSummary.total.toLocaleString()} (Total with GST)</span>
 <span className="text-[11px] text-neutral-600 block mt-1">Duration: {formData.durationValue} {formData.durationType} • Base: ₹{formData.basePrice}</span>
 </div>
 <button onClick={() => setStep(2)} className="text-[10px] text-danger hover:underline">Edit Step 2</button>
 </div>

 {/* Access */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex justify-between items-start">
 <div>
 <span className="text-[10px] text-neutral-500 font-mono block uppercase">3. Branch Access Rules</span>
 <span className="text-xs font-bold text-neutral-800 block mt-1">{formData.gymAccessType}</span>
 <span className="text-[11px] text-neutral-600 block mt-1">Visits: {formData.visitsAllowed} • Branches: {getBranchNames(formData.selectedBranchIds)}</span>
 </div>
 <button onClick={() => setStep(3)} className="text-[10px] text-danger hover:underline">Edit Step 3</button>
 </div>

 {/* Benefits */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex justify-between items-start">
 <div>
 <span className="text-[10px] text-neutral-500 font-mono block uppercase">4. Benefits & Add-ons</span>
 <span className="text-xs font-bold text-neutral-800 block mt-1">
 {formData.benefits.length > 0 ? formData.benefits.join(', ') : 'No special benefits selected'}
 </span>
 <span className="text-[11px] text-neutral-600 block mt-1">
 PT: {formData.ptSessions || 'None'} • Diet consults: {formData.dietConsultations || 'None'}
 </span>
 </div>
 <button onClick={() => setStep(4)} className="text-[10px] text-danger hover:underline">Edit Step 4</button>
 </div>
 </div>
 </div>
 )}

 </div>

 {/* ACTION NAVIGATION BAR */}
 <div className="sticky bottom-0 z-20 flex items-center justify-between bg-white border border-neutral-200/80 p-4 rounded-3xl backdrop-blur-md shadow-2xl mt-4">
 <div>
 {step > 1 && (
 <button
 type="button"
 onClick={handleBack}
 className="px-5 py-2.5 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
 >
 <ChevronLeft className="w-4 h-4" />
 Back
 </button>
 )}
 </div>

 <div>
 {step < 5 ? (
 <button
 type="button"
 onClick={handleNext}
 className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-neutral-900 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg"
 >
 Next
 <ChevronRight className="w-4 h-4" />
 </button>
 ) : (
 <button
 type="button"
 onClick={() => handleSubmit(false)}
 disabled={saving}
 className="px-6 py-3 bg-success hover:bg-green-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg"
 >
 <Check className="w-4 h-4" />
 {saving ? 'Creating Plan...' : `Confirm & Create Plan`}
 </button>
 )}
 </div>
 </div>

 </div>

 {/* RIGHT COLUMN: SUMMARY PREVIEW PANEL (25%) */}
 <div className="space-y-6">
 <div className="bg-neutral-50/40 border border-neutral-200/60 rounded-3xl p-6 backdrop-blur-md sticky top-6 space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-800 uppercase font-mono tracking-wider">Plan Preview</h3>
 <p className="text-[10px] text-neutral-500 mt-1">Live customer preview rendering.</p>
 </div>

 {/* Preview Card Graphic */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
 <div className="flex justify-between items-start border-b border-neutral-200 pb-3">
 <div>
 <span className="text-[9px] text-danger font-mono uppercase block">{formData.category || 'Monthly'} Pass</span>
 <span className="text-xs font-bold text-neutral-900 block mt-0.5">{formData.name || 'Plan Template'}</span>
 </div>
 <span className="text-[9px] text-neutral-500 font-mono">{formData.code || 'CODE-NEW'}</span>
 </div>

 <div className="space-y-2 text-xs">
 <span className="text-[10px] text-neutral-500 font-mono block uppercase">What Member Receives:</span>
 <div className="space-y-1 text-neutral-700">
 <div className="flex justify-between"><span>Duration</span><span className="font-semibold">{formData.durationValue || '1'} {formData.durationType}</span></div>
 <div className="flex justify-between"><span>Total Price</span><span className="font-bold text-success font-mono">₹{pricingSummary.total.toLocaleString()}</span></div>
 <div className="flex justify-between"><span>Branch</span><span className="font-mono text-[10px] truncate max-w-[120px]">{getBranchNames(formData.selectedBranchIds)}</span></div>
 </div>
 </div>

 {formData.benefits.length > 0 && (
 <div className="border-t border-neutral-200 pt-3 space-y-1">
 <span className="text-[9px] text-neutral-500 font-mono block uppercase">Benefits Checklist:</span>
 <div className="flex flex-wrap gap-1">
 {formData.benefits.map((b, idx) => (
 <span key={idx} className="px-1.5 py-0.5 rounded bg-neutral-50 border border-neutral-200 text-[9px] text-neutral-600">
 {b}
 </span>
 ))}
 </div>
 </div>
 )}
 </div>

 {/* Pricing Summary Card */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-2.5 text-xs">
 <span className="text-[10px] text-neutral-500 font-mono block uppercase border-b border-neutral-200 pb-1.5">Price Structure Breakdown</span>
 <div className="flex justify-between">
 <span className="text-neutral-600">Base Membership</span>
 <span className="text-neutral-800 font-mono">₹{parseFloat(formData.basePrice) || 0}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-600">Joining Registration</span>
 <span className="text-neutral-800 font-mono">₹{parseFloat(formData.joiningFee) || 0}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-600">GST ({formData.taxPercentage}%)</span>
 <span className="text-neutral-800 font-mono">₹{pricingSummary.taxAmount.toLocaleString()}</span>
 </div>
 <div className="border-t border-neutral-200 pt-2 flex justify-between font-bold">
 <span className="text-neutral-800">Total Price</span>
 <span className="text-success font-mono text-sm">₹{pricingSummary.total.toLocaleString()}</span>
 </div>
 </div>

 <div className="border-t border-neutral-200 pt-5 bg-neutral-50/10 rounded-xl p-3 text-[10px] text-neutral-500 flex gap-2">
 <Info className="shrink-0 mt-0.5" size={14} />
 <span>Verify unique plan code is scoped before issuing membership contracts.</span>
 </div>
 </div>
 </div>

 </div>

 {/* OVERLAY: SUCCESS OVERLAY MODAL */}
 {showSuccessState && (
 <div className="fixed inset-0 bg-background backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl space-y-6 relative overflow-hidden">
 
 <div className="mx-auto w-16 h-16 rounded-2xl bg-success-light border border-green-200 flex items-center justify-center text-success shadow-lg">
 <Check className="w-8 h-8" />
 </div>

 <div className="space-y-2">
 <h2 className="text-xl font-bold text-neutral-900 font-display">Membership Plan Created!</h2>
 <p className="text-xs text-neutral-600 leading-relaxed">
 The membership template for <strong>{formData.name}</strong> has been successfully registered under your organization catalog.
 </p>
 </div>

 <div className="bg-neutral-50/50 border border-neutral-200 rounded-2xl p-5 text-left space-y-3">
 <div className="flex gap-4 items-center">
 <div className="w-12 h-12 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center font-bold text-danger">
 <FileText size={20} />
 </div>
 <div>
 <span className="text-xs font-bold text-neutral-800 block">{formData.name}</span>
 <span className="text-[10px] text-danger font-mono block uppercase">{formData.code}</span>
 </div>
 </div>
 
 <div className="border-t border-neutral-200/80 pt-3 text-[10px] space-y-1.5 text-neutral-600">
 <div>Duration: <strong className="text-neutral-700 font-mono">{formData.durationValue} {formData.durationType}</strong></div>
 <div>Total Price: <strong className="text-success font-mono">₹{pricingSummary.total.toLocaleString()}</strong></div>
 <div>Branches: <strong className="text-neutral-700">{getBranchNames(formData.selectedBranchIds)}</strong></div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <button
 type="button"
 onClick={() => router.push('/workspace/memberships')}
 className="py-2.5 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-800 text-xs font-semibold rounded-xl transition"
 >
 View Catalog
 </button>
 <button
 type="button"
 onClick={() => {
 setShowSuccessState(false);
 setStep(1);
 setFormData({
 name: '',
 code: '',
 description: '',
 category: 'Monthly',
 status: 'Active',
 durationType: 'Months',
 durationValue: '1',
 basePrice: '',
 joiningFee: '0',
 registrationFee: '0',
 taxPercentage: '18',
 discountEligible: false,
 currency: 'INR',
 branchAccessType: 'all',
 selectedBranchIds: [],
 gymAccessType: 'All Branches',
 visitsAllowed: 'Unlimited',
 visitsPerType: 'Visits Per Month',
 visitsCount: '',
 benefits: [],
 ptSessions: '',
 ptValidityDays: '',
 ptSessionExpiry: '30 Days after issue',
 dietConsultations: '',
 dietRevisions: '',
 dietValidityDays: '',
 allowFreeze: false,
 maxFreezeDays: '',
 maxFreezeRequests: '',
 freezeApprovalRequired: false,
 renewalGracePeriod: '',
 autoRenewal: false,
 renewalDiscount: '',
 renewalReminderDays: '7',
 maxMembers: '',
 minAge: '16',
 maxAge: '',
 genderRestriction: 'None',
 commissionEligible: false,
 commissionPercent: '',
 salesCategory: '',
 allowOnlinePurchase: true,
 allowMobilePurchase: true,
 requireApproval: false,
 });
 }}
 className="py-2.5 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Create Another
 </button>
 </div>

 </div>
 </div>
 )}

 </div>
 );
}
