// Shapes for the platform-wide coupon catalog (PLT-006 Coupon Management),
// managed at Commercial → Coupons. Distinct from AppliedCoupon in org360.ts,
// which represents a single redemption against one organization's subscription.

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface CouponDTO {
  id: string;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  currency: string | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  stackable: boolean;
  applicablePlanIds: string[];
  applicablePlans: { id: string; name: string }[];
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
  activeRedemptions: number;
  totalDiscountApplied: number;
}

export interface CouponStatsDTO {
  total: number;
  active: number;
  expired: number;
  totalRedemptions: number;
  totalDiscountGiven: number;
}

export interface CreateCouponInput {
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  currency?: string;
  maxRedemptions?: number;
  stackable?: boolean;
  applicablePlanIds?: string[];
  validUntil?: string;
}

export interface UpdateCouponInput {
  description?: string;
  stackable?: boolean;
  applicablePlanIds?: string[];
  validUntil?: string | null;
  maxRedemptions?: number;
  isActive?: boolean;
}
