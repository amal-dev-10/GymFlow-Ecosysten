import { useAuthStore } from '../store/auth.store';
import { useWorkspaceStore } from '../store/workspace.store';

// Same backend the web workspace app talks to. Override with EXPO_PUBLIC_API_URL
// when running against a device/tunnel where localhost doesn't resolve to the host machine.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(extractMessage(body) || `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }
}

function extractMessage(body: any): string | undefined {
  if (!body) return undefined;
  if (Array.isArray(body.message)) return body.message.join(', ');
  return body.message;
}

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new Error('refresh failed');
    const data = await res.json();
    useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    useAuthStore.getState().logout();
    return null;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  skipAuth?: boolean;
}

export async function apiRequest<T = any>(path: string, options: RequestOptions = {}, _retried = false, retryCount = 0): Promise<T> {
  const { method = 'GET', body, skipAuth = false } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (!skipAuth) {
    const token = useAuthStore.getState().token;
    if (token) headers.Authorization = `Bearer ${token}`;
    // Tenant-scoped endpoints require the active gym's organization context
    // (see TenantGuard on the backend) — mirrors the web app's convention.
    const organizationId = useWorkspaceStore.getState().activeOrganizationId;
    if (organizationId) headers['x-organization-id'] = organizationId;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 401 && !skipAuth && !_retried) {
      // Coalesce concurrent 401s into a single refresh call
      refreshPromise = refreshPromise || doRefresh();
      const newToken = await refreshPromise;
      refreshPromise = null;
      if (newToken) {
        return apiRequest<T>(path, options, true, retryCount);
      }
    }

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json().catch(() => null) : await res.text();

    if (!res.ok) {
      throw new ApiError(res.status, data);
    }
    return data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    // Retry transient network drops for safe read (GET) requests
    if (method === 'GET' && retryCount < 2) {
      return apiRequest<T>(path, options, _retried, retryCount + 1);
    }
    throw err;
  }
}

export const authApi = {
  sendOtp: (phoneNumber: string, mode?: 'signup' | 'login') =>
    apiRequest('/v1/auth/otp/send', { method: 'POST', body: { phoneNumber, mode }, skipAuth: true }),

  verifyOtp: (phoneNumber: string, otp: string, fullName?: string, mode?: 'signup' | 'login') =>
    apiRequest<{ accessToken: string; refreshToken: string; user: any }>('/v1/auth/otp/verify', {
      method: 'POST',
      body: { phoneNumber, otp, fullName, mode },
      skipAuth: true,
    }),

  getMe: () => apiRequest<{ user: any }>('/v1/auth/me'),

  updateProfile: (payload: { fullName: string; email: string }) =>
    apiRequest('/v1/auth/profile', { method: 'PUT', body: payload }),
};

export interface OrganizationSummaryDto {
  id: string;
  name: string;
  myRole: string | null;
  gyms: { id: string; name: string; address?: string | null }[];
}

export const orgApi = {
  // Doesn't need x-organization-id — this is how the client discovers which
  // organizations/gyms the signed-in user is allowed to pick from.
  list: () => apiRequest<OrganizationSummaryDto[]>('/v1/organizations'),
};

export const attendanceApi = {
  getStats: (gymId: string) =>
    apiRequest<{ activeInside: number; totalCheckInsToday: number; totalDenied: number }>(
      `/v1/attendance/stats?gymId=${encodeURIComponent(gymId)}`
    ),
  listActive: (gymId: string) =>
    apiRequest<any[]>(`/v1/attendance/active?gymId=${encodeURIComponent(gymId)}`),
  listLogs: (gymId: string) =>
    apiRequest<any[]>(`/v1/attendance/logs?gymId=${encodeURIComponent(gymId)}`),
  getAnalytics: (gymId?: string) =>
    apiRequest<any>(`/v1/attendance/analytics${gymId ? `?gymId=${encodeURIComponent(gymId)}` : ''}`),
};

