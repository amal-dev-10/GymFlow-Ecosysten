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
  // GET /v1/organizations spreads the full org record, so these are present too.
  slug?: string;
  logoUrl?: string | null;
  businessType?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  currency?: string | null;
  timezone?: string | null;
  dateFormat?: string | null;
  language?: string | null;
  description?: string | null;
  allowMemberSelfRegistration?: boolean | null;
  enableMultiBranchOperations?: boolean | null;
  enableAttendanceTracking?: boolean | null;
  enableWorkoutManagement?: boolean | null;
  enableDietManagement?: boolean | null;
  enablePersonalTraining?: boolean | null;
}

export type UpdateOrganizationPayload = Partial<Omit<CreateOrganizationPayload, 'slug'>> & {
  description?: string;
  allowMemberSelfRegistration?: boolean;
  enableMultiBranchOperations?: boolean;
  enableAttendanceTracking?: boolean;
  enableWorkoutManagement?: boolean;
  enableDietManagement?: boolean;
  enablePersonalTraining?: boolean;
};

export interface CreateOrganizationPayload {
  name: string;
  slug: string;
  logoUrl?: string;
  businessType?: string;
  phone?: string;
  email?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  currency?: string;
  timezone?: string;
  dateFormat?: string;
  language?: string;
}

export const orgApi = {
  // Doesn't need x-organization-id — this is how the client discovers which
  // organizations/gyms the signed-in user is allowed to pick from.
  list: () => apiRequest<OrganizationSummaryDto[]>('/v1/organizations'),
  // Creates the org, links the caller as Organization Owner, and assigns the
  // default subscription plan (backend handles all three in one transaction).
  create: (payload: CreateOrganizationPayload) =>
    apiRequest<{ id: string; name: string; slug: string }>('/v1/organizations', { method: 'POST', body: payload }),
  update: (id: string, payload: UpdateOrganizationPayload) =>
    apiRequest<OrganizationSummaryDto>(`/v1/organizations/${encodeURIComponent(id)}`, { method: 'PUT', body: payload }),
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
  checkIn: (payload: { memberId?: string; gymId: string; method: string; memberName?: string; token?: string }) =>
    apiRequest<any>('/v1/attendance/check-in', { method: 'POST', body: payload }),
  checkOut: (id: string) =>
    apiRequest<any>(`/v1/attendance/check-out/${encodeURIComponent(id)}`, { method: 'POST' }),
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
  createPlan: (payload: any) =>
    apiRequest<any>('/v1/memberships/plans', { method: 'POST', body: payload }),
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
  checkIn: (id: string, gymId: string, payload?: { method?: string; memberName?: string }) =>
    apiRequest<any>('/v1/attendance/check-in', {
      method: 'POST',
      body: { memberId: id, gymId, method: payload?.method || 'FRONT_DESK', memberName: payload?.memberName },
    }),
  checkOut: (attendanceId: string) =>
    apiRequest<any>(`/v1/attendance/check-out/${attendanceId}`, { method: 'POST' }),
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
  create: (payload: {
    organizationId: string;
    name: string;
    address?: string;
    contactPhone?: string;
    contactEmail?: string;
    latitude?: number;
    longitude?: number;
  }) => apiRequest<{ id: string; name: string }>('/v1/gyms', { method: 'POST', body: payload }),
};

export interface StaffDto {
  id: string;
  name: string;
  phone: string;
  /** Names of the gyms this staff member is assigned to. */
  gyms: string[];
  roleId: string;
  roleName: string;
  /** Primary role + any additional roles, flattened to names. */
  roleNames: string[];
  status: 'active' | 'inactive';
  /** ISO date (yyyy-mm-dd) the employee record was created. */
  assignedDate: string;
}

export const rolesApi = {
  getEmployees: () => apiRequest<StaffDto[]>('/v1/roles/employees'),
  list: () => apiRequest<any[]>('/v1/roles'),
};

