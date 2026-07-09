// Shapes mirror the apps/api platform-plans module (SubscriptionPlan + related
// catalog/config tables). Kept in one place so every plans screen agrees on shape.

export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type PlanVisibility = 'PUBLIC' | 'PRIVATE' | 'INTERNAL';
export type BillingCycle = 'FREE' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'ENTERPRISE' | 'CUSTOM';
export type WorkspaceExperience = 'ESSENTIAL' | 'PROFESSIONAL' | 'EXPERT';
export type ResourceLimitType = 'LIMITED' | 'UNLIMITED' | 'DISABLED';
export type FeatureState = 'ENABLED' | 'DISABLED' | 'BETA' | 'ENTERPRISE_ONLY' | 'HIDDEN' | 'COMING_SOON';
export type PlanChangeType = 'CREATED' | 'UPDATED' | 'PRICING_CHANGED' | 'FEATURE_CHANGED' | 'LIMIT_CHANGED' | 'ARCHIVED' | 'RESTORED';
export type PlatformRole = 'SUPER_ADMIN' | 'OPERATIONS' | 'FINANCE' | 'SALES' | 'SUPPORT' | 'DEVELOPER' | 'MARKETING' | 'CUSTOMER_SUCCESS';

export interface ResourceDefinitionDTO {
  key: string;
  label: string;
  unit: string | null;
  category: string;
  description: string | null;
}

export interface FeatureDefinitionDTO {
  key: string;
  label: string;
  category: string;
  description: string | null;
}

export interface PlanResourceLimitDTO {
  id: string;
  planId: string;
  resourceKey: string;
  limitType: ResourceLimitType;
  limitValue: number | null;
  resource: ResourceDefinitionDTO;
}

export interface PlanFeatureAccessDTO {
  id: string;
  planId: string;
  featureKey: string;
  state: FeatureState;
  feature: FeatureDefinitionDTO;
}

export interface BrandingConfig {
  primaryColor?: string;
  accentColor?: string;
  customLogo?: boolean;
  customDomain?: boolean;
  emailBranding?: boolean;
}

export interface PlanUpgradePathDTO {
  id: string;
  toPlan: { id: string; name: string; status: PlanStatus };
}

export interface OrganizationUsageDTO {
  id: string;
  organizationId: string;
  status: string;
  startDate: string;
  endDate: string;
  trialStartDate: string | null;
  trialEndDate: string | null;
  organization: { id: string; name: string; slug: string };
}

export interface PlanDTO {
  id: string;
  name: string;
  internalCode: string;
  description: string | null;
  badge: string | null;
  displayOrder: number;
  status: PlanStatus;
  visibility: PlanVisibility;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  trialDays: number;
  setupFee: number | null;
  taxIncluded: boolean;
  version: number;
  isDefault: boolean;
  workspaceExperienceDefault: WorkspaceExperience;
  allowExperienceOverride: boolean;
  brandingAllowed: boolean;
  brandingConfig: BrandingConfig | null;
  downgradeAllowed: boolean;
  autoUpgrade: boolean;
  gracePeriodDays: number;
  trialConversionPlanId: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  organizationCount?: number;
  resourceLimits?: PlanResourceLimitDTO[];
  featureAccess?: PlanFeatureAccessDTO[];
  upgradePathsFrom?: PlanUpgradePathDTO[];
  organizationSubscriptions?: OrganizationUsageDTO[];
}

export interface PlanStatsDTO {
  totalPlans: number;
  activePlans: number;
  draftPlans: number;
  organizationsUsingPlans: number;
  mostPopularPlan: { id: string; name: string; organizationCount: number } | null;
  mrrByPlan: number;
}

export interface PlanVersionHistoryDTO {
  id: string;
  planId: string;
  version: number;
  changeType: PlanChangeType;
  summary: string;
  changedByUserId: string | null;
  createdAt: string;
}

export interface PlanAuditLogDTO {
  id: string;
  action: string;
  user: string;
  details: string;
  eventType: string | null;
  createdAt: string;
}

export interface ResourceLimitInput {
  resourceKey: string;
  limitType: ResourceLimitType;
  limitValue?: number;
}

export interface FeatureAccessInput {
  featureKey: string;
  state: FeatureState;
}

export interface PlanFormInput {
  name: string;
  internalCode: string;
  description?: string;
  badge?: string;
  displayOrder?: number;
  status?: PlanStatus;
  visibility?: PlanVisibility;
  price: number;
  currency?: string;
  billingCycle: BillingCycle;
  trialDays?: number;
  setupFee?: number;
  taxIncluded?: boolean;
  isDefault?: boolean;
  workspaceExperienceDefault?: WorkspaceExperience;
  allowExperienceOverride?: boolean;
  brandingAllowed?: boolean;
  brandingConfig?: BrandingConfig;
  downgradeAllowed?: boolean;
  autoUpgrade?: boolean;
  gracePeriodDays?: number;
  trialConversionPlanId?: string;
  resourceLimits?: ResourceLimitInput[];
  featureAccess?: FeatureAccessInput[];
  upgradeableToPlanIds?: string[];
}