export const membershipsApi = {
  listAllSubscriptions: () => apiRequest<any[]>('/v1/memberships/all-subscriptions'),
  getExpiring: (gymId: string, days = 7) =>
    apiRequest<any[]>(`/v1/memberships/subscriptions/expiring?gymId=${encodeURIComponent(gymId)}&days=${days}`),
  listPurchased: (memberId: string) => apiRequest<any[]>(`/v1/memberships/purchases/${encodeURIComponent(memberId)}`),
  getSubscription: (id: string) => apiRequest<any>(`/v1/memberships/purchases/detail/${encodeURIComponent(id)}`),
  purchaseMembership: (payload: any) =>
    apiRequest<any>('/v1/memberships/purchases', { method: 'POST', body: payload }),
  updateSubscription: (id: string, payload: any) =>
    apiRequest<any>(`/v1/memberships/purchases/detail/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload }),
  listFreezes: () => apiRequest<any[]>('/v1/memberships/freeze'),
  requestFreeze: (payload: any) => apiRequest<any>('/v1/memberships/freeze', { method: 'POST', body: payload }),
  reactivateEarly: (id: string) => apiRequest<any>(`/v1/memberships/freeze/${encodeURIComponent(id)}/reactivate`, { method: 'POST' }),
  listPlans: () => apiRequest<any[]>('/v1/memberships/plans'),
};

export interface MemberDto {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string | null;
  dob?: string | null;
  gender?: string | null;
  aiInsights?: any;
  phoneVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
  homeGym?: { id: string; name: string } | null;
  homeGymId: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  } | null;
  medicalInfo?: {
    bloodGroup?: string;
    conditions?: string;
    allergies?: string;
  } | null;
  notes?: string | null;
  assignedTrainer?: { id: string; name: string } | null;
  activeMembership?: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    amountPaid: number;
    outstandingDues: number;
    membershipPlan?: { name: string } | null;
  } | null;
  memberMemberships?: any[];
  memberMeasurements?: any[];
  memberDocuments?: any[];
  attendances?: any[];
  linkedAccountsCount?: number;
  isInsideGym?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export const membersApi = {
  list: (homeGymId: string, search?: string, page = 1, limit = 20, filters?: Record<string, string>) => {
    const params = new URLSearchParams({ homeGymId, page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    }
    return apiRequest<PaginatedResponse<MemberDto>>(`/v1/members?${params.toString()}`);
  },
  /** Flat list fallback — the backend may not support pagination yet. */
  listFlat: (homeGymId: string, search?: string, filters?: Record<string, string>) => {
    const params = new URLSearchParams({ homeGymId });
    if (search) params.set('search', search);
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    }
    return apiRequest<MemberDto[]>(`/v1/members?${params.toString()}`);
  },
  getById: (id: string) => apiRequest<MemberDto>(`/v1/members/${id}`),
  create: (payload: {
    homeGymId: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email?: string;
    dob?: string;
    gender?: string;
    address?: MemberDto['address'];
    emergencyContact?: MemberDto['emergencyContact'];
    medicalInfo?: MemberDto['medicalInfo'];
    notes?: string;
    aiInsights?: any;
  }) => apiRequest<MemberDto>('/v1/members', { method: 'POST', body: payload }),
  update: (id: string, payload: any) =>
    apiRequest<MemberDto>(`/v1/members/${id}`, { method: 'PATCH', body: payload }),
  deactivate: (id: string) =>
    apiRequest<void>(`/v1/members/${id}/deactivate`, { method: 'POST' }),
  generateQr: (id: string) =>
    apiRequest<{ qrToken: string; expiresAt: string; generatedAt: string }>(`/v1/members/${id}/qr`),
  timeline: (id: string) =>
    apiRequest<TimelineEvent[]>(`/v1/members/${id}/timeline`),
  checkIn: (id: string, gymId: string) =>
    apiRequest<any>('/v1/attendance/check-in', { method: 'POST', body: { memberId: id, gymId } }),
  checkOut: (id: string, gymId: string) =>
    apiRequest<any>('/v1/attendance/check-out', { method: 'POST', body: { memberId: id, gymId } }),
  /** Look up whether a phone number belongs to a global profile across all gyms. */
  lookupGlobal: (phoneNumber: string) =>
    apiRequest<any | null>(`/v1/members/lookup/global?phoneNumber=${encodeURIComponent(phoneNumber)}`),
  /** Send OTP to verify a member's phone — public endpoint, no auth header needed. */
  sendPhoneOtp: (phoneNumber: string) =>
    apiRequest<{ sent: boolean; expiresIn: number; devOtp?: string }>(
      '/v1/public/members/phone/send-otp',
      { method: 'POST', body: { phoneNumber }, skipAuth: true }
    ),
  /** Verify OTP sent to a member's phone — public endpoint. */
  verifyPhoneOtp: (phoneNumber: string, code: string) =>
    apiRequest<{ verified: boolean }>(
      '/v1/public/members/phone/verify-otp',
      { method: 'POST', body: { phoneNumber, code }, skipAuth: true }
    ),
  /** Record a physical measurement snapshot for a member. */
  addMeasurement: (id: string, payload: { height?: number; weight?: number; bodyFatPercentage?: number }) =>
    apiRequest<any>(`/v1/members/${id}/measurements`, { method: 'POST', body: payload }),
};

export const gymApi = {
  list: (organizationId: string) =>
    apiRequest<any[]>(`/v1/gyms?organizationId=${encodeURIComponent(organizationId)}`),
};

export const rolesApi = {
  getEmployees: () => apiRequest<any[]>('/v1/roles/employees'),
};

export const leadsApi = {
  list: (gymId: string) => apiRequest<any[]>(`/v1/leads?gymId=${encodeURIComponent(gymId)}`),
};

/**
 * Derives real billing KPIs from membership subscription data.
 * Since there is no dedicated billing API, this uses listAllSubscriptions
 * as the source of truth for payment amounts and outstanding dues.
 */
export async function getDashboardBillingStats(gymId: string) {
  const allSubs: any[] = await membershipsApi.listAllSubscriptions();
  const gymSubs = gymId ? allSubs.filter((s: any) => s.member?.homeGymId === gymId || s.gymId === gymId) : allSubs;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  let todaysCollections = 0;
  let pendingDues = 0;
  let overduePayments = 0;
  const upcomingRenewalsSet = new Set<string>();

  for (const sub of gymSubs) {
    const outstanding = Number(sub.outstandingDues) || 0;
    const paid = Number(sub.amountPaid) || 0;
    const endDate = sub.endDate ? new Date(sub.endDate) : null;
    const createdAt = sub.createdAt ? sub.createdAt.split('T')[0] : null;

    // Collections today: subscriptions created today
    if (createdAt === todayStr) {
      todaysCollections += paid;
    }
    // Pending dues across all active subs
    if (outstanding > 0) {
      if (endDate && endDate < today) {
        overduePayments += outstanding;
      } else {
        pendingDues += outstanding;
      }
    }
    // Upcoming renewals: subs ending within 7 days
    if (endDate) {
      const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / 86400000);
      if (daysLeft >= 0 && daysLeft <= 7) {
        upcomingRenewalsSet.add(sub.id);
      }
    }
  }

  return {
    todaysCollections,
    pendingDues,
    overduePayments,
    upcomingRenewals: upcomingRenewalsSet.size,
  };
}

// --- Billing Mock API ---
export interface TransactionDto {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  method: 'Cash' | 'UPI' | 'Credit Card' | 'Debit Card' | 'Bank Transfer' | 'Wallet';
  type: 'Membership Payment' | 'Membership Renewal' | 'Personal Training' | 'Product Sale' | 'Registration Fee' | 'Joining Fee' | 'Locker Fee' | 'Miscellaneous';
  date: string;
  status: 'Completed' | 'Pending' | 'Failed' | 'Refunded';
  invoiceId?: string;
  receiptId?: string;
  collectedBy: string;
}

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  memberId: string;
  memberName: string;
  amount: number;
  discount: number;
  tax: number;
  total: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  dueDate: string;
  createdAt: string;
  items: { description: string; amount: number }[];
}

const dummyTransactions: TransactionDto[] = [
  { id: 'txn-1', memberId: 'm-1', memberName: 'John Doe', amount: 5000, method: 'UPI', type: 'Membership Renewal', date: new Date().toISOString(), status: 'Completed', invoiceId: 'inv-1', receiptId: 'rcpt-1', collectedBy: 'Admin' },
  { id: 'txn-2', memberId: 'm-2', memberName: 'Jane Smith', amount: 1500, method: 'Cash', type: 'Personal Training', date: new Date(Date.now() - 86400000).toISOString(), status: 'Completed', invoiceId: 'inv-2', receiptId: 'rcpt-2', collectedBy: 'Admin' }
];

const dummyInvoices: InvoiceDto[] = [
  { id: 'inv-1', invoiceNumber: 'INV-2026-001', memberId: 'm-1', memberName: 'John Doe', amount: 5000, discount: 0, tax: 0, total: 5000, status: 'Paid', dueDate: new Date().toISOString(), createdAt: new Date().toISOString(), items: [{ description: 'Annual Membership', amount: 5000 }] },
  { id: 'inv-2', invoiceNumber: 'INV-2026-002', memberId: 'm-2', memberName: 'Jane Smith', amount: 1500, discount: 0, tax: 0, total: 1500, status: 'Paid', dueDate: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString(), items: [{ description: '10 PT Sessions', amount: 1500 }] },
  { id: 'inv-3', invoiceNumber: 'INV-2026-003', memberId: 'm-3', memberName: 'Bob Brown', amount: 3000, discount: 0, tax: 0, total: 3000, status: 'Overdue', dueDate: new Date(Date.now() - 5 * 86400000).toISOString(), createdAt: new Date(Date.now() - 10 * 86400000).toISOString(), items: [{ description: 'Semi-Annual Membership', amount: 3000 }] }
];

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const billingApi = {
  getDashboardStats: async (gymId: string) => {
    await delay(500);
    return { todaysCollections: 5000, pendingDues: 14500, overduePayments: 3000, upcomingRenewals: 8 };
  },
  listTransactions: async (gymId: string) => {
    await delay(500);
    return dummyTransactions;
  },
  listPendingDues: async (gymId: string) => {
    await delay(500);
    return dummyInvoices.filter(i => i.status !== 'Paid');
  },
  listInvoices: async (gymId: string) => {
    await delay(500);
    return dummyInvoices;
  },
  getInvoice: async (id: string) => {
    await delay(300);
    const inv = dummyInvoices.find(i => i.id === id);
    if (!inv) throw new ApiError(404, { message: 'Invoice not found' });
    return inv;
  },
  getReceipt: async (id: string) => {
    await delay(300);
    return { id, receiptNumber: `RCPT-${id.split('-')[1]}`, transaction: dummyTransactions.find(t => t.receiptId === id) || dummyTransactions[0] };
  },
  collectPayment: async (payload: any) => {
    await delay(800);
    const txn: TransactionDto = {
      id: `txn-${Date.now()}`,
      memberId: payload.memberId,
      memberName: payload.memberName || 'Unknown Member',
      amount: payload.amount,
      method: payload.method,
      type: payload.type,
      date: new Date().toISOString(),
      status: 'Completed',
      invoiceId: `inv-${Date.now()}`,
      receiptId: `rcpt-${Date.now()}`,
      collectedBy: 'Current User'
    };
    dummyTransactions.unshift(txn);
    return txn;
  }
};