export const orgUsersApi = {
  getStats: () => apiRequest<any>('/v1/organizations/users/stats'),
  list: () => apiRequest<any[]>('/v1/organizations/users'),
  getDetails: (userId: string) => apiRequest<any>(`/v1/organizations/users/${encodeURIComponent(userId)}/details`),
  changeRole: (userId: string, roleId: string, roleIds?: string[]) =>
    apiRequest<any>(`/v1/organizations/users/${encodeURIComponent(userId)}/role`, { method: 'PUT', body: { roleId, roleIds } }),
  assignGyms: (userId: string, gymIds: string[]) =>
    apiRequest<any>(`/v1/organizations/users/${encodeURIComponent(userId)}/gyms`, { method: 'PUT', body: { gymIds } }),
  toggleStatus: (userId: string, isActive: boolean) =>
    apiRequest<any>(`/v1/organizations/users/${encodeURIComponent(userId)}/status`, { method: 'PUT', body: { isActive } }),
  removeUser: (userId: string) =>
    apiRequest<any>(`/v1/organizations/users/${encodeURIComponent(userId)}`, { method: 'DELETE' }),
  bulkUpdate: (payload: { userIds: string[]; roleId?: string; roleIds?: string[]; gymIds?: string[] }) =>
    apiRequest<any>('/v1/organizations/users/bulk', { method: 'POST', body: payload }),
  
  getInvitations: () => apiRequest<any[]>('/v1/organizations/invitations'),
  inviteUser: (payload: { phoneNumber: string; roleId?: string; roleIds?: string[]; email?: string; fullName?: string; gymIds?: string[]; message?: string }) =>
    apiRequest<any>('/v1/organizations/invitations', { method: 'POST', body: payload }),
  resendInvitation: (id: string) => apiRequest<any>(`/v1/organizations/invitations/${encodeURIComponent(id)}/resend`, { method: 'POST' }),
  deleteInvitation: (id: string) => apiRequest<any>(`/v1/organizations/invitations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
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

// ---------------------------------------------------------------------------
// Billing — derived entirely from real membership data.
//
// There is no separate billing/invoice/payment table on the backend: each
// MemberMembership purchase IS the invoice, with the authoritative amounts
// living on `amountPaid` / `outstandingDues`. Collecting a due payment (or
// issuing a refund) simply PATCHes those two fields on the subscription — this
// mirrors exactly what the web workspace app does (apps/web billing pages).
// ---------------------------------------------------------------------------
export interface TransactionDto {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  method: 'Cash' | 'UPI' | 'Credit Card' | 'Debit Card' | 'Bank Transfer' | 'Wallet' | 'Other';
  type: 'Membership Payment' | 'Membership Renewal' | 'Personal Training' | 'Product Sale' | 'Registration Fee' | 'Joining Fee' | 'Locker Fee' | 'Miscellaneous';
  date: string;
  status: 'Completed' | 'Pending' | 'Failed' | 'Refunded';
  invoiceId?: string;
  receiptId?: string;
  collectedBy: string;
}

export type InvoiceStatus = 'Paid' | 'Partially Paid' | 'Pending' | 'Overdue' | 'Cancelled';

export interface InvoiceDto {
  /** Subscription (MemberMembership) id — invoices have no separate identity. */
  id: string;
  invoiceNumber: string;
  memberId: string;
  memberName: string;
  memberPhone?: string;
  category?: string;
  amount: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  outstanding: number;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
  items: { description: string; amount: number }[];
}

/** Belongs to `gymId` if the member's home gym matches (or no filter given). */
function subscriptionInGym(sub: any, gymId?: string): boolean {
  if (!gymId || gymId === 'all') return true;
  return sub.member?.homeGymId === gymId || sub.gymId === gymId;
}

/**
 * Derive a billing invoice from a real member-membership ledger row.
 * Kept identical in spirit to apps/web's subscriptionToInvoice so the two
 * clients agree on totals and statuses.
 */
export function subscriptionToInvoice(sub: any): InvoiceDto {
  const plan = sub.membershipPlan || {};
  const base = (plan.basePrice || 0) + (plan.joiningFee || 0);
  const tax = Math.round(base * ((plan.taxPercentage || 0) / 100));
  const planTotal = base + tax;
  const amountPaid = Number(sub.amountPaid) || 0;
  const outstanding = sub.outstandingDues != null
    ? Math.max(0, Number(sub.outstandingDues))
    : Math.max(0, planTotal - amountPaid);
  const total = amountPaid + outstanding;

  let status: InvoiceStatus;
  const today = new Date();
  const due = new Date(sub.startDate);
  if (sub.status === 'Cancelled') status = 'Cancelled';
  else if (outstanding <= 0 && amountPaid > 0) status = 'Paid';
  else if (amountPaid > 0) status = 'Partially Paid';
  else if (due < today) status = 'Overdue';
  else status = 'Pending';

  const items = [{ description: plan.name || 'Membership', amount: base }];
  if (tax > 0) items.push({ description: `Tax (${plan.taxPercentage}%)`, amount: tax });

  return {
    id: sub.id,
    invoiceNumber: `INV-${String(sub.id).slice(0, 8).toUpperCase()}`,
    memberId: sub.memberId,
    memberName: `${sub.member?.firstName || ''} ${sub.member?.lastName || ''}`.trim() || 'Unknown Member',
    memberPhone: sub.member?.phoneNumber || undefined,
    category: plan.category || plan.name || 'Membership',
    amount: base,
    discount: 0,
    tax,
    total,
    amountPaid,
    outstanding,
    status,
    dueDate: sub.startDate,
    createdAt: sub.createdAt || sub.startDate,
    items,
  };
}

/** Each subscription with money collected reads as one completed transaction. */
function subscriptionToTransaction(sub: any): TransactionDto {
  const inv = subscriptionToInvoice(sub);
  return {
    id: sub.id,
    memberId: sub.memberId,
    memberName: inv.memberName,
    amount: inv.amountPaid,
    // The ledger stores a running amount, not per-payment methods.
    method: 'Other',
    type: 'Membership Payment',
    date: sub.createdAt || sub.startDate,
    status: 'Completed',
    invoiceId: sub.id,
    receiptId: sub.id,
    collectedBy: '—',
  };
}

export const billingApi = {
  getDashboardStats: (gymId: string) => getDashboardBillingStats(gymId),

  listInvoices: async (gymId: string): Promise<InvoiceDto[]> => {
    const subs = await membershipsApi.listAllSubscriptions();
    return subs
      .filter((s) => subscriptionInGym(s, gymId))
      .map(subscriptionToInvoice)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  listPendingDues: async (gymId: string): Promise<InvoiceDto[]> => {
    const all = await billingApi.listInvoices(gymId);
    return all.filter((i) => i.outstanding > 0 && i.status !== 'Cancelled');
  },

  listTransactions: async (gymId: string): Promise<TransactionDto[]> => {
    const subs = await membershipsApi.listAllSubscriptions();
    return subs
      .filter((s) => subscriptionInGym(s, gymId) && (Number(s.amountPaid) || 0) > 0)
      .map(subscriptionToTransaction)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getInvoice: async (id: string): Promise<InvoiceDto> => {
    const sub = await membershipsApi.getSubscription(id);
    if (!sub) throw new ApiError(404, { message: 'Invoice not found' });
    return subscriptionToInvoice(sub);
  },

  getReceipt: async (id: string) => {
    const sub = await membershipsApi.getSubscription(id);
    if (!sub) throw new ApiError(404, { message: 'Receipt not found' });
    return {
      id,
      receiptNumber: `RCPT-${String(id).slice(0, 8).toUpperCase()}`,
      transaction: subscriptionToTransaction(sub),
    };
  },

  /**
   * Collect a due payment against a subscription. Persists to the ledger by
   * moving `amount` from outstandingDues into amountPaid — same operation the
   * web billing detail page performs.
   */
  collectPayment: async (payload: {
    invoiceId: string;
    amount: number;
    method?: string;
    memberName?: string;
    type?: string;
  }): Promise<TransactionDto> => {
    const { invoiceId, amount } = payload;
    if (!invoiceId) throw new ApiError(400, { message: 'A subscription/invoice is required to collect a payment.' });

    const sub = await membershipsApi.getSubscription(invoiceId);
    if (!sub) throw new ApiError(404, { message: 'Invoice not found' });

    const currentPaid = Number(sub.amountPaid) || 0;
    const currentOutstanding = Number(sub.outstandingDues) || 0;

    await membershipsApi.updateSubscription(invoiceId, {
      amountPaid: currentPaid + amount,
      outstandingDues: Math.max(0, currentOutstanding - amount),
    });

    const name = payload.memberName
      || `${sub.member?.firstName || ''} ${sub.member?.lastName || ''}`.trim()
      || 'Member';

    return {
      id: `txn-${Date.now()}`,
      memberId: sub.memberId,
      memberName: name,
      amount,
      method: (payload.method as TransactionDto['method']) || 'Cash',
      type: (payload.type as TransactionDto['type']) || 'Membership Payment',
      date: new Date().toISOString(),
      status: 'Completed',
      invoiceId,
      receiptId: invoiceId,
      collectedBy: 'You',
    };
  },
};


// ---------------------------------------------------------------------------
// Support — tenant-facing helpdesk (mirrors the platform admin Support Center,
// scoped to the active organization by the backend). See apps/api support module.
// ---------------------------------------------------------------------------
export type SupportTicketStatus =
  | 'OPEN' | 'NEW' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'ESCALATED'
  | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
export type SupportTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface SupportTicketSummary {
  id: string;
  ticketNumber: number;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string | null;
}

export interface SupportMessage {
  id: string;
  authorType: 'Customer' | 'Agent' | 'System';
  authorName: string;
  body: string;
  createdAt: string;
}

export interface SupportTicketDetail extends SupportTicketSummary {
  description?: string | null;
  createdByName?: string;
  resolvedAt?: string | null;
  satisfactionScore?: number | null;
  messages: SupportMessage[];
}

export const supportApi = {
  listTickets: (status?: 'open' | 'closed') =>
    apiRequest<SupportTicketSummary[]>(`/v1/support/tickets${status ? `?status=${status}` : ''}`),
  getTicket: (id: string) => apiRequest<SupportTicketDetail>(`/v1/support/tickets/${encodeURIComponent(id)}`),
  createTicket: (payload: { subject: string; description?: string; priority?: string; category?: string }) =>
    apiRequest<SupportTicketDetail>('/v1/support/tickets', { method: 'POST', body: payload }),
  postMessage: (id: string, body: string) =>
    apiRequest<SupportTicketDetail>(`/v1/support/tickets/${encodeURIComponent(id)}/messages`, { method: 'POST', body: { body } }),
  recordCsat: (id: string, score: number, comment?: string) =>
    apiRequest<SupportTicketDetail>(`/v1/support/tickets/${encodeURIComponent(id)}/csat`, { method: 'POST', body: { score, comment } }),
};

// ---------------------------------------------------------------------------
// Subscription — the organization's OWN plan with the GymFlow platform (not to
// be confused with member memberships). Read-only status here; upgrade/checkout
// (Razorpay) is a separate flow. See apps/api subscriptions module.
// ---------------------------------------------------------------------------
export interface OrgSubscriptionResourceLimit {
  resourceKey: string;
  limitType: string; // 'LIMITED' | 'UNLIMITED' | ...
  limitValue: number | null;
  warningThresholdValue?: number | null;
  resource?: { key: string; label: string; unit?: string | null; category?: string };
}
export interface OrgSubscriptionFeatureAccess {
  featureKey: string;
  state: string; // 'ENABLED' | 'DISABLED' | ...
  feature?: { key: string; label: string; category?: string };
}
export interface OrgSubscription {
  id: string;
  status: string; // Active, Trialing, Past_Due, Grace_Period, Expired, ...
  startDate: string;
  endDate: string;
  trialStartDate?: string | null;
  trialEndDate?: string | null;
  autoRenew: boolean;
  paymentMethod?: string | null;
  isEnterpriseCustom?: boolean;
  customPrice?: number | null;
  plan: {
    id: string;
    name: string;
    description?: string | null;
    badge?: string | null;
    price: number;
    currency: string;
    billingCycle: string; // FREE | MONTHLY | QUARTERLY | HALF_YEARLY | YEARLY | ENTERPRISE
    trialDays: number;
    resourceLimits?: OrgSubscriptionResourceLimit[];
    featureAccess?: OrgSubscriptionFeatureAccess[];
  };
  usages?: Array<{ featureName: string; currentValue: number }>;
}

export interface SubscriptionPaymentDto {
  id: string;
  amount: number;
  status: string; // Success, Failed, Refunded, ...
  paymentMethod: string;
  transactionId?: string | null;
  createdAt: string;
}
export interface SubscriptionInvoiceDto {
  id: string;
  amount: number;
  status: string; // Paid, Unpaid, Void, Pending, Partially Paid, Refunded (Overdue derived)
  description?: string | null;
  dueDate: string;
  paidAt?: string | null;
  createdAt: string;
  taxAmount?: number | null;
  subscription?: { plan?: { name?: string; currency?: string } | null } | null;
  payments?: SubscriptionPaymentDto[];
}

export interface SubscriptionPlanDto {
  id: string;
  name: string;
  description?: string | null;
  badge?: string | null;
  price: number;
  currency: string;
  billingCycle: string;
  trialDays: number;
  displayOrder?: number;
  resourceLimits?: OrgSubscriptionResourceLimit[];
  featureAccess?: OrgSubscriptionFeatureAccess[];
}

export const subscriptionApi = {
  getActive: () => apiRequest<OrgSubscription>('/v1/subscriptions/active'),
  getPlans: () => apiRequest<SubscriptionPlanDto[]>('/v1/subscriptions/plans'),
  getInvoices: () => apiRequest<SubscriptionInvoiceDto[]>('/v1/subscriptions/invoices'),
  // Activates a FREE plan immediately. Paid plans require the checkout/Razorpay
  // flow (not available in-app) and return 400 here.
  subscribe: (planId: string) =>
    apiRequest<any>('/v1/subscriptions/subscribe', { method: 'POST', body: { planId } }),
};

export interface MobileAppsSettingsDto {
  androidLatestVersion: string;
  iosLatestVersion: string;
  minimumSupportedVersion: string;
  forceUpdate: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  playStoreUrl: string;
  appStoreUrl: string;
  releaseNotes: string;
}

export const platformPublicApi = {
  getMobileVersionCheck: () =>
    apiRequest<MobileAppsSettingsDto>('/v1/platform/settings-public/mobile-version-check', { skipAuth: true }),
};

// ---------------------------------------------------------------------------
// Announcements — tenant read side of platform notifications (GymFlow → org).
// See apps/api announcements module (org-scoped by the backend).
// ---------------------------------------------------------------------------
export interface AnnouncementDto {
  id: string;
  title: string;
  body: string;
  priority: string; // Low | Normal | High | Critical
  channel: string;
  notificationType: string;
  createdAt: string;
  sentAt?: string | null;
  readAt?: string | null;
  read: boolean;
}

export const announcementsApi = {
  list: () => apiRequest<AnnouncementDto[]>('/v1/announcements'),
  unreadCount: () => apiRequest<{ count: number }>('/v1/announcements/unread-count'),
  markRead: (id: string) => apiRequest<{ ok: boolean }>(`/v1/announcements/${encodeURIComponent(id)}/read`, { method: 'POST' }),
  markAllRead: () => apiRequest<{ updated: number }>('/v1/announcements/read-all', { method: 'POST' }),
};

// ---------------------------------------------------------------------------
// Exercises — the real Training Studio library (/v1/exercises). Powers the
// mobile exercise browser and the member workout builder's exercise picker.
// ---------------------------------------------------------------------------
export interface ExerciseDto {
  id: string;
  name: string;
  description?: string | null;
  primaryMuscle: string;
  secondaryMuscles?: string[];
  equipment: string;
  difficulty: string;
  category: string;
  movementPattern?: string | null;
  source: string;
  gifUrl?: string | null;
  videoUrl?: string | null;
  instructions?: string[];
  safetyTips?: string[];
  trainerNotes?: string | null;
  caloriesBurned?: number | null;
  isFavorite?: boolean;
}

export interface ExerciseListResponse {
  items: ExerciseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const exercisesApi = {
  list: (params: { search?: string; category?: string; page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.category && params.category !== 'all') qs.set('category', params.category);
    qs.set('page', String(params.page || 1));
    qs.set('limit', String(params.limit || 20));
    return apiRequest<ExerciseListResponse>(`/v1/exercises?${qs.toString()}`);
  },
  get: (id: string) => apiRequest<ExerciseDto>(`/v1/exercises/${encodeURIComponent(id)}`),
};

// ---------------------------------------------------------------------------
// Devices (ACS-020)
// ---------------------------------------------------------------------------
export const devicesApi = {
  list: () => apiRequest<any[]>('/v1/devices'),
  create: (payload: any) => apiRequest<any>('/v1/devices', { method: 'POST', body: payload }),
  get: (id: string) => apiRequest<any>(`/v1/devices/${id}`),
  testConnection: (id: string) => apiRequest<any>(`/v1/devices/${id}/test-connection`, { method: 'POST' }),
  syncNow: (id: string) => apiRequest<any>(`/v1/devices/${id}/sync-now`, { method: 'POST' }),
  getEvents: (id: string) => apiRequest<any[]>(`/v1/devices/${id}/events`),
};
