import { apiClient } from './client';

export const authApi = {
  /**
   * Triggers a login/registration OTP to a user's phone number.
   */
  sendOtp: async (phoneNumber: string, mode?: 'signup' | 'login') => {
    const response = await apiClient.post('/v1/auth/otp/send', { phoneNumber, mode });
    return response.data;
  },

  /**
   * Verifies the OTP and returns the user payload along with JWT token.
   */
  verifyOtp: async (phoneNumber: string, otp: string, fullName?: string, mode?: 'signup' | 'login') => {
    const response = await apiClient.post('/v1/auth/otp/verify', {
      phoneNumber,
      otp,
      fullName: fullName || undefined,
      mode,
    });
    return response.data;
  },

  /**
   * Refreshes the session with a new access and refresh token.
   */
  refresh: async (refreshToken: string) => {
    const response = await apiClient.post('/v1/auth/refresh', { refreshToken });
    return response.data;
  },

  /**
   * Fetches the current authenticated user's profile.
   */
  getMe: async () => {
    const response = await apiClient.get('/v1/auth/me');
    return response.data;
  },

  /**
   * Updates the current user's profile details.
   */
  updateProfile: async (payload: { fullName: string; email: string }) => {
    const response = await apiClient.put('/v1/auth/profile', payload);
    return response.data;
  },
};

export const orgApi = {
  /**
   * Registers a new tenant organization.
   */
  create: async (payload: {
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
  }) => {
    const response = await apiClient.post('/v1/organizations', payload);
    return response.data;
  },

  /**
   * Lists all organizations associated with the logged-in user.
   */
  list: async () => {
    const response = await apiClient.get<any[]>('/v1/organizations');
    return response.data;
  },

  /**
   * Updates an existing organization's details.
   */
  update: async (id: string, payload: {
    name?: string;
    slug?: string;
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
    settings?: any;
    status?: string;
    isActive?: boolean;
  }) => {
    const response = await apiClient.put(`/v1/organizations/${id}`, payload);
    return response.data;
  },
  getOverviewStats: async (id: string) => {
    const response = await apiClient.get<any>(`/v1/organizations/${id}/overview`);
    return response.data;
  },
};

export const gymApi = {
  /**
   * Registers a new branch location under an organization.
   */
  create: async (payload: {
    organizationId: string;
    name: string;
    code?: string;
    settings?: any;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
    contactPhone?: string;
    contactEmail?: string;
  }) => {
    const response = await apiClient.post('/v1/gyms', payload);
    return response.data;
  },

  /**
   * Lists all branches under the specified organization.
   */
  list: async (organizationId: string) => {
    const response = await apiClient.get<any[]>('/v1/gyms', {
      params: { organizationId },
    });
    return response.data;
  },

  /**
   * Updates an existing gym branch.
   */
  update: async (id: string, payload: {
    name?: string;
    code?: string;
    settings?: any;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
    contactPhone?: string;
    contactEmail?: string;
  }) => {
    const response = await apiClient.put(`/v1/gyms/${id}`, payload);
    return response.data;
  },

  /**
   * Fetches metrics for a specific gym branch.
   */
  getMetrics: async (id: string) => {
    const response = await apiClient.get<any>(`/v1/gyms/${id}/metrics`);
    return response.data;
  },

  /**
   * Fetches live occupancy stats for a specific gym branch.
   */
  getOccupancy: async (id: string) => {
    const response = await apiClient.get<{
      capacity: number;
      current: number;
      available: number;
      percent: number;
      status: 'normal' | 'busy' | 'full';
    }>(`/v1/gyms/${id}/occupancy`);
    return response.data;
  },
};

