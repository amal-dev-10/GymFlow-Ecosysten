import type { PlanDTO } from '@/types/plans';

export interface FeatureChange {
  key: string;
  label: string;
  from: string;
  to: string;
}

export interface LimitChange {
  key: string;
  label: string;
  unit: string | null;
  fromType: string;
  fromValue: number | null;
  toType: string;
  toValue: number | null;
}

export interface PlanChangeImpact {
  isUpgrade: boolean;
  isDowngrade: boolean;
  priceDelta: number;
  featuresLost: FeatureChange[];
  featuresGained: FeatureChange[];
  limitsReduced: LimitChange[];
  limitsIncreased: LimitChange[];
  warnings: string[];
}

const FEATURE_RANK: Record<string, number> = { DISABLED: 0, HIDDEN: 0, COMING_SOON: 0, BETA: 1, ENABLED: 2, ENTERPRISE_ONLY: 2 };

// Ranks a resource limit by how much access it grants: DISABLED < LIMITED < UNLIMITED,
// and among LIMITED rows a higher numeric value ranks higher.
function limitRank(limitType: string, limitValue: number | null): number {
  if (limitType === 'DISABLED') return -1;
  if (limitType === 'UNLIMITED') return Number.MAX_SAFE_INTEGER;
  return limitValue ?? 0;
}

export function computePlanChangeImpact(current: PlanDTO, target: PlanDTO): PlanChangeImpact {
  const isUpgrade = target.price > current.price;
  const isDowngrade = target.price < current.price;
  const priceDelta = Math.round((target.price - current.price) * 100) / 100;

  const featuresLost: FeatureChange[] = [];
  const featuresGained: FeatureChange[] = [];
  const currentFeatures = new Map((current.featureAccess || []).map((f) => [f.featureKey, f]));
  const targetFeatures = new Map((target.featureAccess || []).map((f) => [f.featureKey, f]));
  const allFeatureKeys = new Set([...currentFeatures.keys(), ...targetFeatures.keys()]);

  for (const key of allFeatureKeys) {
    const from = currentFeatures.get(key);
    const to = targetFeatures.get(key);
    const fromRank = from ? FEATURE_RANK[from.state] ?? 0 : 0;
    const toRank = to ? FEATURE_RANK[to.state] ?? 0 : 0;
    const label = to?.feature.label || from?.feature.label || key;
    if (toRank < fromRank) featuresLost.push({ key, label, from: from?.state || 'DISABLED', to: to?.state || 'DISABLED' });
    else if (toRank > fromRank) featuresGained.push({ key, label, from: from?.state || 'DISABLED', to: to?.state || 'DISABLED' });
  }

  const limitsReduced: LimitChange[] = [];
  const limitsIncreased: LimitChange[] = [];
  const currentLimits = new Map((current.resourceLimits || []).map((l) => [l.resourceKey, l]));
  const targetLimits = new Map((target.resourceLimits || []).map((l) => [l.resourceKey, l]));
  const allResourceKeys = new Set([...currentLimits.keys(), ...targetLimits.keys()]);

  for (const key of allResourceKeys) {
    const from = currentLimits.get(key);
    const to = targetLimits.get(key);
    const fromRank = from ? limitRank(from.limitType, from.limitValue) : -1;
    const toRank = to ? limitRank(to.limitType, to.limitValue) : -1;
    if (toRank === fromRank) continue;
    const label = to?.resource.label || from?.resource.label || key;
    const unit = to?.resource.unit || from?.resource.unit || null;
    const change: LimitChange = {
      key,
      label,
      unit,
      fromType: from?.limitType || 'DISABLED',
      fromValue: from?.limitValue ?? null,
      toType: to?.limitType || 'DISABLED',
      toValue: to?.limitValue ?? null,
    };
    if (toRank < fromRank) limitsReduced.push(change);
    else limitsIncreased.push(change);
  }

  const warnings: string[] = [];
  if (featuresLost.length > 0) warnings.push(`${featuresLost.length} feature(s) will become unavailable: ${featuresLost.map((f) => f.label).join(', ')}.`);
  if (limitsReduced.length > 0) warnings.push(`${limitsReduced.length} resource limit(s) will be reduced: ${limitsReduced.map((l) => l.label).join(', ')}. Usage already over the new limit will be flagged by the Feature & Limit Engine.`);
  if (isDowngrade) warnings.push('Any active platform overrides on this organization will need to be reviewed — they are not automatically removed by a downgrade.');

  return { isUpgrade, isDowngrade, priceDelta, featuresLost, featuresGained, limitsReduced, limitsIncreased, warnings };
}
