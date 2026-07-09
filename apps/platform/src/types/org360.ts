// Shapes for the Organization 360 workspace (PLT-005), mirroring
// apps/api/src/modules/platform-organizations/platform-org-detail.service.ts.

import type { DerivedStatus, PlatformStatus, HealthBand, PaymentStatus, WorkspaceExperience, UsageMetric, OrgHealth } from './organizations';

export type { DerivedStatus, PlatformStatus, HealthBand, PaymentStatus, WorkspaceExperience, UsageMetric, OrgHealth };

export interface OrgAlert {
  level: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
}

export interface OrgRecommendation {
  title: string;
  detail: string;
  action?: string;
}

export interface TimelineEvent {
  id: string;
  type: string;
  icon: string;
  title: string;
  detail?: string;
  user?: string;
  at: string;
}

export interface Org360Overview {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  status: DerivedStatus;
  platformStatus: PlatformStatus;
  workspaceExperience: WorkspaceExperience;
  createdAt: string;
  region: string;
  country: string | null;
  timezone: string | null;
  language: string | null;
  currency: string | null;
  suspendReason: string | null;
  owner: { id: string; name: string; email: string | null; phone: string } | null;
  businessType: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  plan: { id: string; name: string; billingCycle: string; price: number; currency: string } | null;
  subscriptionStatus: string;
  trialEndDate: string | null;
  renewalDate: string | null;
  paymentStatus: PaymentStatus;
  kpis: {
    branches: UsageMetric;
    members: UsageMetric;
    users: UsageMetric;
    storage: UsageMetric;
    monthlyRevenue: number;
    health: OrgHealth;
    lastActivity: string | null;
  };
  health: OrgHealth;
  recentActivity: TimelineEvent[];
  alerts: OrgAlert[];
  recommendations: OrgRecommendation[];
}

export interface Org360Payment {
  id: string;
  amount: number;
  status: string;
  method: string;
  refundedAmount?: number | null;
  refundedAt?: string | null;
  refundReason?: string | null;
  createdAt: string;
}

export interface Org360Invoice {
  id: string;
  amount: number;
  status: string;
  description?: string | null;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  payments?: Org360Payment[];
  planName?: string;
}

export interface AppliedCoupon {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  discountApplied: number;
  stackable: boolean;
  redeemedAt: string;
  removedAt: string | null;
  active: boolean;
}

export interface SubscriptionTimelineEvent {
  id: string;
  type: string;
  icon: string;
  title: string;
  detail?: string;
  user?: string;
  at: string;
}

export interface SubscriptionNotification {
  level: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
}

export interface Org360Subscription {
  hasSubscription: boolean;
  subscriptionId: string | null;
  plan: { id: string; name: string; description: string | null; price: number; currency: string; billingCycle: string; workspaceExperienceDefault: WorkspaceExperience } | null;
  status: string;
  isTrial: boolean;
  trialEndDate: string | null;
  trialDaysLeft: number | null;
  startDate: string | null;
  renewalDate: string | null;
  billingCycle: string | null;
  effectivePrice: number;
  monthlyRevenue: number;
  paymentStatus: PaymentStatus;
  autoRenew: boolean;
  paymentMethod: string | null;
  pausedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  graceUntil: string | null;
  graceDaysLeft: number | null;
  isEnterpriseCustom: boolean;
  customPrice: number | null;
  privateNotes: string | null;
  dedicatedSupportContact: string | null;
  customSlaTerms: string | null;
  invoices: Org360Invoice[];
  coupons: AppliedCoupon[];
  timeline: SubscriptionTimelineEvent[];
  notifications: SubscriptionNotification[];
}

export interface UsageTrend {
  series: { label: string; key: string; members: number; branches: number }[];
  growthRate: number;
}

export interface Org360Branch {
  id: string;
  name: string;
  code: string | null;
  status: string;
  capacity: number;
  members: number;
  employees: number;
  attendanceThisMonth: number;
  manager: string | null;
  city: string | null;
  createdAt: string;
}

export interface Org360User {
  id: string;
  membershipId: string;
  name: string;
  email: string | null;
  phone: string;
  role: string;
  isOwner: boolean;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export interface Org360Billing {
  summary: {
    totalPaid: number;
    outstanding: number;
    invoiceCount: number;
    failedPayments: number;
    refunds: number;
    autoRenew: boolean;
    taxRegion: string;
  };
  invoices: Org360Invoice[];
  payments: { id: string; invoiceId: string; amount: number; status: string; method: string; createdAt: string }[];
}

export interface Org360AuditPage {
  data: { id: string; action: string; user: string; details: string; eventType: string | null; eventCategory: string | null; createdAt: string }[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  categories: string[];
}

export type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type SupportTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface SupportTicket {
  id: string;
  subject: string;
  description: string | null;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  category: string | null;
  assignedEngineer: string | null;
  satisfactionScore: number | null;
  internalNotes: string | null;
  createdByName: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface Org360Support {
  tickets: SupportTicket[];
  summary: { open: number; closed: number; urgent: number; avgCsat: number | null };
}

export interface Org360Settings {
  language: string | null;
  timezone: string | null;
  dateFormat: string | null;
  currency: string | null;
  settings: Record<string, unknown>;
  workspaceExperienceDefault: WorkspaceExperience;
  workspaceExperienceOverride: WorkspaceExperience | null;
  effectiveWorkspaceExperience: WorkspaceExperience;
  platformOverrides: { id: string; scope: string; target: string; overrideType: string; reason: string; expiresAt: string | null }[];
}
