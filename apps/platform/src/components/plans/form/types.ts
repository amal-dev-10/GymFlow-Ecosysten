import type {
  PlanStatus,
  PlanVisibility,
  BillingCycle,
  WorkspaceExperience,
  ResourceLimitType,
  FeatureState,
  BrandingConfig,
} from '@/types/plans';

export interface PlanFormState {
  name: string;
  internalCode: string;
  description: string;
  badge: string;
  displayOrder: number;
  status: PlanStatus;
  visibility: PlanVisibility;
  price: string;
  currency: string;
  billingCycle: BillingCycle;
  trialDays: string;
  setupFee: string;
  taxIncluded: boolean;
  isDefault: boolean;
  workspaceExperienceDefault: WorkspaceExperience;
  allowExperienceOverride: boolean;
  brandingAllowed: boolean;
  brandingConfig: BrandingConfig;
  downgradeAllowed: boolean;
  autoUpgrade: boolean;
  gracePeriodDays: string;
  resourceLimits: Record<string, { limitType: ResourceLimitType; limitValue: string }>;
  featureAccess: Record<string, FeatureState>;
  upgradeableToPlanIds: string[];
}

export type SectionProps = {
  state: PlanFormState;
  update: <K extends keyof PlanFormState>(key: K, value: PlanFormState[K]) => void;
};
