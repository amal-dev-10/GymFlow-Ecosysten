'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
 ChevronLeft,
 DollarSign,
 TrendingUp,
 Clock,
 CheckCircle,
 Users,
 Shield,
 Sparkles,
 Info,
 Calendar,
 AlertTriangle,
 FileText,
 UserCheck,
 TrendingDown,
 Activity,
 CreditCard,
 Mail,
 Printer,
 Download,
 Check,
 ArrowRight,
 ShieldAlert,
 HelpCircle,
 FileCheck2,
 Bookmark,
 Percent,
 Plus
} from 'lucide-react';
import { gymApi, membershipsApi } from '../../../../../../lib/api';

interface MembershipPlan {
 id: string;
 name: string;
 code: string;
 category: string;
 status: 'Draft' | 'Active' | 'Inactive' | 'Archived';
 durationType: 'Days' | 'Weeks' | 'Months' | 'Years';
 durationValue: number;
 basePrice: number;
 joiningFee: number;
 taxPercentage: number;
 branchAccess: 'all' | string[];
 benefits: string[];
}

// Plan `benefits` arrive from the API as Json? — could be an array, a
// comma-separated string, or null. Normalize to a string[] so the UI can
// safely map over it.
const parseBenefits = (benefits: any): string[] => {
 if (!benefits) return [];
 if (Array.isArray(benefits)) return benefits;
 if (typeof benefits === 'string') {
 const trimmed = benefits.trim();
 if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
 try { return JSON.parse(trimmed); } catch (_) {}
 }
 return trimmed.split(',').map(b => b.trim()).filter(Boolean);
 }
 return [];
};

