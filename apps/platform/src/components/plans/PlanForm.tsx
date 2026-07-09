'use client';

import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { PlanDTO, ResourceDefinitionDTO, FeatureDefinitionDTO, PlanFormInput } from '@/types/plans';
import type { PlanFormState } from './form/types';
import GeneralSection from './form/GeneralSection';
import PricingSection from './form/PricingSection';
import ResourcesSection from './form/ResourcesSection';
import FeaturesSection from './form/FeaturesSection';
import ExperienceSection from './form/ExperienceSection';
import BrandingSection from './form/BrandingSection';
import UpgradeRulesSection from './form/UpgradeRulesSection';

const TABS = ['General', 'Pricing', 'Resources', 'Features', 'Experience', 'Branding', 'Upgrade Rules'] as const;
type Tab = (typeof TABS)[number];

function buildInitialState(plan: PlanDTO | undefined, resourceCatalog: ResourceDefinitionDTO[], featureCatalog: FeatureDefinitionDTO[]): PlanFormState {
  const resourceLimits: PlanFormState['resourceLimits'] = {};
  resourceCatalog.forEach((r) => {
    const existing = plan?.resourceLimits?.find((l) => l.resourceKey === r.key);
    resourceLimits[r.key] = {
      limitType: existing?.limitType || 'DISABLED',
      limitValue: existing?.limitValue != null ? String(existing.limitValue) : '',
    };
  });

  const featureAccess: PlanFormState['featureAccess'] = {};
  featureCatalog.forEach((f) => {
    const existing = plan?.featureAccess?.find((a) => a.featureKey === f.key);
    featureAccess[f.key] = existing?.state || 'DISABLED';
  });

  return {
    name: plan?.name || '',
    internalCode: plan?.internalCode || '',
    description: plan?.description || '',
    badge: plan?.badge || '',
    displayOrder: plan?.displayOrder ?? 0,
    status: plan?.status || 'DRAFT',
    visibility: plan?.visibility || 'PUBLIC',
    price: plan ? String(plan.price) : '0',
    currency: plan?.currency || 'USD',
    billingCycle: plan?.billingCycle || 'MONTHLY',
    trialDays: plan ? String(plan.trialDays) : '0',
    setupFee: plan?.setupFee != null ? String(plan.setupFee) : '',
    taxIncluded: plan?.taxIncluded ?? false,
    isDefault: plan?.isDefault ?? false,
    workspaceExperienceDefault: plan?.workspaceExperienceDefault || 'ESSENTIAL',
    allowExperienceOverride: plan?.allowExperienceOverride ?? true,
    brandingAllowed: plan?.brandingAllowed ?? false,
    brandingConfig: plan?.brandingConfig || {},
    downgradeAllowed: plan?.downgradeAllowed ?? true,
    autoUpgrade: plan?.autoUpgrade ?? false,
    gracePeriodDays: plan ? String(plan.gracePeriodDays) : '0',
    resourceLimits,
    featureAccess,
    upgradeableToPlanIds: plan?.upgradePathsFrom?.map((u) => u.toPlan.id) || [],
  };
}

export function stateToPayload(state: PlanFormState): PlanFormInput {
  return {
    name: state.name,
    internalCode: state.internalCode,
    description: state.description || undefined,
    badge: state.badge || undefined,
    displayOrder: state.displayOrder,
    status: state.status,
    visibility: state.visibility,
    price: Number(state.price) || 0,
    currency: state.currency,
    billingCycle: state.billingCycle,
    trialDays: Number(state.trialDays) || 0,
    setupFee: state.setupFee !== '' ? Number(state.setupFee) : undefined,
    taxIncluded: state.taxIncluded,
    isDefault: state.isDefault,
    workspaceExperienceDefault: state.workspaceExperienceDefault,
    allowExperienceOverride: state.allowExperienceOverride,
    brandingAllowed: state.brandingAllowed,
    brandingConfig: state.brandingAllowed ? state.brandingConfig : undefined,
    downgradeAllowed: state.downgradeAllowed,
    autoUpgrade: state.autoUpgrade,
    gracePeriodDays: Number(state.gracePeriodDays) || 0,
    resourceLimits: Object.entries(state.resourceLimits).map(([resourceKey, v]) => ({
      resourceKey,
      limitType: v.limitType,
      limitValue: v.limitType === 'LIMITED' ? Number(v.limitValue) || 0 : undefined,
    })),
    featureAccess: Object.entries(state.featureAccess).map(([featureKey, stateValue]) => ({ featureKey, state: stateValue })),
    upgradeableToPlanIds: state.upgradeableToPlanIds,
  };
}

interface PlanFormProps {
  mode: 'create' | 'edit';
  initialPlan?: PlanDTO;
  resourceCatalog: ResourceDefinitionDTO[];
  featureCatalog: FeatureDefinitionDTO[];
  otherPlans: PlanDTO[];
  onSubmit: (payload: PlanFormInput) => Promise<void>;
  submitting: boolean;
  errorMsg?: string;
}

export default function PlanForm({ mode, initialPlan, resourceCatalog, featureCatalog, otherPlans, onSubmit, submitting, errorMsg }: PlanFormProps) {
  const [activeTab, setActiveTab] = useState<Tab>('General');
  const [state, setState] = useState<PlanFormState>(() => buildInitialState(initialPlan, resourceCatalog, featureCatalog));

  const update = <K extends keyof PlanFormState>(key: K, value: PlanFormState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const isValid = useMemo(() => state.name.trim().length > 0 && state.internalCode.trim().length > 0, [state.name, state.internalCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    await onSubmit(stateToPayload(state));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-800/60">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-2 text-xs font-bold whitespace-nowrap rounded-t-lg transition-colors ${
              activeTab === tab ? 'text-indigo-300 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-semibold">{errorMsg}</div>
      )}

      <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-5">
        {activeTab === 'General' && <GeneralSection state={state} update={update} />}
        {activeTab === 'Pricing' && <PricingSection state={state} update={update} />}
        {activeTab === 'Resources' && <ResourcesSection state={state} update={update} catalog={resourceCatalog} />}
        {activeTab === 'Features' && <FeaturesSection state={state} update={update} catalog={featureCatalog} />}
        {activeTab === 'Experience' && <ExperienceSection state={state} update={update} />}
        {activeTab === 'Branding' && <BrandingSection state={state} update={update} />}
        {activeTab === 'Upgrade Rules' && <UpgradeRulesSection state={state} update={update} otherPlans={otherPlans} />}
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={!isValid || submitting}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? <RefreshCw className="animate-spin" size={13} /> : mode === 'create' ? 'Create Plan' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
