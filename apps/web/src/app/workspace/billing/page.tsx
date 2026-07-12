'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
 DollarSign,
 Search,
 FileText,
 PlusCircle
} from 'lucide-react';
import { gymApi, membershipsApi } from '../../../lib/api';
import { Pagination } from '../../../components/ui';

interface Invoice {
 id: string;
 invoiceNumber: string;
 memberId: string;
 memberName: string;
 memberPhone: string;
 category: string;
 total: number;
 amountPaid: number;
 outstanding: number;
 status: 'Pending' | 'Partially Paid' | 'Paid' | 'Cancelled' | 'Overdue';
 dueDate: string;
 createdAt: string;
 branchName: string;
 branchId: string;
}

// Derive a billing invoice from a real member-membership ledger row. There is
// no separate invoice table — each membership purchase IS the invoice, with the
// authoritative amounts living on amountPaid / outstandingDues.
const subscriptionToInvoice = (sub: any): Invoice => {
 const plan = sub.membershipPlan || {};
 const base = (plan.basePrice || 0) + (plan.joiningFee || 0);
 const tax = Math.round(base * ((plan.taxPercentage || 0) / 100));
 const planTotal = base + tax;
 const amountPaid = sub.amountPaid || 0;
 // Prefer the persisted ledger balance; fall back to plan price minus paid.
 const outstanding = sub.outstandingDues != null
 ? Math.max(0, sub.outstandingDues)
 : Math.max(0, planTotal - amountPaid);
 const total = amountPaid + outstanding;

 let status: Invoice['status'];
 const today = new Date();
 const due = new Date(sub.startDate);
 if (sub.status === 'Cancelled') status = 'Cancelled';
 else if (outstanding <= 0 && amountPaid > 0) status = 'Paid';
 else if (amountPaid > 0) status = 'Partially Paid';
 else if (due < today) status = 'Overdue';
 else status = 'Pending';

 return {
 id: sub.id,
 invoiceNumber: `INV-${String(sub.id).slice(0, 8).toUpperCase()}`,
 memberId: sub.memberId,
 memberName: `${sub.member?.firstName || ''} ${sub.member?.lastName || ''}`.trim() || 'Unknown Member',
 memberPhone: sub.member?.phoneNumber || '—',
 category: plan.category || plan.name || 'Membership',
 total,
 amountPaid,
 outstanding,
 status,
 dueDate: sub.startDate,
 createdAt: sub.createdAt || sub.startDate,
 branchName: sub.member?.homeGym?.name || '—',
 branchId: sub.member?.homeGymId || '',
 };
};

