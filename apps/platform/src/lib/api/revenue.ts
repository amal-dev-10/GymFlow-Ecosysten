import { apiClient } from './client';
import type {
  RevenueDashboardDTO,
  RevenueChartsDTO,
  SubscriptionAnalyticsDTO,
  InvoiceRowDTO,
  PaymentRowDTO,
  RefundRowDTO,
  PaginatedResponse,
  CouponAnalyticsDTO,
  OrgBillingSnapshotDTO,
  ForecastDTO,
  TaxSummaryDTO,
  PaymentGatewayDTO,
  RevenueNotificationsDTO,
  RevenueListFilters,
} from '@/types/revenue';

const BASE = '/v1/platform/revenue';

function cleanParams<T extends object>(filters: T) {
  const params: Record<string, unknown> = {};
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) params[k] = v;
  });
  return params;
}

export const platformRevenueApi = {
  getDashboard: async (): Promise<RevenueDashboardDTO> => (await apiClient.get(`${BASE}/dashboard`)).data,
  getWidgetSummary: async () => (await apiClient.get(`${BASE}/widget-summary`)).data,
  getCharts: async (): Promise<RevenueChartsDTO> => (await apiClient.get(`${BASE}/charts`)).data,
  getSubscriptionAnalytics: async (): Promise<SubscriptionAnalyticsDTO> => (await apiClient.get(`${BASE}/subscription-analytics`)).data,

  listInvoices: async (filters: RevenueListFilters = {}): Promise<PaginatedResponse<InvoiceRowDTO>> => (await apiClient.get(`${BASE}/invoices`, { params: cleanParams(filters) })).data,
  generateInvoice: async (payload: { organizationId: string; amount: number; description?: string; dueDate?: string; taxRate?: number }): Promise<InvoiceRowDTO> =>
    (await apiClient.post(`${BASE}/invoices/generate`, payload)).data,

  listPayments: async (filters: RevenueListFilters = {}): Promise<PaginatedResponse<PaymentRowDTO>> => (await apiClient.get(`${BASE}/payments`, { params: cleanParams(filters) })).data,
  refundPayment: async (paymentId: string, payload: { organizationId: string; amount: number; reason?: string }) => (await apiClient.post(`${BASE}/payments/${paymentId}/refund`, payload)).data,
  retryPayment: async (paymentId: string, organizationId: string) => (await apiClient.post(`${BASE}/payments/${paymentId}/retry`, { organizationId })).data,

  listRefunds: async (filters: RevenueListFilters = {}): Promise<PaginatedResponse<RefundRowDTO>> => (await apiClient.get(`${BASE}/refunds`, { params: cleanParams(filters) })).data,

  getCouponAnalytics: async (): Promise<CouponAnalyticsDTO[]> => (await apiClient.get(`${BASE}/coupons/analytics`)).data,

  searchOrganizations: async (q: string): Promise<{ id: string; name: string; country: string | null }[]> => (await apiClient.get(`${BASE}/organizations/search`, { params: { q } })).data,
  getOrgBillingSnapshot: async (organizationId: string): Promise<OrgBillingSnapshotDTO> => (await apiClient.get(`${BASE}/organizations/${organizationId}/billing-snapshot`)).data,

  applyCoupon: async (organizationId: string, code: string) => (await apiClient.post(`${BASE}/subscriptions/apply-coupon`, { organizationId, code })).data,
  extendTrial: async (organizationId: string, days: number) => (await apiClient.post(`${BASE}/subscriptions/extend-trial`, { organizationId, days })).data,

  getForecast: async (): Promise<ForecastDTO> => (await apiClient.get(`${BASE}/forecast`)).data,
  getReport: async (type: string): Promise<any> => (await apiClient.get(`${BASE}/reports/${type}`)).data,
  getTaxSummary: async (): Promise<TaxSummaryDTO> => (await apiClient.get(`${BASE}/tax-summary`)).data,

  listGateways: async (): Promise<PaymentGatewayDTO[]> => (await apiClient.get(`${BASE}/gateways`)).data,
  updateGateway: async (key: string, isActive: boolean): Promise<PaymentGatewayDTO> => (await apiClient.put(`${BASE}/gateways/${key}`, { isActive })).data,

  getNotifications: async (): Promise<RevenueNotificationsDTO> => (await apiClient.get(`${BASE}/notifications`)).data,
  recordExport: async (payload: { format: string; filters?: Record<string, unknown>; rowCount: number }) => (await apiClient.post(`${BASE}/export`, payload)).data,
};
