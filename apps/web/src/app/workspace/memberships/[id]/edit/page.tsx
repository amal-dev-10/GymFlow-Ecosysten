'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
 Users,
 Copy,
 Archive,
 Ban,
 Activity,
 History,
 CheckSquare
} from 'lucide-react';
import { gymApi, membershipsApi } from '../../../../../lib/api';
import { Tabs } from '../../../../../components/ui';

export default function EditMembershipPlanPage() {
 const router = useRouter();
 const params = useParams();
 const id = params.id as string;

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

 // Page States
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [showConfirmationModal, setShowConfirmationModal] = useState(false);
 const [showSuccessState, setShowSuccessState] = useState(false);
 const [showDuplicateModal, setShowDuplicateModal] = useState(false);
 const [showArchiveModal, setShowArchiveModal] = useState(false);
 const [activeTab, setActiveTab] = useState('editor'); // editor, timeline
 const [isMobile, setIsMobile] = useState(false);
 const [mobileStep, setMobileStep] = useState(1);

 // Original Plan data (from backend)
 const [originalPlan, setOriginalPlan] = useState<any>(null);
 const [branches, setBranches] = useState<any[]>([]);

 // Form states
 const [formData, setFormData] = useState({
 name: '',
 code: '',
 description: '',
 category: 'Monthly',
 status: 'Active',
 durationType: 'Months',
 durationValue: 1,
 basePrice: 0,
 joiningFee: 0,
 registrationFee: 0,
 taxPercentage: 18,
 discountEligible: false,
 currency: 'INR',
 branchAccessType: 'all', // all, specific
 selectedBranchIds: [] as string[],
 gymAccessType: 'All Branches', // Single Branch, Multi Branch, All Branches
 visitsAllowed: 'Unlimited',
 visitsCount: '',
 benefits: [] as string[],
 
 // PT settings
 ptSessions: '',
 ptValidityDays: '',
 ptSessionExpiry: '30 Days after issue',

 // Diet settings
 dietConsultations: '',
 dietRevisions: '',
 dietValidityDays: '',

 // Freeze settings
 allowFreeze: false,
 maxFreezeDays: '',
 maxFreezeRequests: '',
 freezeApprovalRequired: false,

 // Renewal settings
 renewalGracePeriod: '',
 autoRenewal: false,
 renewalDiscount: '',
 renewalReminderDays: '7',

 // Sales settings
 commissionEligible: false,
 commissionPercent: '',
 salesCategory: '',
 allowOnlinePurchase: true,
 allowMobilePurchase: true,
 requireApproval: false,

 // Pricing Update Apply Rule
 pricingImpactRule: 'future_only', // future_only, renewals_only
 });

 // Duplicate payload
 const [duplicateName, setDuplicateName] = useState('');
 const [duplicateCode, setDuplicateCode] = useState('');

 // Toast notifications
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 // Check window size for mobile responsive view
 useEffect(() => {
 const handleResize = () => {
 setIsMobile(window.innerWidth < 1024);
 };
 handleResize();
 window.addEventListener('resize', handleResize);
 return () => window.removeEventListener('resize', handleResize);
 }, []);

 const loadData = async () => {
 try {
 setLoading(true);
 const orgId = localStorage.getItem('organizationId') || '';

 // Get branches
 const branchList = await gymApi.list(orgId);
 setBranches(branchList || []);

 // Get current plan details
 const plan = await membershipsApi.getPlan(id);
 setOriginalPlan(plan);

 // Map benefits safely
 const parsedBenefits = parseBenefits(plan.benefits);

 // Parse branch access
 const bAccessType = plan.branchAccess === 'all' ? 'all' : 'specific';
 const bAccessList = plan.branchAccess && plan.branchAccess !== 'all' ? plan.branchAccess.split(',') : [];

 setFormData(prev => ({
 ...prev,
 name: plan.name,
 code: plan.code,
 description: plan.description || '',
 category: plan.category,
 status: plan.status,
 durationType: plan.durationType,
 durationValue: plan.durationValue,
 basePrice: plan.basePrice,
 joiningFee: plan.joiningFee || 0,
 taxPercentage: plan.taxPercentage || 0,
 branchAccessType: bAccessType,
 selectedBranchIds: bAccessList,
 benefits: parsedBenefits,
 }));

 // Seed duplicate fields
 setDuplicateName(`${plan.name} V2`);
 setDuplicateCode(`${plan.code}-V2`);

 } catch (err) {
 console.error(err);
 showToast('Failed to load membership plan details', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [id]);

 const toggleBranch = (branchId: string) => {
 setFormData(prev => {
 const selected = [...prev.selectedBranchIds];
 const idx = selected.indexOf(branchId);
 if (idx > -1) {
 selected.splice(idx, 1);
 } else {
 selected.push(branchId);
 }
 return { ...prev, selectedBranchIds: selected };
 });
 };

 const toggleBenefit = (benefit: string) => {
 setFormData(prev => {
 const active = [...prev.benefits];
 const idx = active.indexOf(benefit);
 if (idx > -1) {
 active.splice(idx, 1);
 } else {
 active.push(benefit);
 }
 return { ...prev, benefits: active };
 });
 };

 // Pricing calculations
 const calcPrice = (base: number, joining: number, tax: number) => {
 const subtotal = base + joining;
 const taxAmt = (subtotal * tax) / 100;
 return subtotal + taxAmt;
 };

 const currentTotal = originalPlan ? calcPrice(originalPlan.basePrice, originalPlan.joiningFee || 0, originalPlan.taxPercentage || 0) : 0;
 const newTotal = calcPrice(formData.basePrice, formData.joiningFee, formData.taxPercentage);
 const priceDiff = newTotal - currentTotal;

 // Validation Rules
 const validateForm = () => {
 if (!formData.name.trim()) {
 showToast('Plan Name is required', 'error');
 return false;
 }
 if (!formData.code.trim()) {
 showToast('Plan Code is required', 'error');
 return false;
 }
 if (formData.basePrice < 0) {
 showToast('Valid base price is required', 'error');
 return false;
 }
 if (formData.branchAccessType === 'specific' && formData.selectedBranchIds.length === 0) {
 showToast('Please select at least one branch', 'error');
 return false;
 }
 return true;
 };

 const handleSaveChanges = async (isDraftMode = false) => {
 if (!validateForm()) return;
 
 if (showConfirmationModal) {
 setShowConfirmationModal(false);
 }

 try {
 setSaving(true);
 const payload = {
 name: formData.name,
 code: formData.code,
 description: formData.description,
 category: formData.category,
 status: isDraftMode ? 'Draft' : formData.status,
 durationType: formData.durationType,
 durationValue: formData.durationValue,
 basePrice: formData.basePrice,
 joiningFee: formData.joiningFee,
 taxPercentage: formData.taxPercentage,
 branchAccess: formData.branchAccessType === 'all' ? 'all' : formData.selectedBranchIds.join(','),
 benefits: formData.benefits,
 };

 await membershipsApi.updatePlan(id, payload);
 
 // Update activity logs in originalPlan context (visual purposes)
 setShowSuccessState(true);
 } catch (err) {
 console.error(err);
 showToast('Failed to save plan changes', 'error');
 } finally {
 setSaving(false);
 }
 };

 const handleDuplicate = async () => {
 if (!duplicateName.trim() || !duplicateCode.trim()) {
 showToast('Duplicate Name and Code are required', 'error');
 return;
 }

 try {
 setSaving(true);
 const payload = {
 name: duplicateName,
 code: duplicateCode,
 description: formData.description,
 category: formData.category,
 status: 'Draft',
 durationType: formData.durationType,
 durationValue: formData.durationValue,
 basePrice: formData.basePrice,
 joiningFee: formData.joiningFee,
 taxPercentage: formData.taxPercentage,
 branchAccess: formData.branchAccessType === 'all' ? 'all' : formData.selectedBranchIds.join(','),
 benefits: formData.benefits,
 };

 await membershipsApi.createPlan(payload);
 showToast('Membership plan cloned successfully as Draft!');
 setShowDuplicateModal(false);
 router.push('/workspace/memberships');
 } catch (err) {
 console.error(err);
 showToast('Failed to clone membership plan', 'error');
 } finally {
 setSaving(false);
 }
 };

 const handleArchive = async () => {
 try {
 setSaving(true);
 await membershipsApi.updatePlan(id, { status: 'Archived' });
 showToast('Membership plan successfully archived');
 setShowArchiveModal(false);
 router.push('/workspace/memberships');
 } catch (err) {
 console.error(err);
 showToast('Failed to archive plan', 'error');
 } finally {
 setSaving(false);
 }
 };

 // Track modification differences for sidebar comparison panel
 const getModifiedFields = () => {
 const list = [];
 if (!originalPlan) return [];
 if (originalPlan.name !== formData.name) list.push({ field: 'Plan Name', current: originalPlan.name, new: formData.name });
 if (originalPlan.code !== formData.code) list.push({ field: 'Plan Code', current: originalPlan.code, new: formData.code });
 if (originalPlan.basePrice !== formData.basePrice) list.push({ field: 'Base Price', current: `₹${originalPlan.basePrice}`, new: `₹${formData.basePrice}` });
 if ((originalPlan.joiningFee || 0) !== formData.joiningFee) list.push({ field: 'Joining Fee', current: `₹${originalPlan.joiningFee || 0}`, new: `₹${formData.joiningFee}` });
 if (originalPlan.status !== formData.status) list.push({ field: 'Status', current: originalPlan.status, new: formData.status });
 
 // Check branch differences
 const origBranchList = originalPlan.branchAccess === 'all' ? 'all' : originalPlan.branchAccess;
 const currentBranchList = formData.branchAccessType === 'all' ? 'all' : formData.selectedBranchIds.join(',');
 if (origBranchList !== currentBranchList) {
 list.push({
 field: 'Branch Access',
 current: origBranchList === 'all' ? 'All Branches' : `${origBranchList.split(',').length} Branches`,
 new: currentBranchList === 'all' ? 'All Branches' : `${formData.selectedBranchIds.length} Branches`
 });
 }

 return list;
 };

 const modifiedFields = getModifiedFields();

 if (loading) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Loading membership plan details...
 </div>
 );
 }

 // Simulated activity timeline history
 const activityTimeline = [
 { type: 'Status Changed', detail: 'Changed plan status from Draft to Active', date: '2026-06-12 11:20 AM', user: 'Owner Desk' },
 { type: 'Pricing Modified', detail: 'Increased base price by ₹1,500 with future sales rules', date: '2026-06-08 09:30 AM', user: 'Owner Desk' },
 { type: 'Benefits Modified', detail: 'Added CrossFit and Zumba classes to standard package benefits', date: '2026-06-01 02:15 PM', user: 'Marcus Vance' },
 { type: 'Plan Created', detail: 'Membership plan template initialized', date: '2026-05-15 10:00 AM', user: 'Owner Desk' }
 ];

 return (
 <div className="min-h-screen bg-white text-neutral-900 p-8 space-y-6 relative overflow-hidden flex flex-col justify-between">
 
 {/* SUCCESS OVERLAY */}
 {showSuccessState && (
 <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6 text-center">
 <div className="w-16 h-16 rounded-full bg-success-light border border-green-200 flex items-center justify-center text-success mb-6 animate-bounce">
 <CheckSquare size={36} />
 </div>
 <h2 className="text-xl font-bold font-display text-neutral-900">Membership Plan Updated Successfully</h2>
 <p className="text-xs text-neutral-600 max-w-sm mt-2">
 Plan <strong>{formData.name}</strong> was updated correctly in the database. Active members will be billed according to the selected impact rules.
 </p>
 <div className="mt-8 flex gap-3">
 <button
 onClick={() => {
 setShowSuccessState(false);
 loadData();
 }}
 className="px-5 py-2.5 bg-neutral-50 border border-neutral-200 hover:text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Continue Editing
 </button>
 <button
 onClick={() => router.push('/workspace/memberships')}
 className="px-5 py-2.5 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition shadow-lg"
 >
 View Plan Catalog
 </button>
 </div>
 </div>
 )}

 {/* CONFIRMATION SAVING MODAL */}
 {showConfirmationModal && (
 <div className="fixed inset-0 bg-neutral-50/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl">
 <div className="flex items-start gap-4">
 <div className="p-3 rounded-2xl bg-warning-light text-amber-700 border border-amber-200">
 <AlertTriangle size={24} />
 </div>
 <div>
 <h3 className="text-base font-bold text-neutral-900 font-display">Confirm Plan Modifications</h3>
 <p className="text-xs text-neutral-600 mt-1">This plan currently governs **{originalPlan?.enrolledCount || 0} active members**. Please review the impact selection rules before continuing.</p>
 </div>
 </div>

 <div className="bg-neutral-50/40 border border-neutral-200 rounded-2xl p-4 space-y-3 text-xs">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Change Summary</span>
 <div className="space-y-1 font-mono text-[11px]">
 <div>• Price Adjustments: ₹{currentTotal} → ₹{newTotal} ({priceDiff >= 0 ? '+' : ''}₹{priceDiff})</div>
 <div>• Affected Branch Privileges: {formData.branchAccessType === 'all' ? 'All Locations' : `${formData.selectedBranchIds.length} Locations`}</div>
 <div>• Access Type: {formData.gymAccessType}</div>
 </div>
 </div>

 <div className="space-y-3 border-t border-neutral-200 pt-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Update Billing Rule</span>
 <div className="space-y-2">
 <label className="flex items-start gap-3 p-3 bg-neutral-50/20 border border-neutral-200 rounded-xl cursor-pointer hover:border-neutral-200/60">
 <input
 type="radio"
 name="billingRule"
 className="text-danger focus:ring-0 mt-0.5 bg-neutral-50 border-neutral-200"
 checked={formData.pricingImpactRule === 'future_only'}
 onChange={() => setFormData({ ...formData, pricingImpactRule: 'future_only' })}
 />
 <div>
 <span className="text-xs font-bold text-neutral-800 block">Future Membership Sales Only</span>
 <span className="text-[10px] text-neutral-600 mt-0.5 block">Keep active subscriptions locked at their current historical price of ₹{currentTotal}.</span>
 </div>
 </label>

 <label className="flex items-start gap-3 p-3 bg-neutral-50/20 border border-neutral-200 rounded-xl cursor-pointer hover:border-neutral-200/60">
 <input
 type="radio"
 name="billingRule"
 className="text-danger focus:ring-0 mt-0.5 bg-neutral-50 border-neutral-200"
 checked={formData.pricingImpactRule === 'renewals_only'}
 onChange={() => setFormData({ ...formData, pricingImpactRule: 'renewals_only' })}
 />
 <div>
 <span className="text-xs font-bold text-neutral-800 block">Apply to Future Renewals</span>
 <span className="text-[10px] text-neutral-600 mt-0.5 block">Active members will retain their current pricing until renewal, after which new pricing applies.</span>
 </div>
 </label>
 </div>
 </div>

 <div className="flex gap-3 justify-end border-t border-neutral-200 pt-4">
 <button
 type="button"
 onClick={() => setShowConfirmationModal(false)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={() => handleSaveChanges(false)}
 disabled={saving}
 className="px-4 py-2 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 {saving ? 'Applying...' : 'Apply Changes'}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* CLONE/DUPLICATE PLAN MODAL */}
 {showDuplicateModal && (
 <div className="fixed inset-0 bg-neutral-50/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
 <div className="flex items-center gap-3">
 <Copy className="w-5 h-5 text-danger" />
 <h3 className="text-base font-bold text-neutral-900 font-display">Duplicate Membership Plan</h3>
 </div>
 <p className="text-xs text-neutral-600">Clone current pricing, duration and access rules to initialize a new plan catalog template.</p>
 
 <div className="space-y-3 py-2">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">New Plan Name</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={duplicateName}
 onChange={e => setDuplicateName(e.target.value)}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">New Unique Plan Code</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={duplicateCode}
 onChange={e => setDuplicateCode(e.target.value)}
 />
 </div>
 </div>

 <div className="flex gap-3 justify-end pt-2">
 <button
 type="button"
 onClick={() => setShowDuplicateModal(false)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={handleDuplicate}
 disabled={saving}
 className="px-4 py-2 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Clone Plan Template
 </button>
 </div>
 </div>
 </div>
 )}

 {/* ARCHIVE CONFIRMATION MODAL */}
 {showArchiveModal && (
 <div className="fixed inset-0 bg-neutral-50/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
 <div className="flex items-center gap-3 text-danger">
 <Archive className="w-5 h-5" />
 <h3 className="text-base font-bold text-neutral-900 font-display">Archive Membership Plan?</h3>
 </div>
 <p className="text-xs text-neutral-600 leading-relaxed">
 Archived plans cannot be sold or purchased by new members. Active subscriptions using this plan (**{originalPlan?.enrolledCount || 0} members**) will remain visible for historical audit reporting.
 </p>
 
 <div className="flex gap-3 justify-end pt-2">
 <button
 type="button"
 onClick={() => setShowArchiveModal(false)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={handleArchive}
 disabled={saving}
 className="px-4 py-2 bg-danger hover:bg-red-600 text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Archive Plan
 </button>
 </div>
 </div>
 </div>
 )}

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

 {/* PAGE HEADER */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-200/80 pb-6">
 <div className="flex items-center gap-3">
 <button
 onClick={() => router.push('/workspace/memberships')}
 className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 hover:text-neutral-800 transition"
 >
 <ChevronLeft size={16} />
 </button>
 <div>
 <h1 className="text-2xl font-bold text-neutral-900 font-display">Edit Membership Plan</h1>
 <p className="text-xs text-neutral-600 mt-1">Modify pricing, branch privileges, benefits, and sales configurations safely.</p>
 </div>
 </div>

 <div className="flex gap-2">
 <button
 onClick={() => router.push('/workspace/memberships')}
 className="px-4 py-2.5 bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-800 text-xs font-semibold rounded-xl transition"
 >
 Discard Changes
 </button>
 <button
 onClick={() => handleSaveChanges(true)}
 className="px-4 py-2.5 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Save Draft
 </button>
 <button
 onClick={() => setShowConfirmationModal(true)}
 className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-neutral-900 text-xs font-semibold rounded-xl transition shadow-lg"
 >
 Save Changes
 </button>
 </div>
 </div>

 {/* TABS HUB */}
 <Tabs
 scrollable={false}
 tabs={[
 { id: 'editor', label: 'Plan Config Editor' },
 { id: 'timeline', label: 'Change Log History', icon: History },
 ]}
 activeId={activeTab}
 onChange={(id) => setActiveTab(id)}
 />

 {activeTab === 'timeline' ? (
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 max-w-2xl">
 <h3 className="text-sm font-bold text-neutral-800 mb-6 font-display flex items-center gap-2">
 <Activity className="text-danger" size={16} />
 Chronological Audit History
 </h3>
 <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-neutral-50">
 {activityTimeline.map((item, index) => (
 <div key={index} className="flex gap-4 relative">
 <div className="w-6 h-6 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center z-10 text-[9px] font-bold text-neutral-600">
 {activityTimeline.length - index}
 </div>
 <div className="space-y-1">
 <div className="flex items-center gap-3">
 <span className="text-xs font-bold text-neutral-800">{item.type}</span>
 <span className="text-[10px] text-neutral-500">• {item.date}</span>
 </div>
 <p className="text-xs text-neutral-600">{item.detail}</p>
 <span className="text-[10px] text-neutral-500 block">Operator: {item.user}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 ) : (
 <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
 
 {/* EDITOR FORM BLOCK (75% / 3 cols) */}
 <div className="lg:col-span-3 space-y-6">

 {/* PLAN OVERVIEW META CARD */}
 <div className="bg-neutral-50/20 border border-neutral-200/60 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden backdrop-blur-md">
 <div className="space-y-1">
 <div className="flex items-center gap-2.5">
 <h2 className="text-base font-bold text-neutral-900 font-display">{formData.name || 'Untitled Plan'}</h2>
 <span className="px-2 py-0.5 rounded bg-neutral-100 text-[10px] font-mono text-neutral-600">{formData.code || 'NO-CODE'}</span>
 </div>
 <p className="text-xs text-neutral-600">Created: 2026-05-15 • Last updated: {new Date().toLocaleDateString()}</p>
 
 <div className="flex gap-4 pt-3 text-xs text-neutral-700 font-mono">
 <div>Status: <strong className="text-success">{formData.status}</strong></div>
 <div>Base Price: <strong className="text-neutral-800">₹{formData.basePrice.toLocaleString()}</strong></div>
 <div>Period: <strong className="text-neutral-800">{formData.durationValue} {formData.durationType}</strong></div>
 </div>
 </div>

 {/* OVERVIEW QUICK ACTIONS */}
 <div className="flex flex-wrap gap-2 pt-2 md:pt-0">
 <button
 onClick={() => setShowDuplicateModal(true)}
 className="px-3 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
 <Copy size={13} />
 Duplicate
 </button>
 <button
 onClick={() => setShowArchiveModal(true)}
 className="px-3 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
 <Archive size={13} />
 Archive
 </button>
 <button
 onClick={() => setFormData({ ...formData, status: 'Inactive' })}
 className="px-3 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-danger text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
 <Ban size={13} />
 Deactivate
 </button>
 </div>
 </div>

 {/* MOBILE STEP NAVIGATION FOR RESPONSIBLE DISPLAY */}
 {isMobile && (
 <div className="bg-neutral-50/30 border border-neutral-200 rounded-2xl p-4 flex justify-between items-center text-xs">
 <button
 onClick={() => setMobileStep(prev => Math.max(1, prev - 1))}
 disabled={mobileStep === 1}
 className="p-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-700 disabled:opacity-30"
 >
 Back
 </button>
 <span>Step {mobileStep} of 4</span>
 <button
 onClick={() => setMobileStep(prev => Math.min(4, prev + 1))}
 disabled={mobileStep === 4}
 className="p-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-700 disabled:opacity-30"
 >
 Next
 </button>
 </div>
 )}

 {/* FORM CONTAINER - SECTIONS */}
 <div className="space-y-6">
 
 {/* SECTION 1: BASIC INFORMATION */}
 {(!isMobile || mobileStep === 1) && (
 <div className="bg-neutral-50/20 border border-neutral-200/60 rounded-3xl p-6 space-y-4">
 <h3 className="text-xs font-bold text-neutral-800 font-mono uppercase block border-b border-neutral-200 pb-2">1. Basic Information</h3>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Plan Name</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.name}
 onChange={e => setFormData({ ...formData, name: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Plan Code</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={formData.code}
 onChange={e => setFormData({ ...formData, code: e.target.value })}
 />
 </div>
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Description</label>
 <textarea
 rows={2}
 className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-xs text-neutral-900 focus:outline-none"
 value={formData.description}
 onChange={e => setFormData({ ...formData, description: e.target.value })}
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Category</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.category}
 onChange={e => setFormData({ ...formData, category: e.target.value })}
 >
 <option value="Monthly">Monthly</option>
 <option value="Quarterly">QuarterlyPass</option>
 <option value="Half-Yearly">Half-Yearly</option>
 <option value="Yearly">Yearly</option>
 <option value="Student">Student Discount</option>
 <option value="Corporate">Corporate Pass</option>
 </select>
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Status</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.status}
 onChange={e => setFormData({ ...formData, status: e.target.value })}
 >
 <option value="Active">Active</option>
 <option value="Draft">Draft</option>
 <option value="Inactive">Inactive</option>
 <option value="Archived">Archived</option>
 </select>
 </div>
 </div>
 </div>
 )}

 {/* SECTION 2: DURATION SETTINGS */}
 {(!isMobile || mobileStep === 2) && (
 <div className="bg-neutral-50/20 border border-neutral-200/60 rounded-3xl p-6 space-y-4">
 <h3 className="text-xs font-bold text-neutral-800 font-mono uppercase block border-b border-neutral-200 pb-2">2. Duration Settings</h3>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Duration Value</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={formData.durationValue}
 onChange={e => setFormData({ ...formData, durationValue: parseInt(e.target.value) || 1 })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Duration Type</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.durationType}
 onChange={e => setFormData({ ...formData, durationType: e.target.value })}
 >
 <option value="Days">Days</option>
 <option value="Weeks">Weeks</option>
 <option value="Months">Months</option>
 <option value="Years">Years</option>
 </select>
 </div>
 </div>
 <span className="text-[10px] text-neutral-500 font-mono block">Example values: 30 Days, 90 Days, 6 Months, 12 Months.</span>
 </div>
 )}

 {/* SECTION 3: PRICING CONFIGURATION */}
 {(!isMobile || mobileStep === 2) && (
 <div className="bg-neutral-50/20 border border-neutral-200/60 rounded-3xl p-6 space-y-4">
 <h3 className="text-xs font-bold text-neutral-800 font-mono uppercase block border-b border-neutral-200 pb-2">3. Pricing Configuration</h3>
 
 {/* WARNING BANNER */}
 <div className="flex gap-3 bg-warning-light border border-amber-200 rounded-2xl p-4 text-xs text-amber-700">
 <Info size={16} className="shrink-0 mt-0.5" />
 <div className="space-y-1">
 <p className="font-bold">Pricing Change Warning</p>
 <p className="text-neutral-600">
 This plan currently has **{originalPlan?.enrolledCount || 0} active members**. Pricing modifications should never automatically affect active members. Changes will affect future sales and renewals only.
 </p>
 </div>
 </div>

 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Base Price</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={formData.basePrice}
 onChange={e => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Joining Fee</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={formData.joiningFee}
 onChange={e => setFormData({ ...formData, joiningFee: parseFloat(e.target.value) || 0 })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Tax Percentage (%)</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={formData.taxPercentage}
 onChange={e => setFormData({ ...formData, taxPercentage: parseFloat(e.target.value) || 0 })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Currency</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={formData.currency}
 onChange={e => setFormData({ ...formData, currency: e.target.value })}
 >
 <option value="INR">INR (₹)</option>
 <option value="USD">USD ($)</option>
 </select>
 </div>
 </div>

 {/* PRICE COMPARISON ROW */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-4 grid grid-cols-3 gap-4 text-center text-xs font-mono">
 <div>
 <span className="text-[10px] text-neutral-500 font-sans block">Current Total</span>
 <span className="text-neutral-700 font-bold block mt-1">₹{currentTotal.toLocaleString()}</span>
 </div>
 <div>
 <span className="text-[10px] text-neutral-500 font-sans block">New Total (Est.)</span>
 <span className="text-success font-bold block mt-1">₹{newTotal.toLocaleString()}</span>
 </div>
 <div>
 <span className="text-[10px] text-neutral-500 font-sans block">Difference</span>
 <span className={`font-bold block mt-1 ${priceDiff >= 0 ? 'text-amber-700' : 'text-danger'}`}>
 {priceDiff >= 0 ? '+' : ''}₹{priceDiff.toLocaleString()}
 </span>
 </div>
 </div>
 </div>
 )}

 {/* SECTION 4: BRANCH AVAILABILITY */}
 {(!isMobile || mobileStep === 3) && (
 <div className="bg-neutral-50/20 border border-neutral-200/60 rounded-3xl p-6 space-y-4">
 <h3 className="text-xs font-bold text-neutral-800 font-mono uppercase block border-b border-neutral-200 pb-2">4. Branch Availability</h3>
 <div className="flex gap-4">
 <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
 <input
 type="radio"
 name="branchType"
 className="text-danger focus:ring-0 bg-neutral-50 border-neutral-200"
 checked={formData.branchAccessType === 'all'}
 onChange={() => setFormData({ ...formData, branchAccessType: 'all' })}
 />
 All Branches
 </label>
 <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
 <input
 type="radio"
 name="branchType"
 className="text-danger focus:ring-0 bg-neutral-50 border-neutral-200"
 checked={formData.branchAccessType === 'specific'}
 onChange={() => setFormData({ ...formData, branchAccessType: 'specific' })}
 />
 Selected Branches Only
 </label>
 </div>

 {formData.branchAccessType === 'specific' && (
 <div className="grid grid-cols-2 gap-3 bg-white border border-neutral-200 p-4 rounded-2xl">
 {branches.map(b => {
 const isSelected = formData.selectedBranchIds.includes(b.id);
 return (
 <button
 key={b.id}
 type="button"
 onClick={() => toggleBranch(b.id)}
 className={`p-2.5 rounded-xl border text-[11px] font-semibold text-left transition flex items-center justify-between ${
 isSelected ? 'bg-danger-light text-danger border-red-200' : 'bg-neutral-50/20 text-neutral-600 border-neutral-200'
 }`}
 >
 {b.name}
 {isSelected && <Check size={12} />}
 </button>
 );
 })}
 </div>
 )}
 </div>
 )}

 {/* SECTION 5: MEMBERSHIP BENEFITS */}
 {(!isMobile || mobileStep === 3) && (
 <div className="bg-neutral-50/20 border border-neutral-200/60 rounded-3xl p-6 space-y-4">
 <h3 className="text-xs font-bold text-neutral-800 font-mono uppercase block border-b border-neutral-200 pb-2">5. Membership Benefits</h3>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
 {[
 'Gym Access',
 'Personal Training',
 'Diet Consultation',
 'Yoga',
 'Zumba',
 'CrossFit',
 'Locker Access',
 'Parking',
 'Steam Room',
 'Sauna',
 'Swimming Pool',
 'Supplement Discounts'
 ].map((benefit, idx) => {
 const isSelected = formData.benefits.includes(benefit);
 const originallyHad = parseBenefits(originalPlan?.benefits).includes(benefit);
 
 return (
 <button
 key={idx}
 type="button"
 onClick={() => toggleBenefit(benefit)}
 className={`p-3 rounded-2xl border text-[11px] font-semibold text-left transition flex items-center justify-between ${
 isSelected ? 'bg-danger-light text-danger border-red-200' : 'bg-neutral-50/20 text-neutral-600 border-neutral-200'
 }`}
 >
 <div>
 <span>{benefit}</span>
 {isSelected !== originallyHad && (
 <span className="text-[9px] text-amber-700 block font-mono">
 {isSelected ? 'Added' : 'Removed'}
 </span>
 )}
 </div>
 {isSelected ? <CheckCircle size={14} className="text-danger" /> : <Plus size={12} />}
 </button>
 );
 })}
 </div>
 </div>
 )}

 {/* SECTION 6: ACCESS RULES & OTHER SYSTEM ARTIFACTS */}
 {(!isMobile || mobileStep === 4) && (
 <div className="bg-neutral-50/20 border border-neutral-200/60 rounded-3xl p-6 space-y-6">
 <div>
 <h3 className="text-xs font-bold text-neutral-800 font-mono uppercase block border-b border-neutral-200 pb-2">6. Access & Freeze Settings</h3>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Access Scope</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.gymAccessType}
 onChange={e => setFormData({ ...formData, gymAccessType: e.target.value })}
 >
 <option value="Single Branch">Single Branch Only</option>
 <option value="Multi Branch">Multi Branch Access</option>
 <option value="All Branches">All Branches Access</option>
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Visits Limits</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.visitsAllowed}
 onChange={e => setFormData({ ...formData, visitsAllowed: e.target.value })}
 >
 <option value="Unlimited">Unlimited Visits</option>
 <option value="Daily">Daily Limit (1/day)</option>
 <option value="Weekly">Weekly Limit (4/week)</option>
 <option value="Monthly">Monthly Limit (16/month)</option>
 </select>
 </div>
 </div>

 <div className="border-t border-neutral-200 pt-4 space-y-4">
 <div className="flex items-center gap-3">
 <input
 type="checkbox"
 id="freezeAllowed"
 className="w-4 h-4 rounded text-danger focus:ring-0 bg-neutral-50 border-neutral-200"
 checked={formData.allowFreeze}
 onChange={e => setFormData({ ...formData, allowFreeze: e.target.checked })}
 />
 <label htmlFor="freezeAllowed" className="text-xs text-neutral-700 cursor-pointer font-semibold">Allow membership freezing (holds)</label>
 </div>

 {formData.allowFreeze && (
 <div className="grid grid-cols-3 gap-4 bg-white border border-neutral-200 p-4 rounded-2xl">
 <div className="space-y-1">
 <label className="text-[9px] text-neutral-500 font-mono uppercase">Max Freeze Days</label>
 <input
 type="number"
 className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-neutral-900 font-mono"
 placeholder="30"
 value={formData.maxFreezeDays}
 onChange={e => setFormData({ ...formData, maxFreezeDays: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[9px] text-neutral-500 font-mono uppercase">Max Holds</label>
 <input
 type="number"
 className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-neutral-900 font-mono"
 placeholder="2"
 value={formData.maxFreezeRequests}
 onChange={e => setFormData({ ...formData, maxFreezeRequests: e.target.value })}
 />
 </div>
 <div className="flex items-end pb-2">
 <label className="flex items-center gap-1.5 text-[10px] text-neutral-600 cursor-pointer">
 <input
 type="checkbox"
 className="text-danger focus:ring-0 bg-neutral-50 border-neutral-200"
 checked={formData.freezeApprovalRequired}
 onChange={e => setFormData({ ...formData, freezeApprovalRequired: e.target.checked })}
 />
 Approval Req.
 </label>
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 </div>
 </div>

 {/* SIDEBAR ANALYTICS / COMPARISON COLUMNS (25% / 1 col) */}
 <div className="lg:col-span-1 space-y-6">

 {/* CHANGE COMPARISON PANEL */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Change Comparison</span>
 
 {modifiedFields.length === 0 ? (
 <div className="text-center py-6 text-neutral-500 text-xs">
 No changes made yet. Edit settings to verify modifications.
 </div>
 ) : (
 <div className="space-y-3.5">
 {modifiedFields.map((item, idx) => (
 <div key={idx} className="text-xs border-b border-neutral-200 pb-2.5 space-y-1">
 <span className="font-semibold text-neutral-600 block">{item.field}</span>
 <div className="flex items-center justify-between font-mono text-[10px]">
 <span className="text-danger line-through truncate max-w-[90px]">{item.current}</span>
 <ArrowRight size={10} className="text-neutral-400" />
 <span className="text-success font-bold truncate max-w-[90px]">{item.new}</span>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* ACTIVE MEMBER IMPACT PANEL */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Active Member Impact</span>
 
 <div className="space-y-3.5 text-xs">
 <div className="flex justify-between">
 <span className="text-neutral-600">Active Members</span>
 <span className="font-bold text-neutral-800 font-mono">{originalPlan?.enrolledCount || 0} members</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-600">Expiring Soon (30d)</span>
 <span className="font-bold text-neutral-800 font-mono">14 accounts</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-600">Upcoming Renewals</span>
 <span className="font-bold text-neutral-800 font-mono">19 members</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-600">Branches Affected</span>
 <span className="font-bold text-neutral-800 font-mono">
 {formData.branchAccessType === 'all' ? 'All' : formData.selectedBranchIds.length} locations
 </span>
 </div>

 <div className="border-t border-neutral-200 pt-3 flex gap-2 text-[10px] text-amber-700 leading-relaxed">
 <Info size={12} className="shrink-0 mt-0.5" />
 <span>Update selection rules will prompt confirmations upon clicking"Save Changes".</span>
 </div>
 </div>
 </div>

 </div>

 </div>
 )}

 </div>
 );
}
