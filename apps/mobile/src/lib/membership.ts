// Plan pricing + duration helpers, shared by the sell/renew flow.
//
// Pricing here MUST stay consistent with billing's `subscriptionToInvoice`
// (src/lib/api.ts): total = (basePrice + joiningFee) + tax, where
// tax = round(subtotal * (taxPercentage || 0) / 100). Collecting the full
// total up front then reads back as a "Paid" invoice with zero dues; collecting
// less creates real outstanding dues (derived as planTotal - amountPaid).

export interface PlanLike {
  basePrice?: number;
  joiningFee?: number;
  taxPercentage?: number;
  durationType?: string;
  durationValue?: number;
}

/** endDate = startDate advanced by the plan's duration (days/weeks/months/years). */
export function computeEndDate(startISO: string, plan: PlanLike): string {
  const start = new Date(startISO);
  const val = plan.durationValue || 0;
  const type = (plan.durationType || 'day').toLowerCase();
  if (type.includes('month')) start.setMonth(start.getMonth() + val);
  else if (type.includes('week')) start.setDate(start.getDate() + val * 7);
  else if (type.includes('year')) start.setFullYear(start.getFullYear() + val);
  else start.setDate(start.getDate() + val);
  return start.toISOString().split('T')[0];
}

export interface Pricing {
  base: number;
  joiningFee: number;
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
}

export function computePricing(plan: PlanLike): Pricing {
  const base = plan.basePrice || 0;
  const joiningFee = plan.joiningFee || 0;
  const subtotal = base + joiningFee;
  const taxRate = plan.taxPercentage && plan.taxPercentage > 0 ? plan.taxPercentage : 0;
  const tax = Math.round((subtotal * taxRate) / 100);
  return { base, joiningFee, subtotal, taxRate, tax, total: subtotal + tax };
}

export function planDurationLabel(plan: PlanLike): string {
  const val = plan.durationValue || 0;
  const type = plan.durationType || 'days';
  return `${val} ${type}`.trim();
}