export default function MembershipRenewalPage() {
 const router = useRouter();
 const params = useParams();
 const id = params.id as string;

 // States
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [subscription, setSubscription] = useState<any>(null);
 const [branches, setBranches] = useState<any[]>([]);
 const [plans, setPlans] = useState<MembershipPlan[]>([]);
 const [userRole, setUserRole] = useState('receptionist');

 // Renewal Configuration State
 const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
 const [selectedPlanId, setSelectedPlanId] = useState<string>('');
 const [startDateOption, setStartDateOption] = useState<'immediately' | 'after_expiry' | 'custom'>('after_expiry');
 const [customStartDate, setCustomStartDate] = useState<string>('');
 const [renewalDuration, setRenewalDuration] = useState<number>(12); // months
 const [assignedTrainer, setAssignedTrainer] = useState<string>('');
 const [assignedDietitian, setAssignedDietitian] = useState<string>('');
 const [branchAccessOption, setBranchAccessOption] = useState<'all' | 'home_only'>('all');

 // Pricing & Discounts State
 const [discountType, setDiscountType] = useState<'none' | 'loyalty' | 'early' | 'corporate' | 'referral' | 'custom'>('none');
 const [customDiscountAmount, setCustomDiscountAmount] = useState<string>('0');
 const [requiresApproval, setRequiresApproval] = useState(false);
 const [approvalGranted, setApprovalGranted] = useState(false);
 const [approvalManagerCode, setApprovalManagerCode] = useState('');

 // Payment Selection State
 const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Card' | 'Split'>('UPI');
 const [splitAmounts, setSplitAmounts] = useState({ upi: '', cash: '', card: '' });
 const [outstandingDuesAction, setOutstandingDuesAction] = useState<'collect_together' | 'collect_separately'>('collect_together');

 // Generated Invoice & Receipt Mock IDs
 const [generatedInvoiceNum] = useState(`INV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
 const [generatedReceiptNum] = useState(`RCT-2026-${Math.floor(1000 + Math.random() * 9000)}`);

 // Toast
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
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
 } catch (_) {}
 }

 // Fetch branches
 const branchList = await gymApi.list(orgId);
 setBranches(branchList || []);

 // Fetch active plans
 const activePlans = await membershipsApi.listPlans();
 const filteredPlans = (activePlans || [])
 .filter(p => p.status === 'Active')
 .map(p => ({ ...p, benefits: parseBenefits(p.benefits) }));
 setPlans(filteredPlans);

 // Fetch current subscription
 const sub = await membershipsApi.getSubscription(id);
 setSubscription(sub);

 // Default selected plan to same plan
 if (sub && sub.planId) {
 setSelectedPlanId(sub.planId);
 // Find default assigned trainer/dietitian
 setAssignedTrainer(sub.assignedTrainer || 'Trainer Sarah');
 setAssignedDietitian(sub.assignedDietitian || 'Dietitian Emily');
 }

 // Default custom start date to tomorrow
 const tomorrow = new Date();
 tomorrow.setDate(tomorrow.getDate() + 1);
 setCustomStartDate(tomorrow.toISOString().split('T')[0]);

 } catch (err) {
 console.error(err);
 showToast('Failed to load renewal workspace data', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [id]);

 if (loading || !subscription) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Initializing renewal workspace config...
 </div>
 );
 }

 // Find selected plan details
 const selectedPlan = plans.find(p => p.id === selectedPlanId);
 const currentPlan = plans.find(p => p.id === subscription.planId) || {
 name: subscription.planName || 'Current Plan',
 basePrice: subscription.amountPaid ? subscription.amountPaid * 0.8 : 8000,
 benefits: ['General gym floor access', 'Lockers', 'Standard showers']
 };

 // Check upgrade/downgrade condition
 const isUpgrade = selectedPlan && selectedPlan.basePrice > currentPlan.basePrice;
 const isDowngrade = selectedPlan && selectedPlan.basePrice < currentPlan.basePrice;
 const isSamePlan = selectedPlan && selectedPlan.id === subscription.planId;

 // Days remaining & eligibility
 const today = new Date();
 const end = new Date(subscription.endDate);
 const diffTime = end.getTime() - today.getTime();
 const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
 const isExpired = daysRemaining < 0;

 // Outstanding dues
 const outstandingBal = Math.max(0, (subscription.totalAmount || 12000) - (subscription.amountPaid || 12000));

 // Eligibility code
 let eligibilityStatus: 'Eligible' | 'Requires Approval' | 'Blocked' = 'Eligible';
 let eligibilityReason = 'Subscription is in good standing.';
 if (subscription.status === 'Cancelled' || subscription.status === 'Archived') {
 eligibilityStatus = 'Blocked';
 eligibilityReason = 'Cancelled or archived subscriptions cannot be directly renewed.';
 } else if (outstandingBal > 0) {
 eligibilityStatus = 'Requires Approval';
 eligibilityReason = 'Outstanding balance must be resolved or bundled with the renewal payment.';
 } else if (subscription.status === 'Frozen') {
 eligibilityStatus = 'Requires Approval';
 eligibilityReason = 'Subscription is currently on a freeze hold.';
 }

 // Date math
 const getNewExpiryDate = () => {
 let baseDate = new Date();
 if (startDateOption === 'after_expiry' && !isExpired) {
 baseDate = new Date(subscription.endDate);
 } else if (startDateOption === 'custom' && customStartDate) {
 baseDate = new Date(customStartDate);
 }
 
 // Add renewal plan months
 const durationMonths = selectedPlan ? selectedPlan.durationValue : renewalDuration;
 baseDate.setMonth(baseDate.getMonth() + durationMonths);
 return baseDate.toISOString().split('T')[0];
 };

 const getNewStartDate = () => {
 if (startDateOption === 'after_expiry' && !isExpired) {
 return subscription.endDate;
 } else if (startDateOption === 'custom' && customStartDate) {
 return customStartDate;
 }
 return new Date().toISOString().split('T')[0];
 };

 // Pricing calculations
 const baseFee = selectedPlan ? selectedPlan.basePrice : 8000;
 const upgradeFee = isUpgrade ? Math.max(0, baseFee - currentPlan.basePrice) : 0;
 const renewalFee = baseFee;

 let discountAmount = 0;
 if (discountType === 'loyalty') {
 discountAmount = Math.round(renewalFee * 0.10); // 10% loyalty discount
 } else if (discountType === 'early') {
 discountAmount = Math.round(renewalFee * 0.08); // 8% early discount
 } else if (discountType === 'corporate') {
 discountAmount = Math.round(renewalFee * 0.12); // 12% corporate discount
 } else if (discountType === 'referral') {
 discountAmount = Math.round(renewalFee * 0.05); // 5% referral discount
 } else if (discountType === 'custom') {
 discountAmount = parseFloat(customDiscountAmount) || 0;
 }

 // Rule: Custom discounts > 25% require manager approval override
 const maxAllowedNoApproval = renewalFee * 0.25;
 const isHighDiscount = discountType === 'custom' && discountAmount > maxAllowedNoApproval;

 const totalBeforeTax = Math.max(0, renewalFee - discountAmount);
 const gstTax = Math.round(totalBeforeTax * 0.18); // Default 18% GST
 const totalRenewalAmount = totalBeforeTax + gstTax;

 const finalTotalPayable = outstandingDuesAction === 'collect_together' 
 ? totalRenewalAmount + outstandingBal 
 : totalRenewalAmount;

 // Verification helper for Manager code
 const handleVerifyManagerCode = (e: React.FormEvent) => {
 e.preventDefault();
 if (approvalManagerCode === '9999' || approvalManagerCode === '1234') {
 setApprovalGranted(true);
 showToast('Manager approval override authenticated');
 } else {
 showToast('Invalid override manager code', 'error');
 }
 };

 const handleCheckoutSubmit = async () => {
 if (isHighDiscount && !approvalGranted) {
 showToast('Manager approval code is required for high custom discounts', 'error');
 return;
 }

 if (eligibilityStatus === 'Blocked') {
 showToast('Subscription is blocked from renewal.', 'error');
 return;
 }

 try {
 setSaving(true);
 // Simulate API saving and state modifications
 await new Promise(resolve => setTimeout(resolve, 800));
 setCurrentStep(4); // Advance to Success Screen
 showToast('Membership renewed successfully');
 } catch (_) {
 showToast('Renewal failed. Please check logs.', 'error');
 } finally {
 setSaving(false);
 }
 };

 return (
 <div className="min-h-screen bg-white text-neutral-900 p-8 space-y-6 relative overflow-hidden">
 
 {/* BACKGROUND GLOW */}

 {/* TOAST NOTIFICATION */}
 {toast && (
 <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border ${
 toast.type === 'success' 
 ? 'bg-success-light text-success border-green-200' 
 : 'bg-danger-light text-danger border-red-200'
 }`}>
 <span className="text-xs font-semibold">{toast.message}</span>
 </div>
 )}

 {/* HEADER SECTION */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-200/80 pb-6">
 <div className="flex items-center gap-3">
 <button
 onClick={() => router.push(`/workspace/memberships/subscriptions/${id}`)}
 className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 hover:text-neutral-800 transition"
 >
 <ChevronLeft size={16} />
 </button>
 <div>
 <h1 className="text-xl font-bold text-neutral-900 font-display flex items-center gap-2">
 Membership Renewal Workspace
 </h1>
 <p className="text-xs text-neutral-600 mt-1">
 Renew subscription for <strong className="text-neutral-800">{subscription.memberName}</strong> ({subscription.memberId})
 </p>
 </div>
 </div>

 {/* STEPPER WIDGET */}
 <div className="flex items-center gap-2 text-[10px] font-mono uppercase bg-neutral-50/40 border border-neutral-200/60 p-2 rounded-xl">
 <span className={`${currentStep === 1 ? 'text-danger font-bold' : 'text-neutral-500'}`}>1. Configure</span>
 <span className="text-neutral-400">/</span>
 <span className={`${currentStep === 2 ? 'text-danger font-bold' : 'text-neutral-500'}`}>2. Discounts & Tax</span>
 <span className="text-neutral-400">/</span>
 <span className={`${currentStep === 3 ? 'text-danger font-bold' : 'text-neutral-500'}`}>3. Checkout</span>
 <span className="text-neutral-400">/</span>
 <span className={`${currentStep === 4 ? 'text-success font-bold' : 'text-neutral-500'}`}>4. Complete</span>
 </div>
 </div>

 {/* FINANCIAL KPI WIDGETS */}
 <div className="grid grid-cols-2 md:grid-cols-5 gap-4 font-mono">
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Renewals This Month</span>
 <span className="text-sm font-bold text-neutral-900 block mt-1">142 Members</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Renewal Revenue</span>
 <span className="text-sm font-bold text-success block mt-1">₹14.2L</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Success Rate</span>
 <span className="text-sm font-bold text-danger block mt-1">94.8%</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Upcoming Expirations</span>
 <span className="text-sm font-bold text-amber-700 block mt-1">18 Members</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-4 rounded-xl">
 <span className="text-[9px] text-neutral-500 uppercase font-sans">Expired (Pending)</span>
 <span className="text-sm font-bold text-red-450 block mt-1">12 Members</span>
 </div>
 </div>

 {/* AUDIT LOG ROLE WARNING */}
 {['trainer', 'dietitian'].includes(userRole) && (
 <div className="bg-warning-light border border-amber-200 rounded-2xl p-4 text-xs text-amber-700 flex items-start gap-3">
 <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
 <div>
 <strong>View Only Mode:</strong> Your profile ({userRole}) only has read permissions. Submissions are restricted.
 </div>
 </div>
 )}

 {/* RENEWAL SUCCESS STATE SCREEN */}
 {currentStep === 4 ? (
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-8 max-w-2xl mx-auto text-center space-y-6">
 <div className="w-16 h-16 bg-success-light border border-green-200 text-success rounded-full flex items-center justify-center mx-auto">
 <CheckCircle size={32} />
 </div>

 <div className="space-y-2">
 <h2 className="text-lg font-bold text-neutral-900 font-display">Membership Renewed Successfully</h2>
 <p className="text-xs text-neutral-600">
 The subscription transition has been logged in GymFlow ledgers. A confirmation notification has been dispatched to the member.
 </p>
 </div>

 {/* Success Invoice Details Box */}
 <div className="bg-white border border-neutral-200 p-6 rounded-2xl text-left font-mono text-xs space-y-3">
 <div className="flex justify-between"><span className="text-neutral-500">Member Name</span><span className="text-neutral-800 font-bold">{subscription.memberName}</span></div>
 <div className="flex justify-between"><span className="text-neutral-500">Membership Number</span><span className="text-neutral-800">{subscription.subscriptionCode || 'SUB-7890'}</span></div>
 <div className="flex justify-between"><span className="text-neutral-500">Renewal Plan</span><span className="text-neutral-800 font-bold">{selectedPlan ? selectedPlan.name : 'Custom Plan'}</span></div>
 <div className="flex justify-between"><span className="text-neutral-500">Previous End Date</span><span className="text-neutral-500">{subscription.endDate}</span></div>
 <div className="flex justify-between"><span className="text-neutral-500">New Validity Window</span><span className="text-success font-bold">{getNewStartDate()} to {getNewExpiryDate()}</span></div>
 <div className="flex justify-between"><span className="text-neutral-500">Amount Paid</span><span className="text-success font-bold">₹{finalTotalPayable.toLocaleString()}</span></div>
 <div className="flex justify-between"><span className="text-neutral-500">Invoice Reference</span><span className="text-neutral-800">{generatedInvoiceNum}</span></div>
 <div className="flex justify-between"><span className="text-neutral-500">Receipt Reference</span><span className="text-neutral-800">{generatedReceiptNum}</span></div>
 </div>

 {/* Actions */}
 <div className="flex flex-wrap gap-4 justify-center pt-2">
 <button
 onClick={() => router.push(`/workspace/memberships/subscriptions/${id}`)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 View Membership Profile
 </button>
 <button
 onClick={() => window.print()}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
 <Printer size={13} />
 <span>Print Receipt</span>
 </button>
 <button
 onClick={() => showToast('Receipt resent via email and WhatsApp!')}
 className="px-4 py-2 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
 <Mail size={13} />
 <span>Resend Receipt</span>
 </button>
 </div>
 </div>
 ) : (
 /* CORE WIZARD FLOW SCREEN (Steps 1, 2, 3) */
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 
 {/* LEFT/CENTER WORKSPACE (Col span 2) */}
 <div className="lg:col-span-2 space-y-6">

 {/* MEMBER OVERVIEW PANEL */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Member Information & Current Plan</span>
 
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
 <div>
 <span className="text-[9px] text-neutral-500 font-sans block">Member Name</span>
 <span className="text-neutral-900 font-bold block mt-0.5">{subscription.memberName}</span>
 </div>
 <div>
 <span className="text-[9px] text-neutral-500 font-sans block">Member ID</span>
 <span className="text-neutral-700 block mt-0.5">{subscription.memberId}</span>
 </div>
 <div>
 <span className="text-[9px] text-neutral-500 font-sans block">Subscription Code</span>
 <span className="text-neutral-700 block mt-0.5">{subscription.subscriptionCode || 'SUB-7890'}</span>
 </div>
 <div>
 <span className="text-[9px] text-neutral-500 font-sans block">Home Branch</span>
 <span className="text-neutral-700 block mt-0.5">{subscription.gymName || 'Technopark Branch'}</span>
 </div>
 <div>
 <span className="text-[9px] text-neutral-500 font-sans block">Current Plan</span>
 <span className="text-neutral-900 font-bold block mt-0.5">{subscription.planName}</span>
 </div>
 <div>
 <span className="text-[9px] text-neutral-500 font-sans block">Current End Date</span>
 <span className={`block mt-0.5 font-bold ${isExpired ? 'text-danger' : 'text-neutral-700'}`}>
 {subscription.endDate} {isExpired ? '(Expired)' : ''}
 </span>
 </div>
 <div>
 <span className="text-[9px] text-neutral-500 font-sans block">Days Remaining</span>
 <span className={`block mt-0.5 font-bold ${isExpired ? 'text-danger' : 'text-neutral-700'}`}>
 {isExpired ? `${Math.abs(daysRemaining)} days past` : `${daysRemaining} days left`}
 </span>
 </div>
 <div>
 <span className="text-[9px] text-neutral-500 font-sans block">Outstanding Balance</span>
 <span className={`block mt-0.5 font-bold ${outstandingBal > 0 ? 'text-danger' : 'text-neutral-500'}`}>
 ₹{outstandingBal.toLocaleString()}
 </span>
 </div>
 </div>
 </div>

 {/* STEP 1: CONFIGURE RENEWAL */}
 {currentStep === 1 && (
 <div className="space-y-6">
 
 {/* RENEWAL OPTIONS */}
 <div className="space-y-3">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Renewal Pathways</span>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <button
 onClick={() => {
 const samePlan = plans.find(p => p.id === subscription.planId);
 if (samePlan) setSelectedPlanId(samePlan.id);
 }}
 className={`p-4 border text-left rounded-2xl transition flex flex-col justify-between h-32 ${
 isSamePlan 
 ? 'bg-danger-light border-red-200 text-neutral-900 shadow-lg ' 
 : 'bg-white border-neutral-200/60 hover:border-neutral-200 text-neutral-600'
 }`}
 >
 <div>
 <span className="text-[10px] font-bold uppercase tracking-wider block font-mono text-danger">Option 1</span>
 <h4 className="text-xs font-bold text-neutral-800 mt-1">Same Plan Renewal</h4>
 <p className="text-[10px] text-neutral-600 mt-1 leading-normal">Renew the current plan at matching price levels.</p>
 </div>
 <span className="text-[10px] font-mono font-semibold">Price: ₹{currentPlan.basePrice.toLocaleString()}</span>
 </button>

 <button
 onClick={() => {
 const upgrade = plans.find(p => p.basePrice > currentPlan.basePrice);
 if (upgrade) setSelectedPlanId(upgrade.id);
 }}
 className={`p-4 border text-left rounded-2xl transition flex flex-col justify-between h-32 ${
 isUpgrade 
 ? 'bg-danger-light border-red-200 text-neutral-900 shadow-lg ' 
 : 'bg-white border-neutral-200/60 hover:border-neutral-200 text-neutral-600'
 }`}
 >
 <div>
 <span className="text-[10px] font-bold uppercase tracking-wider block font-mono text-danger">Option 2</span>
 <h4 className="text-xs font-bold text-neutral-800 mt-1 flex items-center gap-1">
 Upgrade Renewal
 <span className="px-1 py-0.5 text-[8px] bg-success-light text-success rounded">Recommended</span>
 </h4>
 <p className="text-[10px] text-neutral-600 mt-1 leading-normal">Transition to premium options with higher training limits.</p>
 </div>
 <span className="text-[10px] font-mono font-semibold">Compare tier differences</span>
 </button>

 <button
 onClick={() => {
 const downgrade = plans.find(p => p.basePrice < currentPlan.basePrice);
 if (downgrade) setSelectedPlanId(downgrade.id);
 }}
 className={`p-4 border text-left rounded-2xl transition flex flex-col justify-between h-32 ${
 isDowngrade 
 ? 'bg-danger-light border-red-200 text-neutral-900 shadow-lg ' 
 : 'bg-white border-neutral-200/60 hover:border-neutral-200 text-neutral-600'
 }`}
 >
 <div>
 <span className="text-[10px] font-bold uppercase tracking-wider block font-mono text-danger">Option 3</span>
 <h4 className="text-xs font-bold text-neutral-800 mt-1">Downgrade Renewal</h4>
 <p className="text-[10px] text-neutral-600 mt-1 leading-normal">Reduce pricing tiers by scaling down session allowances.</p>
 </div>
 <span className="text-[10px] font-mono font-semibold">Lower billing rate</span>
 </button>
 </div>
 </div>

 {/* PLANS SELECTION CARD LIST */}
 <div className="space-y-3">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Available Active Plans</span>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {plans.map(p => (
 <div
 key={p.id}
 onClick={() => setSelectedPlanId(p.id)}
 className={`p-5 rounded-2xl border transition cursor-pointer relative flex flex-col justify-between gap-4 ${
 selectedPlanId === p.id 
 ? 'bg-neutral-50/60 border-red-200 shadow-lg ' 
 : 'bg-white border-neutral-200 hover:border-neutral-200'
 }`}
 >
 <div className="space-y-1.5">
 <div className="flex justify-between items-start">
 <h4 className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
 {p.name}
 {p.basePrice > 10000 && (
 <span className="px-1.5 py-0.5 text-[8px] bg-danger-light text-danger border border-red-200 rounded font-mono uppercase font-bold">Popular</span>
 )}
 </h4>
 <span className="text-xs font-bold font-mono text-neutral-800">₹{p.basePrice.toLocaleString()}</span>
 </div>
 <span className="text-[10px] text-neutral-500 block font-mono">
 Duration: {p.durationValue} {p.durationType} • Category: {p.category}
 </span>
 </div>

 {/* Plan benefits */}
 <div className="space-y-1 font-mono text-[9px] text-neutral-600">
 {p.benefits.map((b, idx) => (
 <div key={idx} className="flex items-center gap-1.5">
 <Check className="w-3 h-3 text-danger shrink-0" />
 <span>{b}</span>
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* RENEWAL PARAMETER CONFIG */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Renewal Parameters Configuration</span>
 
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
 
 {/* Start Date choice */}
 <div className="space-y-1.5">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Effective Start Date</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
 value={startDateOption}
 onChange={e => setStartDateOption(e.target.value as any)}
 >
 <option value="after_expiry">Immediately After Expiry ({subscription.endDate})</option>
 <option value="immediately">Immediately Today ({new Date().toISOString().split('T')[0]})</option>
 <option value="custom">Custom Specified Date</option>
 </select>
 </div>

 {/* Custom start date */}
 {startDateOption === 'custom' && (
 <div className="space-y-1.5">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Custom Start Date</label>
 <input
 type="date"
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono"
 value={customStartDate}
 onChange={e => setCustomStartDate(e.target.value)}
 />
 </div>
 )}

 {/* Assigned Trainer */}
 <div className="space-y-1.5">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Assigned Trainer</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
 value={assignedTrainer}
 onChange={e => setAssignedTrainer(e.target.value)}
 >
 <option value="">No Trainer Assigned</option>
 <option value="Trainer Sarah">Trainer Sarah (Personal Trainer)</option>
 <option value="Trainer Frank">Trainer Frank (Strength & Conditioning)</option>
 <option value="Trainer Liam">Trainer Liam (Cardio Specialist)</option>
 </select>
 </div>

 {/* Assigned Dietitian */}
 <div className="space-y-1.5">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Assigned Dietitian</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
 value={assignedDietitian}
 onChange={e => setAssignedDietitian(e.target.value)}
 >
 <option value="">No Dietitian Assigned</option>
 <option value="Dietitian Emily">Dietitian Emily (Weight Loss Nutrition)</option>
 <option value="Dietitian Jacob">Dietitian Jacob (Hypertrophy Dietetics)</option>
 </select>
 </div>

 {/* Branch access option */}
 <div className="space-y-1.5">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Branch Access Tier</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
 value={branchAccessOption}
 onChange={e => setBranchAccessOption(e.target.value as any)}
 >
 <option value="all">Access to All Branches (Multi-site access)</option>
 <option value="home_only">Home Branch Only</option>
 </select>
 </div>

 </div>
 </div>

 </div>
 )}

 {/* STEP 2: DISCOUNTS & TAXATION */}
 {currentStep === 2 && (
 <div className="space-y-6">

 {/* UPGRADE / DOWNGRADE BENEFIT SHIFTS */}
 {(isUpgrade || isDowngrade) && (
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Subscription Shift Dynamics</span>
 
 <div className="flex items-start gap-4">
 {isUpgrade ? (
 <>
 <TrendingUp className="w-8 h-8 text-success shrink-0" />
 <div className="space-y-1.5 text-xs text-neutral-600">
 <h4 className="font-bold text-neutral-800 text-sm">Tier Upgrade Transition</h4>
 <p>
 The member is upgrading from <strong className="text-neutral-900">{currentPlan.name}</strong> to <strong className="text-neutral-900">{selectedPlan?.name}</strong>.
 </p>
 <div className="bg-success-light border border-green-200 p-3 rounded-xl text-[10px] space-y-1">
 <strong>Added benefits details:</strong>
 <ul className="list-disc pl-4 space-y-0.5">
 <li>Multi-site branch check-ins included</li>
 <li>2 free PT sessions monthly</li>
 <li>Priority locker booking access</li>
 </ul>
 </div>
 </div>
 </>
 ) : (
 <>
 <TrendingDown className="w-8 h-8 text-danger shrink-0" />
 <div className="space-y-1.5 text-xs text-neutral-600">
 <h4 className="font-bold text-neutral-800 text-sm">Tier Downgrade Transition</h4>
 <p>
 The member is downgrading from <strong className="text-neutral-900">{currentPlan.name}</strong> to <strong className="text-neutral-900">{selectedPlan?.name}</strong>.
 </p>
 <div className="bg-danger-light border border-red-200 p-3 rounded-xl text-[10px] space-y-1">
 <strong>Removed benefits details:</strong>
 <ul className="list-disc pl-4 space-y-0.5">
 <li>Multi-site check-in permissions revoked</li>
 <li>Personal trainer matching not included</li>
 </ul>
 </div>
 </div>
 </>
 )}
 </div>
 </div>
 )}

 {/* DISCOUNTS CONFIGURATION PANEL */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 space-y-6">
 <div>
 <h3 className="text-xs font-bold text-neutral-900 font-display">Configure Renewal Discount Incentive</h3>
 <p className="text-[10px] text-neutral-600 mt-1">Select an applicable discount category to adjust final pricing.</p>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
 {[
 { type: 'none', label: 'No Discount', desc: 'Standard plan pricing' },
 { type: 'loyalty', label: '10% Loyalty Discount', desc: 'GymFlow rewards program' },
 { type: 'early', label: '8% Early Renewal', desc: 'Pre-expiry renewal bonus' },
 { type: 'corporate', label: '12% Corporate Partner', desc: 'Organization tied rate' },
 { type: 'referral', label: '5% Member Referral', desc: 'Referral incentive rebate' },
 { type: 'custom', label: 'Custom Deduction', desc: 'Manual staff markdown override' }
 ].map(d => (
 <button
 key={d.type}
 onClick={() => setDiscountType(d.type as any)}
 className={`p-4 border text-left rounded-xl transition ${
 discountType === d.type 
 ? 'bg-danger-light border-red-200 text-neutral-900 shadow-md ' 
 : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-200'
 }`}
 >
 <span className="text-xs font-bold block text-neutral-800">{d.label}</span>
 <span className="text-[9px] text-neutral-500 block font-mono mt-1">{d.desc}</span>
 </button>
 ))}
 </div>

 {discountType === 'custom' && (
 <div className="max-w-xs space-y-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Custom Discount Amount (₹)</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono text-xs"
 value={customDiscountAmount}
 onChange={e => setCustomDiscountAmount(e.target.value)}
 />
 </div>

 {/* Approval flow logic if discount > 25% */}
 {isHighDiscount && (
 <div className="bg-danger-light border border-red-200 rounded-2xl p-4 space-y-3">
 <div className="flex gap-2.5 items-start text-[11px]">
 <ShieldAlert className="w-5 h-5 text-danger shrink-0 mt-0.5" />
 <div className="space-y-1">
 <span className="font-bold text-danger block">Manager Approval Required</span>
 <span className="text-neutral-600 block leading-relaxed">
 Discounts exceeding 25% (₹{maxAllowedNoApproval.toLocaleString()}) require manager authentication.
 </span>
 </div>
 </div>

 {!approvalGranted ? (
 <form onSubmit={handleVerifyManagerCode} className="flex gap-2">
 <input
 type="password"
 placeholder="Enter Manager Pin"
 className="bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs text-neutral-900 font-mono w-full"
 value={approvalManagerCode}
 onChange={e => setApprovalManagerCode(e.target.value)}
 />
 <button
 type="submit"
 className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-neutral-900 text-[10px] font-bold rounded-xl transition uppercase shrink-0"
 >
 Authenticate
 </button>
 </form>
 ) : (
 <div className="flex gap-1.5 items-center text-[10px] text-success font-bold font-mono">
 <CheckCircle size={14} />
 <span>Manager Override Authenticated</span>
 </div>
 )}
 </div>
 )}
 </div>
 )}

 {/* TAX INFORMATION BLOCK */}
 <div className="bg-neutral-50/10 border border-neutral-200 p-4 rounded-2xl text-[10px] text-neutral-600 font-mono space-y-1">
 <strong>GST Taxation Rules applied:</strong>
 <p>All fitness center memberships are taxable at a default rate of 18% GST (CGST 9% + SGST 9%) under section 999723.</p>
 </div>
 </div>

 </div>
 )}

 {/* STEP 3: CHECKOUT & PAYMENT COLLECTION */}
 {currentStep === 3 && (
 <div className="space-y-6">

 {/* OUTSTANDING BALANCE HANDLING */}
 {outstandingBal > 0 && (
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Unsettled Dues Consolidation</span>
 
 <div className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <button
 onClick={() => setOutstandingDuesAction('collect_together')}
 className={`p-4 border text-left rounded-xl transition ${
 outstandingDuesAction === 'collect_together'
 ? 'bg-danger-light border-red-200 text-neutral-900'
 : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-200'
 }`}
 >
 <span className="text-xs font-bold block text-neutral-800">Collect Combined Dues</span>
 <span className="text-[9px] text-neutral-500 block font-mono mt-1">Add previous dues (₹{outstandingBal.toLocaleString()}) to checkout billing.</span>
 </button>

 <button
 onClick={() => setOutstandingDuesAction('collect_separately')}
 className={`p-4 border text-left rounded-xl transition ${
 outstandingDuesAction === 'collect_separately'
 ? 'bg-danger-light border-red-200 text-neutral-900'
 : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-200'
 }`}
 >
 <span className="text-xs font-bold block text-neutral-800">Collect Renewal Only</span>
 <span className="text-[9px] text-neutral-500 block font-mono mt-1">Settle outstanding balances via separate transactions.</span>
 </button>
 </div>
 </div>
 </div>
 )}

 {/* PAYMENT METHOD SELECTION */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 space-y-6">
 <div>
 <h3 className="text-xs font-bold text-neutral-900 font-display">Collect Transaction Payment</h3>
 <p className="text-[10px] text-neutral-600 mt-1">Select a primary billing gateway or register split payouts.</p>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
 {[
 { method: 'UPI', label: 'UPI QR Code / Intent' },
 { method: 'Cash', label: 'Cash Drawer Settlement' },
 { method: 'Card', label: 'Card POS Terminal' },
 { method: 'Split', label: 'Split Payments Ledger' }
 ].map(p => (
 <button
 key={p.method}
 onClick={() => setPaymentMethod(p.method as any)}
 className={`p-4 border text-center rounded-xl transition ${
 paymentMethod === p.method 
 ? 'bg-neutral-50/60 border-red-200 text-neutral-900' 
 : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-200'
 }`}
 >
 <CreditCard className="w-4 h-4 text-danger mx-auto mb-1.5" />
 <span className="text-[10px] font-bold block text-neutral-800">{p.label}</span>
 </button>
 ))}
 </div>

 {paymentMethod === 'Split' && (
 <div className="bg-white border border-neutral-200 p-5 rounded-2xl max-w-sm space-y-3 font-mono text-xs">
 <h4 className="text-[10px] text-neutral-500 uppercase font-sans font-semibold">Define Split Division</h4>
 
 <div className="space-y-2.5">
 <div className="flex items-center justify-between gap-4">
 <span className="text-neutral-600 shrink-0">UPI Amount</span>
 <input
 type="number"
 placeholder="e.g. 5000"
 className="bg-white border border-neutral-200 rounded-lg px-2.5 py-1 text-neutral-900 text-right font-mono text-xs w-32 focus:outline-none focus:border-neutral-200"
 value={splitAmounts.upi}
 onChange={e => setSplitAmounts({ ...splitAmounts, upi: e.target.value })}
 />
 </div>
 <div className="flex items-center justify-between gap-4">
 <span className="text-neutral-600 shrink-0">Cash Amount</span>
 <input
 type="number"
 placeholder="e.g. 2000"
 className="bg-white border border-neutral-200 rounded-lg px-2.5 py-1 text-neutral-900 text-right font-mono text-xs w-32 focus:outline-none focus:border-neutral-200"
 value={splitAmounts.cash}
 onChange={e => setSplitAmounts({ ...splitAmounts, cash: e.target.value })}
 />
 </div>
 <div className="flex items-center justify-between gap-4">
 <span className="text-neutral-600 shrink-0">Card Amount</span>
 <input
 type="number"
 placeholder="e.g. 3000"
 className="bg-white border border-neutral-200 rounded-lg px-2.5 py-1 text-neutral-900 text-right font-mono text-xs w-32 focus:outline-none focus:border-neutral-200"
 value={splitAmounts.card}
 onChange={e => setSplitAmounts({ ...splitAmounts, card: e.target.value })}
 />
 </div>
 </div>
 </div>
 )}

 {/* PREVIEW AND LEGAL AGREEMENTS */}
 <div className="bg-neutral-50/10 border border-neutral-200 p-4 rounded-2xl text-[10px] text-neutral-600 font-mono space-y-2">
 <strong>Invoice & Membership Agreement Terms:</strong>
 <p>Generating this renewal commits the system to issue invoice reference <strong>{generatedInvoiceNum}</strong>. A matching receipt <strong>{generatedReceiptNum}</strong> will be registered. Membership validity is automatically extended immediately upon confirmation.</p>
 </div>
 </div>

 </div>
 )}

 {/* PREVIOUS & NEXT WIZARD BUTTONS */}
 <div className="flex justify-between items-center pt-2">
 {currentStep > 1 ? (
 <button
 onClick={() => setCurrentStep((currentStep - 1) as any)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Previous Step
 </button>
 ) : (
 <div />
 )}

 {currentStep < 3 ? (
 <button
 onClick={() => setCurrentStep((currentStep + 1) as any)}
 className="px-4 py-2 bg-primary hover:bg-primary-hover text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Continue Setup
 </button>
 ) : (
 <button
 onClick={handleCheckoutSubmit}
 disabled={saving}
 className="px-6 py-2.5 bg-success hover:bg-green-600 text-white text-xs font-bold rounded-xl transition shadow-lg"
 >
 {saving ? 'Registering Renewal...' : 'Renew Membership'}
 </button>
 )}
 </div>

 </div>

 {/* RIGHT COLUMN: RENEWAL PREVIEW SUMMARY (Col span 1) */}
 <div className="lg:col-span-1 space-y-6">

 {/* RENEWAL ELIGIBILITY PANEL */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-3.5">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Renewal Eligibility Audit</span>
 
 <div className="space-y-3 text-xs">
 <div className="flex justify-between items-center">
 <span className="text-neutral-600">Current Expiry Status</span>
 <span className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono uppercase ${isExpired ? 'bg-danger-light text-danger border border-red-200' : 'bg-success-light text-success border border-green-200'}`}>
 {isExpired ? 'Expired' : 'Active'}
 </span>
 </div>

 <div className="flex justify-between items-center">
 <span className="text-neutral-600">Eligibility Audit Status</span>
 <span className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono uppercase ${
 eligibilityStatus === 'Eligible' 
 ? 'bg-success-light text-success border border-green-200'
 : eligibilityStatus === 'Blocked'
 ? 'bg-danger-light text-danger border border-red-200'
 : 'bg-warning-light text-amber-700 border border-amber-200'
 }`}>
 {eligibilityStatus}
 </span>
 </div>

 <p className="text-[10px] text-neutral-500 font-mono leading-relaxed bg-white border border-neutral-200 p-2.5 rounded-xl">
 {eligibilityReason}
 </p>
 </div>
 </div>

 {/* LIVE PRICING CALCULATOR */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Live Billing Breakdown</span>
 
 <div className="space-y-2.5 font-mono text-xs">
 <div className="flex justify-between"><span className="text-neutral-600">Plan Rate ({selectedPlan ? selectedPlan.name : 'No plan selected'})</span><span className="text-neutral-800 font-semibold">₹{renewalFee.toLocaleString()}</span></div>
 
 {isUpgrade && (
 <div className="flex justify-between text-success"><span className="font-sans">Upgrade Delta Included</span><span>+₹{upgradeFee.toLocaleString()}</span></div>
 )}

 {discountAmount > 0 && (
 <div className="flex justify-between text-danger">
 <span className="font-sans flex items-center gap-1">
 <Percent size={11} /> Discount Deduction ({discountType.toUpperCase()})
 </span>
 <span>-₹{discountAmount.toLocaleString()}</span>
 </div>
 )}

 <div className="flex justify-between text-neutral-600"><span>GST Tax (18%)</span><span>₹{gstTax.toLocaleString()}</span></div>
 
 <div className="flex justify-between border-t border-neutral-200 pt-2 font-sans font-bold text-neutral-900">
 <span>Net Renewal Total</span>
 <span className="text-success">₹{totalRenewalAmount.toLocaleString()}</span>
 </div>

 {outstandingBal > 0 && outstandingDuesAction === 'collect_together' && (
 <div className="flex justify-between text-[11px] text-danger border-t border-dashed border-neutral-200 pt-2">
 <span>Outstanding Balance Bundled</span>
 <span>+₹{outstandingBal.toLocaleString()}</span>
 </div>
 )}

 <div className="flex justify-between border-t border-neutral-200 pt-2 font-sans font-black text-sm text-neutral-900">
 <span>Total Payable Today</span>
 <span className="text-danger">₹{finalTotalPayable.toLocaleString()}</span>
 </div>
 </div>
 </div>

 {/* EXPIRY PREVIEW COMPARATOR */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-3.5">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Validity Shift Forecast</span>
 
 <div className="space-y-3 text-xs font-mono">
 <div className="flex justify-between">
 <span className="text-neutral-500">Current Start</span>
 <span className="text-neutral-600">{subscription.startDate}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">Current Expiry</span>
 <span className="text-neutral-600">{subscription.endDate}</span>
 </div>
 
 <div className="border-t border-dashed border-neutral-200 my-2" />

 <div className="flex justify-between">
 <span className="text-neutral-600 font-bold">New Start Date</span>
 <span className="text-neutral-800">{getNewStartDate()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-success font-bold">New Expiry Date</span>
 <span className="text-success font-bold">{getNewExpiryDate()}</span>
 </div>
 </div>
 </div>

 {/* AUDIT LOG TIMELINE */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-5">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Member Activity Timeline</span>
 
 <div className="space-y-5 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-neutral-50">
 <div className="flex gap-4 relative">
 <div className="w-6 h-6 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center z-10 text-[9px] font-bold text-danger">
 4
 </div>
 <div className="space-y-1 text-xs">
 <span className="font-bold text-neutral-800">Renewal Init</span>
 <span className="text-[9px] text-neutral-500 font-mono block">Today • Billing Desk</span>
 </div>
 </div>
 
 <div className="flex gap-4 relative">
 <div className="w-6 h-6 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center z-10 text-[9px] font-bold text-neutral-400">
 3
 </div>
 <div className="space-y-1 text-xs text-neutral-600">
 <span className="font-bold">Active Attendance Access</span>
 <span className="text-[9px] text-neutral-500 font-mono block">2026-06-12 • Main Gate</span>
 </div>
 </div>
 
 <div className="flex gap-4 relative">
 <div className="w-6 h-6 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center z-10 text-[9px] font-bold text-neutral-400">
 2
 </div>
 <div className="space-y-1 text-xs text-neutral-600">
 <span className="font-bold">Outstanding Ledger Added</span>
 <span className="text-[9px] text-neutral-500 font-mono block">2026-06-10 • System Auto</span>
 </div>
 </div>
 </div>
 </div>

 </div>

 </div>
 )}

 </div>
 );
}