export const devicesApi = {
  /**
   * Lists devices registered under a gym branch, or every device in the
   * organization when gymId is omitted (backend treats it as optional).
   */
  list: async (gymId?: string) => {
    const response = await apiClient.get<any[]>('/v1/devices', { params: gymId ? { gymId } : undefined });
    return response.data;
  },

  /**
   * Registers a new attendance device.
   */
  create: async (payload: {
    organizationId?: string;
    gymId: string;
    name: string;
    type: 'QR_SCANNER' | 'FINGERPRINT' | 'RFID' | 'FACE_CAMERA' | 'TURNSTILE' | 'BARCODE';
  }) => {
    const response = await apiClient.post('/v1/devices', payload);
    return response.data;
  },

  /**
   * Updates an existing device.
   */
  update: async (id: string, payload: { name?: string; type?: string; status?: 'OFFLINE' | 'ONLINE' | 'ERROR' }) => {
    const response = await apiClient.patch(`/v1/devices/${id}`, payload);
    return response.data;
  },

  /**
   * Sends a heartbeat ping for a device.
   */
  heartbeat: async (id: string, payload?: { version?: string }) => {
    const response = await apiClient.post(`/v1/devices/${id}/heartbeat`, payload || {});
    return response.data;
  },

  /**
   * Removes a device.
   */
  remove: async (id: string) => {
    const response = await apiClient.delete(`/v1/devices/${id}`);
    return response.data;
  },
};

export const rolesApi = {
  /**
   * Lists all roles.
   */
  list: async () => {
    const response = await apiClient.get<any[]>('/v1/roles');
    return response.data;
  },

  /**
   * Fetches specific role details.
   */
  get: async (id: string) => {
    const response = await apiClient.get<any>(`/v1/roles/${id}`);
    return response.data;
  },

  /**
   * Creates a custom role.
   */
  create: async (payload: {
    name: string;
    description?: string;
    category?: string;
    permissions?: string[];
    gymScope?: 'all' | string[];
  }) => {
    const response = await apiClient.post('/v1/roles', payload);
    return response.data;
  },

  /**
   * Updates an existing role configuration.
   */
  update: async (id: string, payload: {
    name?: string;
    description?: string;
    category?: string;
    permissions?: string[];
    gymScope?: 'all' | string[];
  }) => {
    const response = await apiClient.put(`/v1/roles/${id}`, payload);
    return response.data;
  },

  /**
   * Deletes a custom role.
   */
  delete: async (id: string) => {
    const response = await apiClient.delete(`/v1/roles/${id}`);
    return response.data;
  },

  /**
   * Assigns staff/employees to a role.
   */
  assignUsers: async (id: string, employeeIds: string[]) => {
    const response = await apiClient.post(`/v1/roles/${id}/assign`, { employeeIds });
    return response.data;
  },

  /**
   * Revokes role access for a user.
   */
  revokeUser: async (employeeId: string) => {
    const response = await apiClient.post(`/v1/roles/users/${employeeId}/revoke`);
    return response.data;
  },

  /**
   * Fetches system audit logs, optionally scoped to one event category (e.g. 'attendance').
   */
  getAuditLogs: async (eventCategory?: string) => {
    const response = await apiClient.get<any[]>('/v1/roles/audit-logs', { params: eventCategory ? { eventCategory } : undefined });
    return response.data;
  },

  /**
   * Fetches paginated security/IAM audit logs (role, permission, user-access,
   * and auth/session events) for the Security Logs tab.
   */
  getSecurityLogs: async (page = 1, limit = 15) => {
    const response = await apiClient.get<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>(
      '/v1/roles/security-logs',
      { params: { page, limit } },
    );
    return response.data;
  },

  /**
   * Creates an audit log record.
   */
  createAuditLog: async (payload: { action: string; details: string; user?: string; eventType?: string; eventCategory?: string; metadata?: any }) => {
    const response = await apiClient.post('/v1/roles/audit-logs', payload);
    return response.data;
  },

  /**
   * Fetches assignable employees list.
   */
  getEmployees: async () => {
    const response = await apiClient.get<any[]>('/v1/roles/employees');
    return response.data;
  },

  /**
   * Returns aggregated dashboard statistics for the RBAC module.
   * Includes total roles, users, overrides, and permission usage breakdown.
   */
  getStats: async () => {
    const response = await apiClient.get<any>('/v1/roles/stats');
    return response.data;
  },

  /**
   * Lists all active permission overrides.
   */
  getOverrides: async () => {
    const response = await apiClient.get<any[]>('/v1/roles/overrides');
    return response.data;
  },

  /**
   * Creates a new temporary or emergency permission override request.
   */
  createOverride: async (payload: {
    userId: string;
    permission: string;
    type: 'Temporary' | 'Emergency';
    expiresAt: string;
    reason?: string;
  }) => {
    const response = await apiClient.post('/v1/roles/overrides', payload);
    return response.data;
  },

  /**
   * Approves a pending permission override.
   */
  approveOverride: async (id: string) => {
    const response = await apiClient.post(`/v1/roles/overrides/${id}/approve`);
    return response.data;
  },

  /**
   * Revokes / deletes an active override.
   */
  revokeOverride: async (id: string) => {
    const response = await apiClient.delete(`/v1/roles/overrides/${id}`);
    return response.data;
  },

  /**
   * Force re-syncs all system role permissions from the canonical server-side definition.
   * Call this after backend SYSTEM_ROLE_DEFINITIONS are updated.
   */
  syncDefaults: async () => {
    const response = await apiClient.post<any>('/v1/roles/sync-defaults');
    return response.data;
  },
};

