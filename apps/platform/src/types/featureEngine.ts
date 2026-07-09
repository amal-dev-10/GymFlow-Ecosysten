// Shapes mirror apps/api/src/modules/feature-engine (Feature & Limit Engine,
// PLT-003) - the single source of truth every other GymFlow module should
// query instead of checking subscription plans directly.

import type { PlanStatus, WorkspaceExperience, ResourceLimitType, FeatureState } from './plans';

export type { WorkspaceExperience, ResourceLimitType, FeatureState };
export type OverrideScope = 'FEATURE' | 'RESOURCE';
export type OverrideType = 'TEMPORARY' | 'PERMANENT' | 'EMERGENCY';
export type OverrideStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';
export type ViolationSeverity = 'warning' | 'exceeded';

export interface EngineDashboardDTO {
  organizationsUsingEngine: number;
  activeRules: number;
  enabledFeatures: number;
  disabledFeatures: number;
  unlimitedResources: number;
  ruleViolationsToday: number;
  featureUsageToday: number;
  limitWarnings: number;
  overridesActive: number;
}

interface PlanRef {
  id: string;
  name: string;
  status: PlanStatus;
}

export interface FeatureStateSummary {
  enabled: number;
  beta: number;
  enterpriseOnly: number;
  disabled: number;
  hidden: number;
  comingSoon: number;
}

export interface LimitTypeSummary {
  limited: number;
  unlimited: number;
  disabled: number;
}

export interface PlanFeatureAccessRowDTO {
  id: string;
  planId: string;
  featureKey: string;
  state: FeatureState;
  plan: PlanRef;
}

export interface FeatureDependencyRefDTO {
  id: string;
  requiresFeature?: { key: string; label: string };
  feature?: { key: string; label: string };
}

export interface FeatureCatalogItemDTO {
  key: string;
  label: string;
  category: string;
  description: string | null;
  createdAt: string;
  planAccess: PlanFeatureAccessRowDTO[];
  dependsOn: FeatureDependencyRefDTO[];
  requiredFor: FeatureDependencyRefDTO[];
  stateSummary: FeatureStateSummary;
}

export interface PlanResourceLimitRowDTO {
  id: string;
  planId: string;
  resourceKey: string;
  limitType: ResourceLimitType;
  limitValue: number | null;
  warningThresholdValue: number | null;
  graceDays: number;
  autoSuspendEnabled: boolean;
  autoUpgradeRecommend: boolean;
  displayUpgradeBanner: boolean;
  plan: PlanRef;
}

export interface ResourceCatalogItemDTO {
  key: string;
  label: string;
  unit: string | null;
  category: string;
  description: string | null;
  createdAt: string;
  planLimits: PlanResourceLimitRowDTO[];
  limitSummary: LimitTypeSummary;
}

export interface FeatureMatrixDTO {
  plans: Array<{ id: string; name: string; status: PlanStatus; featureAccess: Array<{ featureKey: string; state: FeatureState }> }>;
  features: Array<{ key: string; label: string; category: string }>;
}

export interface ResourceMatrixDTO {
  plans: Array<{ id: string; name: string; status: PlanStatus; resourceLimits: Array<{ resourceKey: string; limitType: ResourceLimitType; limitValue: number | null }> }>;
  resources: Array<{ key: string; label: string; unit: string | null; category: string }>;
}

export interface WorkspaceExperiencePlanDTO {
  id: string;
  name: string;
  status: PlanStatus;
  workspaceExperienceDefault: WorkspaceExperience;
  allowExperienceOverride: boolean;
}

export interface WorkspaceExperienceOverrideRowDTO {
  id: string;
  organizationId: string;
  workspaceExperienceOverride: WorkspaceExperience;
  organization: { id: string; name: string };
  plan: { id: string; name: string; workspaceExperienceDefault: WorkspaceExperience };
}

export interface WorkspaceExperienceOverviewDTO {
  plans: WorkspaceExperiencePlanDTO[];
  organizationOverrides: WorkspaceExperienceOverrideRowDTO[];
}

export interface OrganizationUsageSummaryDTO {
  subscriptionId: string;
  organization: { id: string; name: string; slug: string };
  plan: PlanRef;
  status: string;
  workspaceExperienceOverride: WorkspaceExperience | null;
  violationCount: number;
  warningCount: number;
}

export interface ResourceUsageDTO {
  resourceKey: string;
  label: string;
  unit: string | null;
  category: string;
  limitType: ResourceLimitType;
  limitValue: number | null;
  used: number;
  warningThresholdValue: number | null;
  displayUpgradeBanner: boolean;
  overridden: boolean;
  percentUsed: number | null;
}

