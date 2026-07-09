'use client';

import { useEffect, useState } from 'react';
import { Grid3x3 } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import FeatureEngineTabs from '@/components/feature-engine/FeatureEngineTabs';
import FeatureStateBadge from '@/components/feature-engine/FeatureStateBadge';
import LimitTypeBadge from '@/components/feature-engine/LimitTypeBadge';
import { featureEngineApi, handleApiError } from '@/lib/api';
import type { FeatureMatrixDTO, ResourceMatrixDTO } from '@/types/featureEngine';

export default function FeatureEngineMatrixPage() {
  const [tab, setTab] = useState<'features' | 'limits'>('features');
  const [featureMatrix, setFeatureMatrix] = useState<FeatureMatrixDTO | null>(null);
  const [resourceMatrix, setResourceMatrix] = useState<ResourceMatrixDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([featureEngineApi.getFeatureMatrix(), featureEngineApi.getResourceMatrix()])
      .then(([f, r]) => {
        setFeatureMatrix(f);
        setResourceMatrix(r);
      })
      .catch((err) => setErrorMsg(handleApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PlatformPageHeader title="Feature & Resource Matrix" description="Compare every active plan side by side across the entire feature and resource catalog." />
      <FeatureEngineTabs />

      <div className="flex gap-2">
        <button
          onClick={() => setTab('features')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${tab === 'features' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-slate-900 border-slate-850 text-slate-400'}`}
        >
          Feature Matrix
        </button>
        <button
          onClick={() => setTab('limits')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${tab === 'limits' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-slate-900 border-slate-850 text-slate-400'}`}
        >
          Resource Matrix
        </button>
      </div>

      {errorMsg && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{errorMsg}</div>}

      {loading ? (
        <div className="h-72 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />
      ) : tab === 'features' ? (
        !featureMatrix || featureMatrix.plans.length === 0 ? (
          <PlatformEmptyState icon={Grid3x3} title="No active plans yet" />
        ) : (
          <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
            <table className="w-full text-left min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-800/60">
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 sticky left-0 bg-[#0b101d]">Feature</th>
                  {featureMatrix.plans.map((p) => (
                    <th key={p.id} className="px-4 py-3 text-xs font-black text-slate-100">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureMatrix.features.map((feature) => (
                  <tr key={feature.key} className="border-b border-slate-900/60 last:border-0">
                    <td className="px-4 py-2.5 text-xs text-slate-300 sticky left-0 bg-[#0b101d]">{feature.label}</td>
                    {featureMatrix.plans.map((p) => {
                      const access = p.featureAccess.find((a) => a.featureKey === feature.key);
                      return (
                        <td key={p.id} className="px-4 py-2.5">
                          {access ? <FeatureStateBadge state={access.state} /> : <span className="text-[10px] text-slate-700">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : !resourceMatrix || resourceMatrix.plans.length === 0 ? (
        <PlatformEmptyState icon={Grid3x3} title="No active plans yet" />
      ) : (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-800/60">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 sticky left-0 bg-[#0b101d]">Resource</th>
                {resourceMatrix.plans.map((p) => (
                  <th key={p.id} className="px-4 py-3 text-xs font-black text-slate-100">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resourceMatrix.resources.map((resource) => (
                <tr key={resource.key} className="border-b border-slate-900/60 last:border-0">
                  <td className="px-4 py-2.5 text-xs text-slate-300 sticky left-0 bg-[#0b101d]">{resource.label}</td>
                  {resourceMatrix.plans.map((p) => {
                    const limit = p.resourceLimits.find((l) => l.resourceKey === resource.key);
                    return (
                      <td key={p.id} className="px-4 py-2.5">
                        {limit ? <LimitTypeBadge limitType={limit.limitType} limitValue={limit.limitValue} unit={resource.unit} /> : <span className="text-[10px] text-slate-700">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
