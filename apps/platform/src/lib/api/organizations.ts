import { apiClient } from './client';
import type {
  OrganizationListResponse,
  OrganizationListFilters,
  OrganizationStatsDTO,
  OrganizationInsightsDTO,
  BulkActionInput,
  ImpersonateResultDTO,
} from '@/types/organizations';
import type {
  Org360Overview,
  Org360Subscription,
  UsageTrend,
  Org360Branch,
  Org360User,
  Org360Billing,
  TimelineEvent,
  Org360AuditPage,
  Org360Support,
  SupportTicket,
  Org360Settings,
} from '@/types/org360';

const BASE = '/v1/platform/organizations';

export const platformOrganizationsApi = {
  list: async (filters: OrganizationListFilters = {}): Promise<OrganizationListResponse> => {
    const params: Record<string, unknown> = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) params[k] = v;
    });
    const response = await apiClient.get(BASE, { params });
    return response.data;
  },
  getStats: async (): Promise<OrganizationStatsDTO> => (await apiClient.get(`${BASE}/stats`)).data,
  getInsights: async (): Promise<OrganizationInsightsDTO> => (await apiClient.get(`${BASE}/insights`)).data,
  listCountries: async (): Promise<string[]> => (await apiClient.get(`${BASE}/countries`)).data,

  suspend: async (id: string, reason?: string) => (await apiClient.post(`${BASE}/${id}/suspend`, { reason })).data,
  activate: async (id: string) => (await apiClient.post(`${BASE}/${id}/activate`)).data,
  archive: async (id: string) => (await apiClient.post(`${BASE}/${id}/archive`)).data,
  impersonate: async (id: string): Promise<ImpersonateResultDTO> => (await apiClient.post(`${BASE}/${id}/impersonate`)).data,

  bulk: async (payload: BulkActionInput): Promise<{ action: string; requested: number; affected: number }> =>
    (await apiClient.post(`${BASE}/bulk`, payload)).data,

  recordExport: async (format: string, count: number) => (await apiClient.post(`${BASE}/export`, { format, count })).data,

  // --- Organization 360 workspace (PLT-005) ---
  getOverview: async (id: string): Promise<Org360Overview> => (await apiClient.get(`${BASE}/${id}/overview`)).data,
  getSubscription: async (id: string): Promise<Org360Subscription> => (await apiClient.get(`${BASE}/${id}/subscription`)).data,
  getUsageTrend: async (id: string): Promise<UsageTrend> => (await apiClient.get(`${BASE}/${id}/usage-trend`)).data,
  getBranches: async (id: string): Promise<Org360Branch[]> => (await apiClient.get(`${BASE}/${id}/branches`)).data,
  getUsers: async (id: string): Promise<Org360User[]> => (await apiClient.get(`${BASE}/${id}/users`)).data,
  getBilling: async (id: string): Promise<Org360Billing> => (await apiClient.get(`${BASE}/${id}/billing`)).data,
  getActivity: async (id: string): Promise<TimelineEvent[]> => (await apiClient.get(`${BASE}/${id}/activity`)).data,
  getAudit: async (id: string, params: { search?: string; category?: string; page?: number; limit?: number } = {}): Promise<Org360AuditPage> =>
    (await apiClient.get(`${BASE}/${id}/audit`, { params })).data,
  getSupport: async (id: string): Promise<Org360Support> => (await apiClient.get(`${BASE}/${id}/support`)).data,
  getSettings: async (id: string): Promise<Org360Settings> => (await apiClient.get(`${BASE}/${id}/settings`)).data,

  assignPlan: async (id: string, planId: string, couponCode?: string) => (await apiClient.post(`${BASE}/${id}/assign-plan`, { planId, couponCode })).data,
  resetLimits: async (id: string) => (await apiClient.post(`${BASE}/${id}/reset-limits`)).data,
  notify: async (id: string, title: string, message?: string) => (await apiClient.post(`${BASE}/${id}/notify`, { title, message })).data,
  createSupportTicket: async (
    id: string,
    payload: { subject: string; description?: string; priority?: string; category?: string; assignedEngineer?: string; internalNotes?: string },
  ): Promise<SupportTicket> => (await apiClient.post(`${BASE}/${id}/support-tickets`, payload)).data,
  updateSettings: async (
    id: string,
    payload: { language?: string; timezone?: string; dateFormat?: string; workspaceExperienceOverride?: string | null },
  ): Promise<Org360Settings> => (await apiClient.put(`${BASE}/${id}/settings`, payload)).data,

  // --- Subscription lifecycle (PLT-006) ---
  extendTrial: async (id: string, days: number) => (await apiClient.post(`${BASE}/${id}/subscription/extend-trial`, { days })).data,
  endTrial: async (id: string) => (await apiClient.post(`${BASE}/${id}/subscription/end-trial`)).data,
  pauseSubscription: async (id: string) => (await apiClient.post(`${BASE}/${id}/subscription/pause`)).data,
  resumeSubscription: async (id: string) => (await apiClient.post(`${BASE}/${id}/subscription/resume`)).data,
  cancelSubscription: async (id: string, reason?: string) => (await apiClient.post(`${BASE}/${id}/subscription/cancel`, { reason })).data,
  applyCoupon: async (id: string, code: string) => (await apiClient.post(`${BASE}/${id}/subscription/apply-coupon`, { code })).data,
  removeCoupon: async (id: string, redemptionId: string) => (await apiClient.post(`${BASE}/${id}/subscription/remove-coupon/${redemptionId}`)).data,
  generateInvoice: async (id: string, amount: number, description?: string, dueDate?: string) =>
    (await apiClient.post(`${BASE}/${id}/subscription/generate-invoice`, { amount, description, dueDate })).data,
  refundPayment: async (id: string, paymentId: string, amount: number, reason?: string) =>
    (await apiClient.post(`${BASE}/${id}/subscription/payments/${paymentId}/refund`, { amount, reason })).data,
  updateEnterpriseSettings: async (
    id: string,
    payload: { isEnterpriseCustom?: boolean; customPrice?: number | null; privateNotes?: string; dedicatedSupportContact?: string; customSlaTerms?: string },
  ) => (await apiClient.put(`${BASE}/${id}/subscription/enterprise-settings`, payload)).data,
};
