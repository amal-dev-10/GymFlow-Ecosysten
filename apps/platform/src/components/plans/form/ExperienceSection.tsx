'use client';

import { Layers, Rocket, Sparkles } from 'lucide-react';
import type { WorkspaceExperience } from '@/types/plans';
import type { SectionProps } from './types';
import { sectionTitleClass } from './formStyles';

const EXPERIENCES: { value: WorkspaceExperience; label: string; description: string; icon: typeof Layers }[] = [
  { value: 'ESSENTIAL', label: 'Essential', description: 'Streamlined workspace with core modules only.', icon: Layers },
  { value: 'PROFESSIONAL', label: 'Professional', description: 'Balanced workspace with reporting and automation surfaced.', icon: Rocket },
  { value: 'EXPERT', label: 'Expert', description: 'Full workspace density - every module and advanced control visible.', icon: Sparkles },
];

export default function ExperienceSection({ state, update }: SectionProps) {
  return (
    <div>
      <h3 className={sectionTitleClass}>Workspace Experience</h3>
      <p className="text-xs text-slate-500 mb-4">Choose the default workspace density organizations on this plan land in.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {EXPERIENCES.map(({ value, label, description, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => update('workspaceExperienceDefault', value)}
            className={`text-left p-4 rounded-xl border transition-colors ${
              state.workspaceExperienceDefault === value ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <Icon size={16} className="text-indigo-400 mb-2" />
            <span className="text-xs font-bold text-slate-100 block mb-1">{label}</span>
            <span className="text-[11px] text-slate-500 leading-relaxed">{description}</span>
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer mt-5">
        <input
          type="checkbox"
          checked={state.allowExperienceOverride}
          onChange={(e) => update('allowExperienceOverride', e.target.checked)}
          className="accent-indigo-500 w-4 h-4"
        />
        <span className="text-xs text-slate-300">Allow organizations to override the default experience per-organization</span>
      </label>
    </div>
  );
}