export default function InvoicesListingPage() {
 const router = useRouter();

 const [loading, setLoading] = useState(true);
 const [invoices, setInvoices] = useState<Invoice[]>([]);
 const [branches, setBranches] = useState<any[]>([]);
 const [searchQuery, setSearchQuery] = useState('');
 const [statusFilter, setStatusFilter] = useState('all');
 const [branchFilter, setBranchFilter] = useState('all');

 const [page, setPage] = useState(1);
 const pageSize = 10;

 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 const loadData = async () => {
 try {
 setLoading(true);
 const orgId = localStorage.getItem('organizationId') || '';

 const [branchList, subs] = await Promise.all([
 gymApi.list(orgId),
 membershipsApi.listAllSubscriptions(),
 ]);

 setBranches(branchList || []);
 setInvoices((subs || []).map(subscriptionToInvoice));
 } catch (err) {
 console.error(err);
 showToast('Failed to load invoices', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, []);

 const getStatusBadge = (status: string) => {
 const s = status.toLowerCase();
 if (s === 'paid') return 'bg-success-light text-success border-green-200';
 if (s === 'partially paid' || s === 'pending') return 'bg-warning-light text-amber-700 border-amber-200';
 if (s === 'overdue') return 'bg-danger-light text-danger border-red-200';
 if (s === 'cancelled') return 'bg-neutral-100/40 text-neutral-600 border-neutral-200';
 return 'bg-neutral-100/20 text-neutral-600 border-neutral-200/30';
 };

 const filteredInvoices = invoices.filter(inv => {
 const matchesSearch = inv.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
 inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
 inv.memberPhone.includes(searchQuery);
 const matchesStatus = statusFilter === 'all' || inv.status.toLowerCase() === statusFilter.toLowerCase();
 const matchesBranch = branchFilter === 'all' || inv.branchId === branchFilter;
 return matchesSearch && matchesStatus && matchesBranch;
 });

 useEffect(() => {
 setPage(1);
 }, [searchQuery, statusFilter, branchFilter]);

 const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
 const currentPage = Math.min(page, totalPages);
 const pagedInvoices = filteredInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

 // KPIs — all from real ledger data.
 const totalBilled = invoices.reduce((sum, inv) => sum + inv.total, 0);
 const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
 const totalOutstanding = invoices
 .filter(inv => inv.status !== 'Cancelled')
 .reduce((sum, inv) => sum + inv.outstanding, 0);
 const totalOverdue = invoices
 .filter(inv => inv.status === 'Overdue')
 .reduce((sum, inv) => sum + inv.outstanding, 0);

 if (loading) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Fetching invoice directory...
 </div>
 );
 }

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

 {/* PAGE HEADER */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-200/80 pb-6">
 <div>
 <h1 className="text-2xl font-bold text-neutral-900 font-display flex items-center gap-2">
 <DollarSign className="w-6 h-6 text-danger" />
 Billing & Invoices
 </h1>
 <p className="text-xs text-neutral-600 mt-1">Track membership billing, collect outstanding dues, and manage invoices.</p>
 </div>

 <button
 onClick={() => router.push('/workspace/memberships/purchase')}
 className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-neutral-900 text-xs font-semibold rounded-xl transition flex items-center gap-2 shadow-lg"
 >
 <PlusCircle className="w-4 h-4" />
 <span>New Membership Invoice</span>
 </button>
 </div>

 {/* FINANCIAL OVERVIEW WIDGETS */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 font-mono">
 <div className="bg-white border border-neutral-200/60 p-5 rounded-2xl">
 <span className="text-[10px] text-neutral-500 uppercase font-sans">Total Billed</span>
 <span className="text-lg font-bold text-neutral-900 block mt-1">₹{totalBilled.toLocaleString()}</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-5 rounded-2xl">
 <span className="text-[10px] text-neutral-500 uppercase font-sans">Total Collected</span>
 <span className="text-lg font-bold text-success block mt-1">₹{totalPaid.toLocaleString()}</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-5 rounded-2xl">
 <span className="text-[10px] text-neutral-500 uppercase font-sans">Outstanding Dues</span>
 <span className="text-lg font-bold text-amber-700 block mt-1">₹{totalOutstanding.toLocaleString()}</span>
 </div>
 <div className="bg-white border border-neutral-200/60 p-5 rounded-2xl">
 <span className="text-[10px] text-neutral-500 uppercase font-sans">Overdue Balance</span>
 <span className="text-lg font-bold text-danger block mt-1">₹{totalOverdue.toLocaleString()}</span>
 </div>
 </div>

 {/* SEARCH & FILTERS */}
 <div className="bg-white border border-neutral-200/60 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between">
 <div className="flex flex-1 items-center gap-3 min-w-[280px]">
 <div className="relative flex-1">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
 <input
 type="text"
 placeholder="Search by invoice number, member, or phone..."
 className="w-full bg-white border border-neutral-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 />
 </div>
 </div>

 <div className="flex items-center gap-3">
 <select
 className="bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-700 focus:outline-none"
 value={statusFilter}
 onChange={e => setStatusFilter(e.target.value)}
 >
 <option value="all">All Statuses</option>
 <option value="paid">Paid</option>
 <option value="pending">Pending</option>
 <option value="partially paid">Partially Paid</option>
 <option value="overdue">Overdue</option>
 <option value="cancelled">Cancelled</option>
 </select>
 <select
 className="bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-700 focus:outline-none"
 value={branchFilter}
 onChange={e => setBranchFilter(e.target.value)}
 >
 <option value="all">All Branches</option>
 {branches.map(b => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>
 </div>
 </div>

 {/* INVOICES DIRECTORY GRID */}
 {filteredInvoices.length === 0 ? (
 <div className="p-16 text-center max-w-sm mx-auto flex flex-col items-center bg-neutral-50/10 border border-neutral-200/40 rounded-3xl">
 <FileText className="text-neutral-400 mb-4" size={40} />
 <h3 className="text-sm font-bold text-neutral-900">No Invoices Found</h3>
 <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
 There are no invoices matching your search parameters.
 </p>
 </div>
 ) : (
 <div className="border border-neutral-200/60 rounded-3xl overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-neutral-200/80 text-neutral-600 font-mono uppercase text-[9px] bg-neutral-50/20">
 <th className="py-3.5 px-6">Invoice #</th>
 <th className="py-3.5 px-6">Date</th>
 <th className="py-3.5 px-6">Member Details</th>
 <th className="py-3.5 px-6">Plan Category</th>
 <th className="py-3.5 px-6">Due Date</th>
 <th className="py-3.5 px-6">Outstanding</th>
 <th className="py-3.5 px-6">Status</th>
 <th className="py-3.5 px-6">Total Amount</th>
 <th className="py-3.5 px-6 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200/30 font-mono">
 {pagedInvoices.map(inv => (
 <tr key={inv.id} className="hover:bg-neutral-50/10 transition">
 <td className="py-4 px-6 text-neutral-800 font-bold">{inv.invoiceNumber}</td>
 <td className="py-4 px-6 text-neutral-600">{new Date(inv.createdAt).toLocaleDateString()}</td>
 <td className="py-4 px-6 font-sans">
 <span className="font-semibold text-neutral-800 block">{inv.memberName}</span>
 <span className="text-[10px] text-neutral-500 block font-mono">{inv.memberPhone}</span>
 </td>
 <td className="py-4 px-6 font-sans">
 <span className="px-2 py-0.5 rounded bg-neutral-100/40 text-[9px] text-neutral-600 border border-neutral-200">
 {inv.category}
 </span>
 </td>
 <td className="py-4 px-6 text-neutral-600">{new Date(inv.dueDate).toLocaleDateString()}</td>
 <td className={`py-4 px-6 font-bold ${inv.outstanding > 0 ? 'text-danger' : 'text-neutral-500'}`}>
 ₹{inv.outstanding.toLocaleString()}
 </td>
 <td className="py-4 px-6">
 <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${getStatusBadge(inv.status)}`}>
 {inv.status}
 </span>
 </td>
 <td className="py-4 px-6 text-neutral-900 font-bold text-sm">₹{inv.total.toLocaleString()}</td>
 <td className="py-4 px-6 text-right">
 <button
 onClick={() => router.push(`/workspace/billing/${inv.id}`)}
 className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 hover:text-neutral-900 text-neutral-700 text-[10px] font-semibold rounded-xl transition"
 >
 View Details
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 {filteredInvoices.length > pageSize && (
 <Pagination
 page={currentPage}
 totalPages={totalPages}
 onPageChange={setPage}
 totalItems={filteredInvoices.length}
 pageSize={pageSize}
 />
 )}
 </div>
 )}

 </div>
 );
}
