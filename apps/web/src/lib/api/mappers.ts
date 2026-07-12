import { API_BASE_URL } from './client';

export interface MemberCheckIn {
  id: string;
  name: string;
  memberId: string;
  phone: string;
  status: 'Active' | 'Expired' | 'Frozen' | 'Suspended';
  homeBranchId: string;
  homeBranchName: string;
  allowedBranchIds: string[];
  planName: string;
  expiryDate: string;
  trainerName?: string;
  outstandingDues: number;
  remainingVisits?: number;
  visitLimitType?: 'Unlimited' | 'Limited';
}

/**
 * Maps raw member API records into the local MemberCheckIn shape used by the
 * attendance terminal UI. Reads the real outstandingDues from the member's
 * active subscription rather than hardcoding it.
 */
export function mapApiMembersToLocal(apiMembers: any[], branchList: any[]): MemberCheckIn[] {
  return (apiMembers || []).map((m: any) => {
    const sub = m.memberMemberships?.[0] || m.memberships?.[0];
    return {
      id: m.id,
      name: `${m.firstName} ${m.lastName}`,
      memberId: m.id,
      phone: m.phoneNumber,
      status: sub ? (sub.status as any) : 'Expired',
      homeBranchId: m.homeGymId,
      homeBranchName: m.homeGym?.name || 'Home Branch',
      allowedBranchIds: sub
        ? sub.membershipPlan?.branchAccess === 'all'
          ? branchList.map((b: any) => b.id)
          : sub.membershipPlan?.branchAccess?.split(',').map((s: string) => s.trim()) || []
        : [m.homeGymId],
      planName: sub ? sub.membershipPlan?.name : 'No Active Plan',
      expiryDate: sub ? new Date(sub.endDate).toISOString().split('T')[0] : 'N/A',
      trainerName: 'Trainer Frank',
      outstandingDues: sub ? Number(sub.outstandingDues) || 0 : 0,
      visitLimitType: 'Unlimited' as const,
    };
  });
}

export interface PublicPlan {
  id: string;
  name: string;
  description: string | null;
  badge: string | null;
  displayOrder: number;
  price: number;
  currency: string;
  billingCycle: string;
  trialDays: number;
  setupFee: number | null;
  features: { key: string; label: string; category: string; description: string | null }[];
  limits: { key: string; label: string; unit: string | null; category: string; limitType: string; limitValue: number | null }[];
}

export interface PricingTier {
  id: string;
  name: string;
  price: string;
  period: string;
  tagline: string;
  cta: string;
  featured: boolean;
  badgeText: string | null;
  trialDays: number;
  features: string[];
}

function formatPlanPrice(price: number, currency: string): string {
  if (price === 0) return 'Free';
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : `${currency} `;
  return `${symbol}${Math.round(price)}`;
}

function billingPeriodLabel(billingCycle: string): string {
  switch (billingCycle) {
    case 'MONTHLY':
      return '/mo';
    case 'QUARTERLY':
      return '/qtr';
    case 'HALF_YEARLY':
      return '/6mo';
    case 'YEARLY':
      return '/yr';
    default:
      return '';
  }
}

/**
 * Maps platform-admin-configured subscription plans (from /v1/public/plans)
 * into the pricing-card shape the landing page renders. Featured plan is
 * whichever plan has a badge like "Most Popular"; if no plan admin-tagged
 * itself that way, the middle plan is highlighted as a reasonable default.
 */
export function mapPublicPlansToPricingTiers(plans: PublicPlan[]): PricingTier[] {
  const sorted = [...(plans || [])].sort((a, b) => a.displayOrder - b.displayOrder || a.price - b.price);
  const hasExplicitFeatured = sorted.some((p) => p.badge && /popular|recommended|best value/i.test(p.badge));

  return sorted.map((plan, i) => {
    const isCustom = plan.billingCycle === 'ENTERPRISE' || plan.billingCycle === 'CUSTOM';
    const isFree = plan.price === 0;
    const featured = hasExplicitFeatured
      ? !!(plan.badge && /popular|recommended|best value/i.test(plan.badge))
      : sorted.length > 1 && i === Math.floor((sorted.length - 1) / 2);

    return {
      id: plan.id,
      name: plan.name,
      price: isCustom ? 'Custom' : formatPlanPrice(plan.price, plan.currency),
      period: isCustom || isFree ? '' : billingPeriodLabel(plan.billingCycle),
      tagline: plan.description || '',
      cta: isCustom ? 'Contact Sales' : plan.trialDays > 0 ? 'Start Free Trial' : 'Get Started',
      featured,
      badgeText: featured ? plan.badge || 'Most Popular' : null,
      trialDays: plan.trialDays,
      features: plan.features.map((f) => f.label),
    };
  });
}

export interface PublicBrand {
  platformName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  website: string | null;
  primaryColor: string;
  accentColor: string;
}

/**
 * Resolves an asset path returned by the API (e.g. "/uploads/branding/x.png")
 * into an absolute URL the browser can load. Already-absolute URLs pass through.
 */
export function resolveAssetUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Derives a short logo-mark fallback (e.g. "GymFlow Pro" -> "GP") for when
 * no logo image has been uploaded in platform admin branding settings.
 */
export function getBrandInitials(name: string): string {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const word = words[0] || 'G';
  const humps = word.match(/[A-Z]/g);
  if (humps && humps.length >= 2) return (humps[0] + humps[1]).toUpperCase();
  return word.slice(0, 2).toUpperCase();
}

export interface SubscriptionFeature {
  key: string;
  label: string;
  category: string;
  enabled: boolean;
}

export interface SubscriptionLimit {
  key: string;
  label: string;
  unit: string | null;
  category: string;
  limitType: 'LIMITED' | 'UNLIMITED' | 'DISABLED';
  limitValue: number | null;
  currentValue: number;
}

export interface CurrentSubscription {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  trialStartDate: string | null;
  trialEndDate: string | null;
  autoRenew: boolean;
  plan: {
    id: string;
    name: string;
    description: string | null;
    badge: string | null;
    price: number;
    currency: string;
    billingCycle: string;
    trialDays: number;
  };
  features: SubscriptionFeature[];
  limits: SubscriptionLimit[];
}

/** Flattens the raw /v1/subscriptions/active response into the shape the UI renders. */
export function mapCurrentSubscription(raw: any): CurrentSubscription {
  const usageByKey = new Map<string, number>((raw.usages || []).map((u: any) => [u.featureName, u.currentValue]));
  return {
    id: raw.id,
    status: raw.status,
    startDate: raw.startDate,
    endDate: raw.endDate,
    trialStartDate: raw.trialStartDate,
    trialEndDate: raw.trialEndDate,
    autoRenew: raw.autoRenew,
    plan: {
      id: raw.plan.id,
      name: raw.plan.name,
      description: raw.plan.description,
      badge: raw.plan.badge,
      price: raw.plan.price,
      currency: raw.plan.currency,
      billingCycle: raw.plan.billingCycle,
      trialDays: raw.plan.trialDays,
    },
    features: (raw.plan.featureAccess || []).map((fa: any) => ({
      key: fa.feature.key,
      label: fa.feature.label,
      category: fa.feature.category,
      enabled: fa.state === 'ENABLED' || fa.state === 'BETA',
    })),
    limits: (raw.plan.resourceLimits || []).map((rl: any) => ({
      key: rl.resource.key,
      label: rl.resource.label,
      unit: rl.resource.unit,
      category: rl.resource.category,
      limitType: rl.limitType,
      limitValue: rl.limitValue,
      currentValue: usageByKey.get(rl.resourceKey) || 0,
    })),
  };
}
