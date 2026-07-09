'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SlidersHorizontal,
  Building2,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Infinity as InfinityIcon,
  AlertTriangle,
  Activity,
  BellRing,
  KeySquare,
  ArrowRight,
} from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import FeatureEngineTabs from '@/components/feature-engine/FeatureEngineTabs';
import { featureEngineApi, handleApiError } from '@/lib/api';
import type { EngineDashboardDTO } from '@/types/featureEngine';

function StatCard({ icon: Icon, label, value, tone, sub }: { icon: typeof SlidersHorizontal; label: string; value: string; tone?: 'default' | 'warning' | 'danger'; sub?: string }) {
  const toneClass = tone === 'danger' ? 'text-rose-400' : tone === 'warning' ? 'text-amber-400' : 'text-indigo-400';
  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between min-h-[100px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <Icon size={14} className={toneClass} />
      </div>
      <div>
        <span className="text-xl font-black text-slate-100 block">{value}</span>
        {sub && <span className="text-[10px] text-slate-600">{sub}</span>}
      </div>
    </div>
  );
}

const SECTIONS = [
  { name: 'Features', path: '/commercial/feature-engine/features', icon: ToggleLeft, description: 'Enable, disable, beta-gate or hide every GymFlow feature.' },
  { name: 'Limits', path: '/commercial/feature-engine/limits', icon: SlidersHorizontal, description: 'Configure resource limits across the platform catalog.' },
  { name: 'Organizations', path: '/commercial/feature-engine/organizations', icon: Building2, description: 'See real-time usage, warnings and violations per organization.' },
  { name: 'Overrides', path: '/commercial/feature-engine/overrides', icon: KeySquare, description: 'Grant temporary, permanent or emergency exceptions.' },
  { name: 'Violations', path: '/commercial/feature-engine/violations', icon: AlertTriangle, description: 'See every organization currently over a hard limit.' },
];

export default function FeatureEngineDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<EngineDashboardDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setLoading(true);
    featureEngineApi
      .getDashboard()
      .then(setStats)
      .catch((err) => setErrorMsg(handleApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Feature & Limit Engine"
        description="The single source of truth for feature access, resource limits and workspace experience across GymFlow. Every backend service and frontend app asks this engine before checking a subscription plan directly."
      />
      <FeatureEngineTabs />

      {errorMsg && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{errorMsg}</div>}

      {loading || !stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 min-h-[100px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Building2} label="Organizations Using Engine" value={String(stats.organizationsUsingEngine)} />
          <StatCard icon={ShieldCheck} label="Active Rules" value={String(stats.activeRules)} />
          <StatCard icon={ToggleRight} label="Enabled Features" value={String(stats.enabledFeatures)} />
          <StatCard icon={ToggleLeft} label="Disabled Features" value={String(stats.disabledFeatures)} />
          <StatCard icon={InfinityIcon} label="Unlimited Resources" value={String(stats.unlimitedResources)} />
          <StatCard icon={AlertTriangle} label="Rule Violations Today" value={String(stats.ruleViolationsToday)} tone={stats.ruleViolationsToday > 0 ? 'danger' : 'default'} />
          <StatCard icon={Activity} label="Feature Usage Today" value={String(stats.featureUsageToday)} sub="Usage records touched" />
          <StatCard icon={BellRing} label="Limit Warnings" value={String(stats.limitWarnings)} tone={stats.limitWarnings > 0 ? 'warning' : 'default'} />
        </div>
      )}

      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Engine Sections</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SECTIONS.map((section) => (
            <button
              key={section.path}
              onClick={() => router.push(section.path)}
              className="text-left bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 transition-colors group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300">
                  <section.icon size={16} />
                </div>
                <ArrowRight size={14} className="text-slate-700 group-hover:text-indigo-300 transition-colors" />
              </div>
              <span className="block text-sm font-bold text-slate-100">{section.name}</span>
              <span className="block text-[11px] text-slate-500 mt-1 leading-relaxed">{section.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
