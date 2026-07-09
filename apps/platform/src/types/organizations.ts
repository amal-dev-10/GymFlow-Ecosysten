// Shapes mirror apps/api/src/modules/platform-organizations (PLT-004). This is
// the Platform Administration view of customer organizations - distinct from the
// tenant-scoped org types used inside the workspace app.

export type PlatformStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
export type DerivedStatus = 'ACTIVE' | 'TRIAL' | 'GRACE_PERIOD' | 'PAUSED' | 'PENDING_PAYMENT' | 'SUSPENDED' | 'EXPIRED' | 'ARCHIVED';
export type HealthBand = 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
export type PaymentStatus = 'PAID' | 'FAILED' | 'NONE';
export type WorkspaceExperience = 'ESSENTIAL' | 'PROFESSIONAL' | 'EXPERT';

export interface UsageMetric {
  used: number;
  limit: number | null; // null = unlimited
  unit?: string;
}

export interface OrgHealth {
  score: number;
  band: HealthBand;
  reasons: string[];
}

export interface OrganizationRowDTO {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  businessType: string | null;
  country: string | null;
  timezone: string | null;
  email: string | null;
  phone: string | null;
  platformStatus: PlatformStatus;
  createdAt: string;
  lastActiveAt: string | null;
  suspendReason: string | null;
  owner: { id: string; name: string; email: string | null; phone: string } | null;
  plan: { id: string; name: string; billingCycle: string } | null;
  subscriptionStatus: string;
  derivedStatus: DerivedStatus;
  paymentStatus: PaymentStatus;
  isEnterprise: boolean;
  workspaceExperience: WorkspaceExperience;
  trialEndDate: string | null;
  subscriptionEndDate: string | null;
  usage: {
    members: UsageMetric;
    branches: UsageMetric;
    users: UsageMetric;
    storage: UsageMetric;
  };
  health: OrgHealth;
}

export interface OrganizationListResponse {
  data: OrganizationRowDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrganizationStatsDTO {
  total: number;
  active: number;
  trial: number;
  suspended: number;
  expired: number;
  enterprise: number;
  newThisMonth: number;
  averageHealthScore: number;
}

interface InsightBase {
  id: string;
  name: string;
  logoUrl: string | null;
  plan: string | null;
  health: OrgHealth;
  derivedStatus: DerivedStatus;
}

export interface OrganizationInsightsDTO {
  fastestGrowing: (InsightBase & { members: number })[];
  inactive: (InsightBase & { lastActiveAt: string | null })[];
  nearLimits: (InsightBase & { members: number; limit: number | null })[];
  trialExpiringSoon: (InsightBase & { trialEndDate: string | null })[];
  failedPayments: (InsightBase & { subscriptionStatus: string })[];
  requiringAttention: (InsightBase & { reasons: string[] })[];
}

export interface OrganizationListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  derivedStatus?: string;
  planId?: string;
  subscriptionStatus?: string;
  experience?: string;
  country?: string;
  health?: string;
  trial?: string;
  enterprise?: string;
  minMembers?: number;
  minBranches?: number;
  sortBy?: string;
  sortDir?: string;
}

export interface BulkActionInput {
  organizationIds: string[];
  action: 'suspend' | 'activate' | 'archive' | 'assign_plan' | 'notify';
  planId?: string;
  reason?: string;
}

export interface ImpersonateResultDTO {
  organizationId: string;
  organizationName: string;
  slug: string;
  owner: { id: string; name: string; email: string | null } | null;
  impersonatedByRole: string;
  startedAt: string;
  workspaceUrl: string;
}
