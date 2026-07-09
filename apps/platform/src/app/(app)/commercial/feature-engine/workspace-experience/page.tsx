'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MonitorSmartphone, Layers, Gauge, Sparkles, X } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import FeatureEngineTabs from '@/components/feature-engine/FeatureEngineTabs';
import { featureEngineApi, handleApiError } from '@/lib/api';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import type { WorkspaceExperienceOverviewDTO, WorkspaceExperience } from '@/types/featureEngine';

const EXPERIENCE_CONFIG: Record<WorkspaceExperience, { label: string; icon: typeof Gauge; description: string; className: string }> = {
  ESSENTIAL: { label: 'Essential', icon: Gauge, description: 'Streamlined workspace for small, single-branch gyms.', className: 'text-slate-300 bg-slate-500/10 border-slate-500/20' },
  PROFESSIONAL: { label: 'Professional', icon: Layers, description: 'Full-featured workspace for growing multi-branch operators.', className: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' },
  EXPERT: { label: 'Expert', icon: Sparkles, description: 'Advanced workspace with deep customization for large chains.', className: 'text-violet-300 bg-violet-500/10 border-violet-500/20' },
};

export default function WorkspaceExperiencePage() {
  const router = useRouter();
  const { canWrite } = usePlatformRole();
  const [data, setData] = useState<WorkspaceExperienceOverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setLoading(true);
    featureEngineApi
      .listWorkspaceExperience()
      .then(setData)
      .catch((err) => setErrorMsg(handleApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const clearOverride = async (organizationId: string) => {
    try {
      await featureEngineApi.setOrganizationWorkspaceExperience(organizationId, { workspaceExperienceOverride: null });
      const refreshed = await featureEngineApi.listWorkspaceExperience();
      setData(refreshed);
    } catch (err) {
      setErrorMsg(handleApiError(err));
    }
  };

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Workspace Experience"
        description="Every plan has a default workspace experience (Essential, Professional, Expert). Platform Admins can override it per organization from that organization's usage page."
      />
      <FeatureEngineTabs />

      {errorMsg && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{errorMsg}</div>}

      {loading || !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Per-Plan Defaults</h2>
            <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Default Experience</th>
                    <th className="px-4 py-3">Org Override Allowed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.plans.map((plan) => {
                    const config = EXPERIENCE_CONFIG[plan.workspaceExperienceDefault];
                    return (
                      <tr key={plan.id} className="border-b border-slate-900/60 last:border-0">
                        <td className="px-4 py-3 text-xs font-bold text-slate-100">{plan.name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${config.className}`}>
                            <config.icon size={11} />
                            {config.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{plan.allowExperienceOverride ? 'Yes' : 'No'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Per-Organization Overrides</h2>
            {data.organizationOverrides.length === 0 ? (
              <PlatformEmptyState
                icon={MonitorSmartphone}
                title="No organizations override their plan's default"
                description="Overrides can be set from an organization's usage page in the Organizations section."
                action={
                  <button
                    onClick={() => router.push('/commercial/feature-engine/organizations')}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors"
                  >
                    Go to Organizations
                  </button>
                }
              />
            ) : (
              <div className="space-y-2">
                {data.organizationOverrides.map((row) => {
                  const config = EXPERIENCE_CONFIG[row.workspaceExperienceOverride];
                  return (
                    <div key={row.id} className="flex items-center justify-between bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
                      <div>
                        <button onClick={() => router.push(`/commercial/feature-engine/organizations/${row.organizationId}`)} className="text-xs font-bold text-slate-100 hover:text-indigo-300 transition-colors">
                          {row.organization.name}
                        </button>
                        <p className="text-[11px] text-slate-500 mt-0.5">Plan default: {EXPERIENCE_CONFIG[row.plan.workspaceExperienceDefault].label}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${config.className}`}>
                          <config.icon size={11} />
                          {config.label} (override)
                        </span>
                        {canWrite && (
                          <button onClick={() => clearOverride(row.organizationId)} title="Clear override" className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors">
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