export const orgUsersApi = {
  /**
   * Fetch dashboard stats for organization users.
   */
  getStats: async () => {
    const response = await apiClient.get('/v1/organizations/users/stats');
    return response.data;
  },

  /**
   * List all users in the organization.
   */
  list: async () => {
    const response = await apiClient.get<any[]>('/v1/organizations/users');
    return response.data;
  },

  /**
   * Get specific user details.
   */
  getDetails: async (userId: string) => {
    const response = await apiClient.get<any>(`/v1/organizations/users/${userId}/details`);
    return response.data;
  },

  /**
   * Change a user's role.
   */
  changeRole: async (userId: string, roleId: string, roleIds?: string[]) => {
    const response = await apiClient.put(`/v1/organizations/users/${userId}/role`, { roleId, roleIds });
    return response.data;
  },

  /**
   * Assign gym branch access.
   */
  assignGyms: async (userId: string, gymIds: string[]) => {
    const response = await apiClient.put(`/v1/organizations/users/${userId}/gyms`, { gymIds });
    return response.data;
  },

  /**
   * Toggle user active/inactive status.
   */
  toggleStatus: async (userId: string, isActive: boolean) => {
    const response = await apiClient.put(`/v1/organizations/users/${userId}/status`, { isActive });
    return response.data;
  },

  /**
   * Remove a user from the organization.
   */
  removeUser: async (userId: string) => {
    const response = await apiClient.delete(`/v1/organizations/users/${userId}`);
    return response.data;
  },

  /**
   * Bulk update users.
   */
  bulkUpdate: async (payload: { userIds: string[]; roleId?: string; roleIds?: string[]; gymIds?: string[] }) => {
    const response = await apiClient.post('/v1/organizations/users/bulk', payload);
    return response.data;
  },

  /**
   * List pending invitations.
   */
  getInvitations: async () => {
    const response = await apiClient.get<any[]>('/v1/organizations/invitations');
    return response.data;
  },

  /**
   * Send a new user invitation.
   */
  inviteUser: async (payload: {
    phoneNumber: string;
    roleId?: string;
    roleIds?: string[];
    email?: string;
    fullName?: string;
    gymIds?: string[];
    message?: string;
  }) => {
    const response = await apiClient.post('/v1/organizations/invitations', payload);
    return response.data;
  },

  /**
   * Resend / extend invitation.
   */
  resendInvitation: async (id: string) => {
    const response = await apiClient.post(`/v1/organizations/invitations/${id}/resend`);
    return response.data;
  },

  /**
   * Cancel / revoke invitation.
   */
  deleteInvitation: async (id: string) => {
    const response = await apiClient.delete(`/v1/organizations/invitations/${id}`);
    return response.data;
  },

  /**
   * Fetch invitation details publicly.
   */
  getInvitationDetails: async (id: string) => {
    const response = await apiClient.get<any>(`/v1/organizations/invitations/${id}`);
    return response.data;
  },

  /**
   * Decline / reject invitation publicly.
   */
  declineInvitation: async (id: string) => {
    const response = await apiClient.post(`/v1/organizations/invitations/${id}/decline`);
    return response.data;
  },

  /**
   * Accept invitation.
   */
  acceptInvitation: async (id: string, payload: { userId: string; phoneNumber: string }) => {
    const response = await apiClient.post(`/v1/organizations/invitations/${id}/accept`, payload);
    return response.data;
  },
};

