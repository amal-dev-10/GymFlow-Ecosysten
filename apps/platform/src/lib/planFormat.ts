import type { BillingCycle } from '@/types/plans';

export const BILLING_CYCLE_LABEL: Record<BillingCycle, string> = {
  FREE: 'Free',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  HALF_YEARLY: 'Half-Yearly',
  YEARLY: 'Yearly',
  ENTERPRISE: 'Enterprise',
  CUSTOM: 'Custom',
};

export function formatPrice(price: number, currency: string): string {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price);
}

export function formatPriceWithCycle(price: number, currency: string, billingCycle: BillingCycle): string {
  const priceLabel = formatPrice(price, currency);
  if (price === 0 || billingCycle === 'ENTERPRISE' || billingCycle === 'CUSTOM') return priceLabel;
  const suffix: Partial<Record<BillingCycle, string>> = {
    MONTHLY: '/mo',
    QUARTERLY: '/qtr',
    HALF_YEARLY: '/6mo',
    YEARLY: '/yr',
  };
  return `${priceLabel}${suffix[billingCycle] || ''}`;
}
