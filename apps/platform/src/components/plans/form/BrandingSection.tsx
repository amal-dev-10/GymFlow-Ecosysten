'use client';

import type { SectionProps } from './types';
import { labelClass, inputClass, sectionTitleClass } from './formStyles';

export default function BrandingSection({ state, update }: SectionProps) {
  const setBranding = (key: keyof typeof state.brandingConfig, value: any) => {
    update('brandingConfig', { ...state.brandingConfig, [key]: value });
  };

  return (
    <div>
      <h3 className={sectionTitleClass}>Branding</h3>

      <label className="flex items-center gap-2.5 cursor-pointer mb-4">
        <input
          type="checkbox"
          checked={state.brandingAllowed}
          onChange={(e) => update('brandingAllowed', e.target.checked)}
          className="accent-indigo-500 w-4 h-4"
        />
        <span className="text-xs text-slate-300">Allow organizations on this plan to customize branding</span>
      </label>

      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-opacity ${state.brandingAllowed ? '' : 'opacity-40 pointer-events-none'}`}>
        <div>
          <label className={labelClass}>Primary Color</label>
          <input
            type="text"
            value={state.brandingConfig.primaryColor || ''}
            onChange={(e) => setBranding('primaryColor', e.target.value)}
            className={inputClass}
            placeholder="#f97316"
          />
        </div>
        <div>
          <label className={labelClass}>Accent Color</label>
          <input
            type="text"
            value={state.brandingConfig.accentColor || ''}
            onChange={(e) => setBranding('accentColor', e.target.value)}
            className={inputClass}
            placeholder="#6366f1"
          />
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!state.brandingConfig.customLogo}
            onChange={(e) => setBranding('customLogo', e.target.checked)}
            className="accent-indigo-500 w-4 h-4"
          />
          <span className="text-xs text-slate-300">Custom Logo</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!state.brandingConfig.customDomain}
            onChange={(e) => setBranding('customDomain', e.target.checked)}
            className="accent-indigo-500 w-4 h-4"
          />
          <span className="text-xs text-slate-300">Custom Domain</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!state.brandingConfig.emailBranding}
            onChange={(e) => setBranding('emailBranding', e.target.checked)}
            className="accent-indigo-500 w-4 h-4"
          />
          <span className="text-xs text-slate-300">Email Branding</span>
        </label>
      </div>
    </div>
  );
}