export const membersApi = {
  create: async (payload: any) => {
    const response = await apiClient.post('/v1/members', payload);
    return response.data;
  },
  list: async (filters?: { homeGymId?: string; search?: string }) => {
    const response = await apiClient.get<any[]>('/v1/members', { params: filters });
    return response.data;
  },
  get: async (id: string) => {
    const response = await apiClient.get<any>(`/v1/members/${id}`);
    return response.data;
  },
  update: async (id: string, payload: any) => {
    const response = await apiClient.patch<any>(`/v1/members/${id}`, payload);
    return response.data;
  },
  addMeasurement: async (id: string, payload: { height?: number; weight?: number; bodyFatPercentage?: number }) => {
    const response = await apiClient.post(`/v1/members/${id}/measurements`, payload);
    return response.data;
  },
  generateQrCode: async (id: string) => {
    const response = await apiClient.get<any>(`/v1/members/${id}/qr`);
    return response.data;
  },
  lookupGlobal: async (phoneNumber: string) => {
    const response = await apiClient.get<any>('/v1/members/lookup/global', { params: { phoneNumber } });
    return response.data;
  },
  sendPhoneOtp: async (phoneNumber: string) => {
    const response = await apiClient.post<{ sent: boolean; expiresIn: number; devOtp: string }>('/v1/public/members/phone/send-otp', { phoneNumber });
    return response.data;
  },
  verifyPhoneOtp: async (phoneNumber: string, code: string) => {
    const response = await apiClient.post<{ verified: boolean }>('/v1/public/members/phone/verify-otp', { phoneNumber, code });
    return response.data;
  },
};

export const membershipsApi = {
  createPlan: async (payload: {
    name: string;
    code: string;
    description?: string;
    category: string;
    status?: string;
    durationType: string;
    durationValue: number;
    basePrice: number;
    joiningFee?: number;
    taxPercentage?: number;
    branchAccess?: string;
    benefits?: any;
  }) => {
    const response = await apiClient.post('/v1/memberships/plans', payload);
    return response.data;
  },
  updatePlan: async (id: string, payload: any) => {
    const response = await apiClient.patch(`/v1/memberships/plans/${id}`, payload);
    return response.data;
  },
  listPlans: async () => {
    const response = await apiClient.get<any[]>('/v1/memberships/plans');
    return response.data;
  },
  getPlan: async (id: string) => {
    const response = await apiClient.get<any>(`/v1/memberships/plans/${id}`);
    return response.data;
  },
  purchaseMembership: async (payload: {
    memberId: string;
    membershipPlanId: string;
    startDate: string;
    endDate: string;
    amountPaid: number;
    status?: string;
  }) => {
    const response = await apiClient.post('/v1/memberships/purchases', payload);
    return response.data;
  },
  listPurchased: async (memberId: string) => {
    const response = await apiClient.get<any[]>(`/v1/memberships/purchases/${memberId}`);
    return response.data;
  },
  getSubscription: async (id: string) => {
    const response = await apiClient.get<any>(`/v1/memberships/purchases/detail/${id}`);
    return response.data;
  },
  getSubscriptionOverview: async (id: string) => {
    const response = await apiClient.get<any>(`/v1/memberships/purchases/detail/${id}/overview`);
    return response.data;
  },
  listAllSubscriptions: async () => {
    const response = await apiClient.get<any[]>('/v1/memberships/all-subscriptions');
    return response.data;
  },
  updateSubscription: async (id: string, payload: any) => {
    const response = await apiClient.patch(`/v1/memberships/purchases/detail/${id}`, payload);
    return response.data;
  },
  getExpiring: async (gymId?: string, days?: number) => {
    const response = await apiClient.get<any[]>('/v1/memberships/subscriptions/expiring', {
      params: { gymId, days }
    });
    return response.data;
  },
};

