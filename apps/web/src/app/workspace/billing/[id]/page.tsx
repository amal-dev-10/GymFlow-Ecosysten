'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
 ChevronLeft,
 Printer,
 AlertTriangle,
 CreditCard,
} from 'lucide-react';
import { membershipsApi } from '../../../../lib/api';

export default function InvoiceDetailsPage() {
 const router = useRouter();
 const params = useParams();
 const id = params.id as string;

 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [subscription, setSubscription] = useState<any>(null);

 const [showPaymentModal, setShowPaymentModal] = useState(false);
 const [showRefundModal, setShowRefundModal] = useState(false);
 const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card'>('UPI');
 const [paymentAmount, setPaymentAmount] = useState('');
 const [refundAmount, setRefundAmount] = useState('');
 const [refundReason, setRefundReason] = useState('Member Cancelled');

 const [timeline, setTimeline] = useState<any[]>([]);
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 const loadData = async () => {
 try {
 setLoading(true);
 const overview = await membershipsApi.getSubscriptionOverview(id);
 setSubscription(overview.subscription);
 setTimeline(
 (overview.timeline || []).map((log: any) => ({
 type: log.action,
 detail: log.details,
 date: new Date(log.createdAt).toLocaleDateString(),
 user: log.user,
 }))
 );
 } catch (err) {
 console.error(err);
 showToast('Failed to load invoice details', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [id]);

 if (loading) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Loading invoice details...
 </div>
 );
 }

 if (!subscription) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500">
 Invoice not found.
 </div>
 );
 }

 // Real invoice figures derived from the membership ledger + plan pricing.
 const plan = subscription.membershipPlan || {};
 const member = subscription.member || {};
 const basePrice = plan.basePrice || 0;
 const joiningFee = plan.joiningFee || 0;
 const taxRate = plan.taxPercentage || 0;
 const subtotal = basePrice + joiningFee;
 const tax = Math.round((subtotal * taxRate) / 100);
 const total = subtotal + tax;
 const amountPaid = subscription.amountPaid || 0;
 const outstandingBal = subscription.outstandingDues != null
 ? Math.max(0, subscription.outstandingDues)
 : Math.max(0, total - amountPaid);

 const invoiceNumber = `INV-${String(subscription.id).slice(0, 8).toUpperCase()}`;
 const branchName = member.homeGym?.name || '—';

 const deriveStatus = () => {
 if (subscription.status === 'Cancelled') return 'Cancelled';
 if (outstandingBal <= 0 && amountPaid > 0) return 'Paid';
 if (amountPaid > 0) return 'Partially Paid';
 if (new Date(subscription.startDate) < new Date()) return 'Overdue';
 return 'Pending';
 };
 const status = deriveStatus();

 const getStatusBadge = (s: string) => {
 const v = s.toLowerCase();
 if (v === 'paid') return 'bg-success-light text-success border-green-200';
 if (v === 'partially paid' || v === 'pending') return 'bg-warning-light text-amber-700 border-amber-200';
 if (v === 'overdue') return 'bg-danger-light text-danger border-red-200';
 if (v === 'cancelled') return 'bg-neutral-100/40 text-neutral-600 border-neutral-200';
 return 'bg-neutral-100/20 text-neutral-600 border-neutral-200/30';
 };

 // Record a payment against the membership ledger (persists).
 const handleRecordPayment = async (e: React.FormEvent) => {
 e.preventDefault();
 const amt = parseFloat(paymentAmount) || 0;
 if (amt <= 0 || amt > outstandingBal) {
 showToast('Invalid payment amount entered', 'error');
 return;
 }
 try {
 setSaving(true);
 await membershipsApi.updateSubscription(id, {
 amountPaid: amountPaid + amt,
 outstandingDues: Math.max(0, outstandingBal - amt),
 });
 showToast(`Payment of ₹${amt.toLocaleString()} recorded via ${paymentMethod}`);
 setShowPaymentModal(false);
 setPaymentAmount('');
 await loadData();
 } catch (err) {
 console.error(err);
 showToast('Failed to record payment', 'error');
 } finally {
 setSaving(false);
 }
 };

 // Refund reverses part of the collected amount back into the outstanding ledger.
 const handleRefund = async (e: React.FormEvent) => {
 e.preventDefault();
 const amt = parseFloat(refundAmount) || 0;
 if (amt <= 0 || amt > amountPaid) {
 showToast('Invalid refund amount', 'error');
 return;
 }
 try {
 setSaving(true);
 await membershipsApi.updateSubscription(id, {
 amountPaid: Math.max(0, amountPaid - amt),
 outstandingDues: outstandingBal + amt,
 });
 showToast(`Refund of ₹${amt.toLocaleString()} processed. Reason: ${refundReason}`);
 setShowRefundModal(false);
 setRefundAmount('');
 await loadData();
 } catch (err) {
 console.error(err);
 showToast('Failed to process refund', 'error');
 } finally {
 setSaving(false);
 }
 };

 return (
 <div className="min-h-screen bg-white text-neutral-900 p-8 space-y-6 relative overflow-hidden">

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

 {/* HEADER */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-200/80 pb-6">
 <div className="flex items-center gap-3">
 <button
 onClick={() => router.push('/workspace/billing')}
 className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 hover:text-neutral-800 transition"
 >
 <ChevronLeft size={16} />
 </button>
 <div>
 <div className="flex items-center gap-2.5">
 <h1 className="text-xl font-bold text-neutral-900 font-display">
 Invoice {invoiceNumber}
 </h1>
 <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${getStatusBadge(status)}`}>
 {status}
 </span>
 </div>
 <p className="text-xs text-neutral-600 mt-1">
 Member: <strong className="text-neutral-800">{member.firstName} {member.lastName}</strong> • Branch: {branchName}
 </p>
 </div>
 </div>

 <div className="flex flex-wrap gap-2">
 <button
 onClick={() => window.print()}
 className="px-3 py-2 bg-neutral-50 border border-neutral-200 hover:text-neutral-900 text-neutral-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
 <Printer size={13} />
 <span>Print</span>
 </button>
 {outstandingBal > 0 && status !== 'Cancelled' && (
 <button
 onClick={() => setShowPaymentModal(true)}
 className="px-4 py-2 bg-success text-white text-xs font-semibold rounded-xl transition"
 >
 Collect Dues
 </button>
 )}
 {amountPaid > 0 && (
 <button
 onClick={() => setShowRefundModal(true)}
 className="px-3 py-2 bg-danger-light border border-red-200 text-danger hover:bg-danger-light text-xs font-semibold rounded-xl transition"
 >
 Issue Refund
 </button>
 )}
 </div>
 </div>

 {/* CORE WORKSPACE GRID */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

 {/* LEFT/CENTER: INVOICE PREVIEW & DETAILS (Col span 2) */}
 <div className="lg:col-span-2 space-y-6">

 {/* PROFESSIONAL INVOICE PREVIEW SHEET */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-8 space-y-8 print:bg-white print:text-neutral-400 print:p-0 print:border-none print:shadow-none">

 {/* Top Header Row */}
 <div className="flex justify-between items-start">
 <div>
 <span className="text-danger font-display font-black text-xl tracking-wider block">GYMFLOW</span>
 <span className="text-[10px] text-neutral-500 block font-mono uppercase mt-0.5">Billing System</span>
 </div>
 <div className="text-right font-mono text-[10px] text-neutral-600 space-y-0.5">
 <div>Invoice: <strong className="text-neutral-800">{invoiceNumber}</strong></div>
 <div>Date: {new Date(subscription.createdAt || subscription.startDate).toLocaleDateString()}</div>
 <div>Due: {new Date(subscription.startDate).toLocaleDateString()}</div>
 </div>
 </div>

 {/* Billing addresses / columns */}
 <div className="grid grid-cols-2 gap-8 text-xs pt-4 border-t border-neutral-200">
 <div>
 <span className="text-[9px] text-neutral-500 font-mono uppercase block font-semibold">From Gym Location</span>
 <span className="font-semibold text-neutral-800 block mt-1">{branchName}</span>
 {member.homeGym?.address && (
 <p className="text-[11px] text-neutral-600 mt-0.5 leading-relaxed">{member.homeGym.address}</p>
 )}
 </div>
 <div>
 <span className="text-[9px] text-neutral-500 font-mono uppercase block font-semibold">Billed To Member</span>
 <span className="font-semibold text-neutral-800 block mt-1">{member.firstName} {member.lastName}</span>
 <p className="text-[11px] text-neutral-600 mt-0.5 leading-relaxed font-mono">
 Phone: {member.phoneNumber || '—'}<br/>
 ID: {member.id}
 </p>
 </div>
 </div>

 {/* Items Table */}
 <div className="border border-neutral-200/60 rounded-2xl overflow-hidden mt-6">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-neutral-200/80 text-neutral-600 font-mono uppercase text-[9px] bg-neutral-50/20">
 <th className="py-3 px-4">Item Details</th>
 <th className="py-3 px-4">Qty</th>
 <th className="py-3 px-4">Rate</th>
 <th className="py-3 px-4">Tax (GST)</th>
 <th className="py-3 px-4 text-right">Total</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200/30 font-mono">
 <tr className="hover:bg-neutral-50/10">
 <td className="py-4 px-4 font-sans font-semibold text-neutral-800">
 {plan.name || 'Membership Plan'}
 <span className="px-1.5 py-0.5 rounded bg-neutral-100/40 text-[8px] text-neutral-500 border border-neutral-200 ml-2 font-mono">
 {plan.category || 'Membership'}
 </span>
 {joiningFee > 0 && (
 <span className="block text-[10px] text-neutral-500 font-mono mt-1">Incl. joining fee ₹{joiningFee.toLocaleString()}</span>
 )}
 </td>
 <td className="py-4 px-4 text-neutral-700">1</td>
 <td className="py-4 px-4 text-neutral-600">₹{subtotal.toLocaleString()}</td>
 <td className="py-4 px-4 text-neutral-600">{taxRate}% (₹{tax.toLocaleString()})</td>
 <td className="py-4 px-4 text-neutral-800 font-bold text-right">₹{total.toLocaleString()}</td>
 </tr>
 </tbody>
 </table>
 </div>

 {/* Calculations Breakdown */}
 <div className="flex justify-end pt-4 font-mono text-xs">
 <div className="w-64 space-y-2.5">
 <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span className="text-neutral-700">₹{subtotal.toLocaleString()}</span></div>
 <div className="flex justify-between"><span className="text-neutral-500">Taxes (GST {taxRate}%)</span><span className="text-neutral-700">₹{tax.toLocaleString()}</span></div>

 <div className="flex justify-between border-t border-neutral-200 pt-2 text-sm font-bold font-sans">
 <span className="text-neutral-900">Total Payable</span>
 <span className="text-success">₹{total.toLocaleString()}</span>
 </div>

 <div className="flex justify-between text-[11px] text-neutral-500 border-t border-dashed border-neutral-200 pt-2">
 <span>Amount Paid</span>
 <span>₹{amountPaid.toLocaleString()}</span>
 </div>

 <div className={`flex justify-between text-xs font-bold ${outstandingBal > 0 ? 'text-danger' : 'text-neutral-500'}`}>
 <span>Balance Outstanding</span>
 <span>₹{outstandingBal.toLocaleString()}</span>
 </div>
 </div>
 </div>

 {/* Invoice Footer note */}
 <div className="text-[10px] text-neutral-500 border-t border-neutral-200 pt-6 mt-8 font-mono leading-relaxed">
 <strong>Invoice Terms & Conditions</strong><br/>
 All payments are final. Subject to membership agreement guidelines and vacation freeze rules. Outstanding dues must be paid within 5 days of due date to prevent check-in suspension.
 </div>

 </div>

 </div>

 {/* RIGHT COLUMN: PAYMENT SUMMARY & TIMELINE (Col span 1) */}
 <div className="lg:col-span-1 space-y-6 shrink-0">

 {/* PAYMENT SUMMARY WIDGET */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Payment Summary</span>

 <div className="space-y-3.5 text-xs">
 <div className="flex justify-between">
 <span className="text-neutral-600">Total Payable</span>
 <span className="font-semibold text-neutral-800 font-mono">₹{total.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-600">Collected</span>
 <span className="font-semibold text-success font-mono">₹{amountPaid.toLocaleString()}</span>
 </div>
 <div className="flex justify-between border-t border-neutral-200 pt-2">
 <span className="text-neutral-600">Outstanding</span>
 <span className={`font-bold font-mono ${outstandingBal > 0 ? 'text-danger' : 'text-neutral-600'}`}>₹{outstandingBal.toLocaleString()}</span>
 </div>
 </div>

 {outstandingBal > 0 && status !== 'Cancelled' && (
 <button
 onClick={() => setShowPaymentModal(true)}
 className="w-full py-2 bg-success text-white text-[10px] font-semibold rounded-xl transition uppercase"
 >
 Collect Outstanding Dues
 </button>
 )}
 </div>

 {/* CHRONOLOGICAL TIMELINE WIDGET */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-6">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block font-semibold">Invoice Event Timeline</span>

 {timeline.length === 0 ? (
 <div className="p-6 text-center border border-dashed border-neutral-200 rounded-2xl text-[11px] text-neutral-500">
 No audited events recorded for this invoice yet.
 </div>
 ) : (
 <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-neutral-50">
 {timeline.map((log, idx) => (
 <div key={idx} className="flex gap-4 relative">
 <div className="w-6 h-6 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center z-10 text-[9px] font-bold text-danger">
 {timeline.length - idx}
 </div>
 <div className="space-y-1 text-xs">
 <div className="flex items-center gap-3">
 <span className="font-bold text-neutral-800">{log.type}</span>
 <span className="text-[9px] text-neutral-500 font-mono">• {log.date}</span>
 </div>
 <p className="text-neutral-600">{log.detail}</p>
 <span className="text-[9px] text-neutral-500 font-mono block">Operator: {log.user}</span>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 </div>

 </div>

 {/* MODAL: RECORD PAYMENT */}
 {showPaymentModal && (
 <div className="fixed inset-0 bg-neutral-50/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
 <div className="flex items-center gap-3">
 <CreditCard className="w-5 h-5 text-success" />
 <h3 className="text-base font-bold text-neutral-900 font-display">Collect Invoice Dues</h3>
 </div>

 <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Payment Amount (₹)</label>
 <input
 type="number"
 required
 max={outstandingBal}
 placeholder={`Max: ₹${outstandingBal}`}
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-neutral-900 font-mono"
 value={paymentAmount}
 onChange={e => setPaymentAmount(e.target.value)}
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Payment Method</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-neutral-900"
 value={paymentMethod}
 onChange={e => setPaymentMethod(e.target.value as any)}
 >
 <option value="UPI">UPI Transfer</option>
 <option value="Cash">Cash</option>
 <option value="Card">Card Terminal</option>
 </select>
 </div>

 <div className="flex gap-3 justify-end pt-2 border-t border-neutral-200">
 <button
 type="button"
 onClick={() => setShowPaymentModal(false)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 font-semibold rounded-xl"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={saving}
 className="px-4 py-2 bg-success text-white font-semibold rounded-xl"
 >
 {saving ? 'Processing...' : 'Record Payment'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* MODAL: PROCESS REFUND */}
 {showRefundModal && (
 <div className="fixed inset-0 bg-neutral-50/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
 <div className="flex items-center gap-3">
 <AlertTriangle className="w-5 h-5 text-danger" />
 <h3 className="text-base font-bold text-neutral-900 font-display">Process Invoice Refund</h3>
 </div>

 <form onSubmit={handleRefund} className="space-y-4 text-xs">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Refund Amount (₹)</label>
 <input
 type="number"
 required
 max={amountPaid}
 placeholder={`Max refund: ₹${amountPaid}`}
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-neutral-900 font-mono"
 value={refundAmount}
 onChange={e => setRefundAmount(e.target.value)}
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Refund Reason</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-neutral-900"
 value={refundReason}
 onChange={e => setRefundReason(e.target.value)}
 >
 <option value="Member Cancelled">Member Cancelled</option>
 <option value="Billing Mistake">Billing Mistake / Double Charge</option>
 <option value="Policy Exception">Policy Exception</option>
 </select>
 </div>

 <div className="flex gap-3 justify-end pt-2 border-t border-neutral-200">
 <button
 type="button"
 onClick={() => setShowRefundModal(false)}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 font-semibold rounded-xl"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={saving}
 className="px-4 py-2 bg-danger hover:bg-red-600 text-neutral-900 font-semibold rounded-xl"
 >
 {saving ? 'Refunding...' : 'Confirm Refund'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 </div>
 );
}