export interface FeatureAccessEffectiveDTO {
  featureKey: string;
  label: string;
  category: string;
  state: FeatureState;
  overridden: boolean;
}

export interface ViolationDTO {
  organizationId: string;
  organizationName: string;
  scope: 'RESOURCE';
  resourceKey: string;
  label: string;
  limitValue: number;
  used: number;
  exceededBy: number;
  severity: ViolationSeverity;
  action: string;
}

export interface EngineOverrideDTO {
  id: string;
  organizationId: string;
  scope: OverrideScope;
  featureKey: string | null;
  resourceKey: string | null;
  overrideType: OverrideType;
  status: OverrideStatus;
  featureState: FeatureState | null;
  limitType: ResourceLimitType | null;
  limitValue: number | null;
  reason: string;
  approverName: string | null;
  createdByUserId: string;
  createdByName: string;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedByName: string | null;
  createdAt: string;
  updatedAt: string;
  organization: { id: string; name: string };
  feature: { key: string; label: string } | null;
  resource: { key: string; label: string } | null;
}

export interface UpgradeRecommendationDTO {
  currentPlan: { id: string; name: string; price: number };
  recommendedPlan: { id: string; name: string; price: number; currency: string; billingCycle: string };
  reason: string;
  benefits: Array<{ resourceKey: string; label: string; newLimit: string | number | undefined }>;
  newLimits: Array<{ resourceKey: string; label: string; newLimit: string | number | undefined }>;
  estimatedCost: number;
}

export interface OrganizationDetailDTO {
  organization: { id: string; name: string; slug: string };
  subscription: { id: string; status: string; startDate: string; endDate: string; workspaceExperienceOverride: WorkspaceExperience | null };
  plan: { id: string; name: string; status: PlanStatus; workspaceExperienceDefault: WorkspaceExperience };
  effectiveWorkspaceExperience: WorkspaceExperience;
  usage: ResourceUsageDTO[];
  featureAccess: FeatureAccessEffectiveDTO[];
  overrides: EngineOverrideDTO[];
  violations: ViolationDTO[];
  upgradeRecommendation: UpgradeRecommendationDTO | null;
}

export interface EngineAuditLogDTO {
  id: string;
  action: string;
  user: string;
  details: string;
  eventType: string | null;
  entityType: string | null;
  entityId: string | null;
  organizationId: string | null;
  createdAt: string;
}

export interface EngineAuditLogPageDTO {
  data: EngineAuditLogDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EvaluateFeatureResultDTO {
  organizationId: string;
  featureKey: string;
  allowed: boolean;
  state: FeatureState;
  source: 'override' | 'plan';
  missingDependencies: string[];
  reason: string;
}

export interface EvaluateResourceResultDTO {
  organizationId: string;
  resourceKey: string;
  allowed: boolean;
  warning: boolean;
  limitType: ResourceLimitType;
  limitValue: number | null;
  used: number;
  remaining: number | null;
  source: 'override' | 'plan';
  reason: string;
}

export interface DeveloperPreviewDTO {
  request: { organizationId: string; featureKey?: string; resourceKey?: string };
  configuration: { planId: string; subscriptionStatus: string } | null;
  featureEvaluation: EvaluateFeatureResultDTO | null;
  resourceEvaluation: EvaluateResourceResultDTO | null;
  sampleRequests: Array<{ method: string; path: string; body: Record<string, unknown> }>;
}

// --- Mutation inputs ---

export interface CreateFeatureInput {
  key: string;
  label: string;
  category?: string;
  description?: string;
}

export interface UpdateFeatureInput {
  label?: string;
  category?: string;
  description?: string;
}

export interface CreateResourceInput {
  key: string;
  label: string;
  unit?: string;
  category?: string;
  description?: string;
}

export interface UpdateResourceInput {
  label?: string;
  unit?: string;
  category?: string;
  description?: string;
}

export interface CreateFeatureDependencyInput {
  featureKey: string;
  requiresFeatureKey: string;
}

export interface UpdateValidationRuleInput {
  warningThresholdValue?: number | null;
  graceDays?: number;
  autoSuspendEnabled?: boolean;
  autoUpgradeRecommend?: boolean;
  displayUpgradeBanner?: boolean;
}

export interface CreateOverrideInput {
  organizationId: string;
  scope: OverrideScope;
  featureKey?: string;
  resourceKey?: string;
  overrideType: OverrideType;
  featureState?: FeatureState;
  limitType?: ResourceLimitType;
  limitValue?: number;
  reason: string;
  approverName?: string;
  expiresAt?: string;
}

export interface SetWorkspaceExperienceOverrideInput {
  workspaceExperienceOverride?: WorkspaceExperience | null;
}