export const attendanceApi = {
  checkIn: async (payload: { memberId?: string; gymId: string; method: string; memberName?: string }) => {
    const response = await apiClient.post('/v1/attendance/check-in', payload);
    return response.data;
  },
  checkOut: async (id: string) => {
    const response = await apiClient.post(`/v1/attendance/check-out/${id}`);
    return response.data;
  },
  bulkCheckOut: async (ids: string[]) => {
    const response = await apiClient.post('/v1/attendance/bulk-checkout', { ids });
    return response.data;
  },
  correctRecord: async (id: string, payload: { checkInTime: string; checkOutTime: string; reason: string }) => {
    const response = await apiClient.post(`/v1/attendance/correction/${id}`, payload);
    return response.data;
  },
  listActive: async (gymId?: string) => {
    const response = await apiClient.get<any[]>('/v1/attendance/active', { params: gymId && gymId !== 'all' ? { gymId } : undefined });
    return response.data;
  },
  listLogs: async (gymId: string) => {
    const response = await apiClient.get<any[]>('/v1/attendance/logs', { params: { gymId } });
    return response.data;
  },
  getStats: async (gymId: string) => {
    const response = await apiClient.get<any>('/v1/attendance/stats', { params: { gymId } });
    return response.data;
  },
  search: async (params: {
    query?: string;
    gymId?: string;
    status?: string;
    method?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get<any>('/v1/attendance/search', { params });
    return response.data;
  },
  getAnalytics: async (gymId?: string) => {
    const response = await apiClient.get<any>('/v1/attendance/analytics', { params: { gymId } });
    return response.data;
  },
  getExceptions: async (gymId?: string) => {
    const response = await apiClient.get<any[]>('/v1/attendance/exceptions', { params: { gymId } });
    return response.data;
  },
  getSettings: async (gymId: string) => {
    const response = await apiClient.get<any>('/v1/attendance/validation/rules', { params: { gymId } });
    return response.data;
  },
  updateSettings: async (gymId: string, rules: any) => {
    const response = await apiClient.post<any>('/v1/attendance/validation/rules', { gymId, rules });
    return response.data;
  },
  bulkCorrect: async (payload: { ids: string[]; checkInTime: string; checkOutTime: string; reason: string }) => {
    const response = await apiClient.post('/v1/attendance/bulk-correct', payload);
    return response.data;
  },
  getValidationStats: async (gymId: string) => {
    const response = await apiClient.get<any>('/v1/attendance/validation/stats', { params: { gymId } });
    return response.data;
  },
  getValidationRules: async (gymId: string) => {
    const response = await apiClient.get<any>('/v1/attendance/validation/rules', { params: { gymId } });
    return response.data;
  },
  saveValidationRules: async (gymId: string, rules: any) => {
    const response = await apiClient.post('/v1/attendance/validation/rules', { gymId, rules });
    return response.data;
  },
  executeOverride: async (payload: {
    memberId: string;
    gymId: string;
    reason: string;
    approverName: string;
    notes?: string;
    deviceUsed?: string;
  }) => {
    const response = await apiClient.post('/v1/attendance/validation/override', payload);
    return response.data;
  },
  validateCheckIn: async (gymId: string, memberId: string) => {
    const response = await apiClient.post('/v1/attendance/validation/check', { gymId, memberId });
    return response.data;
  },
};

export const subscriptionApi = {
  getActive: async () => {
    const response = await apiClient.get<any>('/v1/subscriptions/active');
    return response.data;
  },
  getInvoices: async () => {
    const response = await apiClient.get<any[]>('/v1/subscriptions/invoices');
    return response.data;
  },
  /**
   * Tenant-facing catalog of active, publicly-visible plans an org can
   * switch to (distinct from /v1/public/plans, which is unauthenticated).
   */
  getPlans: async () => {
    const response = await apiClient.get<any[]>('/v1/subscriptions/plans');
    return response.data;
  },
  /**
   * Activates a free (price 0) plan directly - no payment step. The backend
   * rejects this for paid plans; use checkout()/verifyPayment() instead.
   */
  subscribe: async (planId: string) => {
    const response = await apiClient.post<any>('/v1/subscriptions/subscribe', { planId });
    return response.data;
  },
  /**
   * Starts a Razorpay checkout for a paid plan. Returns { free: true, ... }
   * with no payment needed if the plan turned out to be free, otherwise
   * { free: false, orderId, amount, currency, keyId, planName } to open the
   * Razorpay Checkout widget with.
   */
  checkout: async (planId: string) => {
    const response = await apiClient.post<any>('/v1/subscriptions/checkout', { planId });
    return response.data;
  },
  /**
   * Verifies a completed Razorpay payment's signature server-side and, if
   * valid, activates the subscription. Never trust the client-side success
   * callback alone.
   */
  verifyPayment: async (payload: { planId: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) => {
    const response = await apiClient.post<any>('/v1/subscriptions/verify-payment', payload);
    return response.data;
  },
};

export const documentsApi = {
  generatePresignedUrl: async (payload: {
    targetId: string;
    targetType: 'MEMBER' | 'EMPLOYEE';
    fileName: string;
    contentType: string;
  }) => {
    const response = await apiClient.post<{ presignedUrl: string; key: string; finalUrl: string }>(
      '/v1/documents/presigned-url',
      payload
    );
    return response.data;
  },

  confirmUpload: async (payload: {
    targetId: string;
    targetType: 'MEMBER' | 'EMPLOYEE';
    documentType: string;
    url: string;
  }) => {
    const response = await apiClient.post('/v1/documents/confirm', payload);
    return response.data;
  },
};

export const freezeApi = {
  list: async () => {
    const response = await apiClient.get<any[]>('/v1/memberships/freeze');
    return response.data;
  },
  requestFreeze: async (payload: {
    memberMembershipId: string;
    startDate: string;
    endDate: string;
    durationDays: number;
    reasonCategory: string;
    reasonNotes?: string;
    documentUrl?: string;
  }) => {
    const response = await apiClient.post('/v1/memberships/freeze', payload);
    return response.data;
  },
  approve: async (id: string, approvedBy: string) => {
    const response = await apiClient.post(`/v1/memberships/freeze/${id}/approve`, { approvedBy });
    return response.data;
  },
  reject: async (id: string, approvedBy: string, rejectionReason: string) => {
    const response = await apiClient.post(`/v1/memberships/freeze/${id}/reject`, { approvedBy, rejectionReason });
    return response.data;
  },
  reactivateEarly: async (id: string) => {
    const response = await apiClient.post(`/v1/memberships/freeze/${id}/reactivate`);
    return response.data;
  }
};

export const exercisesApi = {
  list: async (params?: {
    search?: string;
    source?: string;
    muscleGroup?: string;
    equipment?: string;
    difficulty?: string;
    category?: string;
    visibility?: string;
    favoritesOnly?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get<any>('/v1/exercises', { params });
    return response.data;
  },
  get: async (id: string) => {
    const response = await apiClient.get<any>(`/v1/exercises/${id}`);
    return response.data;
  },
  create: async (payload: any) => {
    const response = await apiClient.post<any>('/v1/exercises', payload);
    return response.data;
  },
  update: async (id: string, payload: any) => {
    const response = await apiClient.patch<any>(`/v1/exercises/${id}`, payload);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete<any>(`/v1/exercises/${id}`);
    return response.data;
  },
  toggleFavorite: async (id: string) => {
    const response = await apiClient.post<any>(`/v1/exercises/${id}/favorite`);
    return response.data;
  },
  import: async (id: string) => {
    const response = await apiClient.post<any>(`/v1/exercises/${id}/import`);
    return response.data;
  },
  syncExternal: async () => {
    const response = await apiClient.post<any>('/v1/exercises/sync-external');
    return response.data;
  },
  getAnalytics: async () => {
    const response = await apiClient.get<any>('/v1/exercises/analytics');
    return response.data;
  },
  bulkAction: async (payload: { ids: string[]; action: string; value?: any }) => {
    const response = await apiClient.post<any>('/v1/exercises/bulk', payload);
    return response.data;
  },
};

export const metadataApi = {
  list: async (params?: {
    type?: string;
    search?: string;
    status?: string;
    source?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get<any>('/v1/metadata', { params });
    return response.data;
  },
  get: async (id: string) => {
    const response = await apiClient.get<any>(`/v1/metadata/${id}`);
    return response.data;
  },
  create: async (payload: any) => {
    const response = await apiClient.post<any>('/v1/metadata', payload);
    return response.data;
  },
  update: async (id: string, payload: any) => {
    const response = await apiClient.patch<any>(`/v1/metadata/${id}`, payload);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete<any>(`/v1/metadata/${id}`);
    return response.data;
  },
  merge: async (payload: { sourceId: string; targetId: string }) => {
    const response = await apiClient.post<any>('/v1/metadata/merge', payload);
    return response.data;
  },
  import: async (payload: { items: any[] }) => {
    const response = await apiClient.post<any>('/v1/metadata/import', payload);
    return response.data;
  },
  getAnalytics: async () => {
    const response = await apiClient.get<any>('/v1/metadata/analytics');
    return response.data;
  },
};

export const workoutsApi = {
  list: async (params?: {
    search?: string;
    type?: string;
    difficulty?: string;
    status?: string;
    isTemplate?: boolean;
    isFavorite?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get<any>('/v1/workouts', { params });
    return response.data;
  },
  get: async (id: string) => {
    const response = await apiClient.get<any>(`/v1/workouts/${id}`);
    return response.data;
  },
  create: async (payload: any) => {
    const response = await apiClient.post<any>('/v1/workouts', payload);
    return response.data;
  },
  update: async (id: string, payload: any) => {
    const response = await apiClient.patch<any>(`/v1/workouts/${id}`, payload);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete<any>(`/v1/workouts/${id}`);
    return response.data;
  },
  duplicate: async (id: string) => {
    const response = await apiClient.post<any>(`/v1/workouts/${id}/duplicate`);
    return response.data;
  },
  getVersions: async (id: string) => {
    const response = await apiClient.get<any>(`/v1/workouts/${id}/versions`);
    return response.data;
  },
  restoreVersion: async (workoutId: string, versionId: string) => {
    const response = await apiClient.post<any>(`/v1/workouts/${workoutId}/versions/${versionId}/restore`);
    return response.data;
  },
  bulkAction: async (payload: { ids: string[]; action: 'archive' | 'delete' | 'publish' }) => {
    const response = await apiClient.post<any>('/v1/workouts/bulk', payload);
    return response.data;
  },
  getAnalytics: async () => {
    const response = await apiClient.get<any>('/v1/workouts/analytics');
    return response.data;
  },
};

export const plansApi = {
  /**
   * Unauthenticated: lists active, publicly-visible subscription plans
   * for the marketing landing page's pricing section.
   */
  listPublic: async () => {
    const response = await apiClient.get<any[]>('/v1/public/plans');
    return response.data;
  },
};

export const expiryRemindersApi = {
  listRules: async () => {
    const r = await apiClient.get<any[]>('/v1/memberships/reminder-rules');
    return r.data;
  },
  createRule: async (dto: any) => {
    const r = await apiClient.post<any>('/v1/memberships/reminder-rules', dto);
    return r.data;
  },
  updateRule: async (id: string, dto: any) => {
    const r = await apiClient.put<any>(`/v1/memberships/reminder-rules/${id}`, dto);
    return r.data;
  },
  deleteRule: async (id: string) => {
    const r = await apiClient.delete<any>(`/v1/memberships/reminder-rules/${id}`);
    return r.data;
  },
  dispatch: async (dto: { ruleId: string; subscriptionIds?: string[] }) => {
    const r = await apiClient.post<any>('/v1/memberships/reminder-rules/dispatch', dto);
    return r.data;
  },
  listLogs: async (limit = 50) => {
    const r = await apiClient.get<any[]>(`/v1/memberships/reminder-rules/logs?limit=${limit}`);
    return r.data;
  },
  getChannelConfig: async () => {
    const r = await apiClient.get<any>('/v1/memberships/reminder-rules/channel-config');
    return r.data;
  },
};

export const platformOrgDetailApi = {
  getReminderChannels: async (orgId: string) => {
    const r = await apiClient.get<any>(`/v1/platform/organizations/${orgId}/reminder-channels`);
    return r.data;
  },
  updateReminderChannels: async (orgId: string, dto: any) => {
    const r = await apiClient.put<any>(`/v1/platform/organizations/${orgId}/reminder-channels`, dto);
    return r.data;
  },
  getReminderLogs: async (orgId: string, limit = 100) => {
    const r = await apiClient.get<any[]>(`/v1/platform/organizations/${orgId}/reminder-logs?limit=${limit}`);
    return r.data;
  },
  getReminderRules: async (orgId: string) => {
    const r = await apiClient.get<any[]>(`/v1/platform/organizations/${orgId}/reminder-rules`);
    return r.data;
  },
};

export const platformSettingsApi = {
  /**
   * Unauthenticated: platform admin's General + Branding identity fields
   * (name, logo, support contact, brand colors) for the marketing landing page.
   */
  getPublicBrand: async () => {
    const response = await apiClient.get<any>('/v1/platform/settings-public/brand');
    return response.data;
  },
};




