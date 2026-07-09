// Shapes mirror apps/api/src/modules/platform-revenue (PLT-012). This is
// GymFlow's OWN revenue (organizations paying GymFlow for plans) - never
// member-level or tenant-internal billing, which lives entirely in apps/web.

export interface RevenueDashboardDTO {
  mrr: number;
  arr: number;
  revenueToday: number;
  revenueThisMonth: number;
  newSubscriptions: number;
  renewals: number;
  trialConversions: number;
  failedPayments: number;
  outstandingInvoices: { count: number; amount: number };
  refunds: { count: number; amount: number };
  churnRate: number;
  arpo: number;
}

export interface TrendPoint {
  month: string;
  value: number;
}

export interface RevenueChartsDTO {
  revenueTrend: TrendPoint[];
  mrrGrowth: TrendPoint[];
  arrGrowth: TrendPoint[];
  subscriptionGrowth: TrendPoint[];
  revenueByCountry: { country: string; value: number }[];
  revenueByPlan: { plan: string; value: number }[];
  revenueByPaymentMethod: { gateway: string; value: number }[];
  revenueForecast: TrendPoint[];
}

export interface SubscriptionAnalyticsDTO {
  byPlan: { plan: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

export interface InvoiceRowDTO {
  id: string;
  organizationName: string;
  organizationId: string;
  planName: string;
  amount: number;
  taxAmount: number | null;
  taxRate: number | null;
  status: string;
  statusLabel: string;
  derivedStatus: string;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  description: string | null;
  paymentMethod: string | null;
}

export interface PaymentRowDTO {
  id: string;
  organizationName: string;
  organizationId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  gateway: string;
  status: string;
  statusLabel: string;
  transactionId: string | null;
  refundedAmount: number | null;
  refundedAt: string | null;
  refundReason: string | null;
  createdAt: string;
}

export interface RefundRowDTO {
  id: string;
  organizationName: string;
  organizationId: string;
  refundAmount: number | null;
  reason: string | null;
  processedBy: string | null;
  status: string;
  gateway: string;
  date: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CouponAnalyticsDTO {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  organizationsUsing: string[];
  usageCount: number;
  maxUses: number | null;
  expiry: string | null;
  status: 'Active' | 'Inactive' | 'Expired' | 'Exhausted';
  totalDiscountApplied: number;
}

export interface OrgBillingSnapshotDTO {
  organization: { id: string; name: string; country: string | null };
  subscription: {
    hasSubscription: boolean;
    plan: { id: string; name: string; price: number; currency: string; billingCycle: string } | null;
    status: string;
    isTrial: boolean;
    trialDaysLeft: number | null;
    renewalDate: string | null;
    monthlyRevenue: number;
    paymentStatus: string;
    invoices: unknown[];
    coupons: unknown[];
  };
}

export interface ForecastDTO {
  projectedRevenueNextMonth: number;
  predictedMrr: number;
  expectedChurnRate: number;
  expectedRenewals: number;
  upcomingRenewals: { organizationName: string; planName: string; endDate: string; value: number }[];
  upcomingExpirations: { organizationName: string; planName: string; trialEndDate: string }[];
}

export interface TaxSummaryDTO {
  totalTaxCollected: number;
  byType: { type: string; taxCollected: number; invoiceCount: number }[];
  byCountry: { country: string; taxCollected: number }[];
}

export interface PaymentGatewayDTO {
  key: string;
  label: string;
  icon: string | null;
  isActive: boolean;
  order: number;
}

export interface RevenueNotificationsDTO {
  paymentFailed: { id: string; organizationName: string; amount: number; createdAt: string }[];
  invoiceOverdue: { id: string; organizationName: string; amount: number; dueDate: string }[];
  trialEnding: { organizationId: string; organizationName: string; trialEndDate: string }[];
  subscriptionRenewed: { id: string; organizationName: string; amount: number; paidAt: string }[];
  refundProcessed: { id: string; organizationName: string; amount: number | null; refundedAt: string | null }[];
  highChurnAlert: { churnRate: number } | null;
}

export interface RevenueListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  organizationId?: string;
  planId?: string;
  gateway?: string;
  startDate?: string;
  endDate?: string;
  overdueOnly?: string;
  sortDir?: 'asc' | 'desc';
}
