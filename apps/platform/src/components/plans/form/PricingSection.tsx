'use client';

import type { SectionProps } from './types';
import { labelClass, inputClass, selectClass, sectionTitleClass } from './formStyles';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'];

export default function PricingSection({ state, update }: SectionProps) {
  const isFree = state.billingCycle === 'FREE';

  return (
    <div>
      <h3 className={sectionTitleClass}>Pricing</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Billing Cycle</label>
          <select
            value={state.billingCycle}
            onChange={(e) => update('billingCycle', e.target.value as any)}
            className={selectClass}
          >
            <option value="FREE">Free</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="HALF_YEARLY">Half-Yearly</option>
            <option value="YEARLY">Yearly</option>
            <option value="ENTERPRISE">Enterprise</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Currency</label>
          <select value={state.currency} onChange={(e) => update('currency', e.target.value)} disabled={isFree} className={selectClass}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Price</label>
          <input
            type="number"
            min={0}
            value={state.price}
            onChange={(e) => update('price', e.target.value)}
            disabled={isFree}
            className={inputClass}
            placeholder="0"
          />
        </div>
        <div>
          <label className={labelClass}>Setup Fee</label>
          <input
            type="number"
            min={0}
            value={state.setupFee}
            onChange={(e) => update('setupFee', e.target.value)}
            className={inputClass}
            placeholder="0"
          />
        </div>

        <div>
          <label className={labelClass}>Trial Days</label>
          <input
            type="number"
            min={0}
            value={state.trialDays}
            onChange={(e) => update('trialDays', e.target.value)}
            className={inputClass}
            placeholder="0"
          />
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer mt-6">
          <input type="checkbox" checked={state.taxIncluded} onChange={(e) => update('taxIncluded', e.target.checked)} className="accent-indigo-500 w-4 h-4" />
          <span className="text-xs text-slate-300">Tax included in price</span>
        </label>
      </div>
    </div>
  );
}
