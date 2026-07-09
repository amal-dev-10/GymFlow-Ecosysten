'use client';

import { useEffect, useState } from 'react';
import { Code2, Play } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import FeatureEngineTabs from '@/components/feature-engine/FeatureEngineTabs';
import { featureEngineApi, handleApiError } from '@/lib/api';
import type { DeveloperPreviewDTO, FeatureCatalogItemDTO, ResourceCatalogItemDTO, OrganizationUsageSummaryDTO } from '@/types/featureEngine';

const selectClass =
  'bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none transition-colors cursor-pointer';

export default function DeveloperPreviewPage() {
  const [organizations, setOrganizations] = useState<OrganizationUsageSummaryDTO[]>([]);
  const [features, setFeatures] = useState<FeatureCatalogItemDTO[]>([]);
  const [resources, setResources] = useState<ResourceCatalogItemDTO[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [featureKey, setFeatureKey] = useState('');
  const [resourceKey, setResourceKey] = useState('');
  const [preview, setPreview] = useState<DeveloperPreviewDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    Promise.all([featureEngineApi.listOrganizationsUsage(), featureEngineApi.listFeatures(), featureEngineApi.listResources()]).then(([orgs, f, r]) => {
      setOrganizations(orgs);
      setFeatures(f);
      setResources(r);
      if (orgs[0]) setOrganizationId(orgs[0].organization.id);
      if (f[0]) setFeatureKey(f[0].key);
      if (r[0]) setResourceKey(r[0].key);
    });
  }, []);

  const runPreview = () => {
    if (!organizationId) return;
    setLoading(true);
    setErrorMsg('');
    featureEngineApi
      .getDeveloperPreview(organizationId, featureKey || undefined, resourceKey || undefined)
      .then(setPreview)
      .catch((err) => setErrorMsg(handleApiError(err)))
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Developer Preview"
        description="Simulate a real request to the Feature & Limit Engine and inspect the exact JSON any backend service or frontend app receives back."
      />
      <FeatureEngineTabs />

      <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Organization</label>
          <select className={`${selectClass} w-full`} value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
            {organizations.map((o) => <option key={o.organization.id} value={o.organization.id}>{o.organization.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Feature Key</label>
          <select className={`${selectClass} w-full`} value={featureKey} onChange={(e) => setFeatureKey(e.target.value)}>
            <option value="">None</option>
            {features.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Resource Key</label>
          <select className={`${selectClass} w-full`} value={resourceKey} onChange={(e) => setResourceKey(e.target.value)}>
            <option value="">None</option>
            {resources.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
        <div className="sm:col-span-3">
          <button
            onClick={runPreview}
            disabled={!organizationId || loading}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
          >
            <Play size={13} />
            {loading ? 'Running...' : 'Run Evaluation'}
          </button>
        </div>
      </div>

      {errorMsg && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{errorMsg}</div>}

      {preview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Rule Evaluation Response</h2>
            <pre className="bg-[#080d19] border border-slate-800/80 rounded-2xl p-4 text-[11px] text-emerald-300 overflow-x-auto font-mono leading-relaxed">
{JSON.stringify({ featureEvaluation: preview.featureEvaluation, resourceEvaluation: preview.resourceEvaluation }, null, 2)}
            </pre>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Current Configuration</h2>
            <pre className="bg-[#080d19] border border-slate-800/80 rounded-2xl p-4 text-[11px] text-sky-300 overflow-x-auto font-mono leading-relaxed">
{JSON.stringify(preview.configuration, null, 2)}
            </pre>
          </div>
          <div className="lg:col-span-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Code2 size={13} className="text-slate-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Example API Requests</h2>
            </div>
            <div className="space-y-2">
              {preview.sampleRequests.map((req, i) => (
                <pre key={i} className="bg-[#080d19] border border-slate-800/80 rounded-2xl p-4 text-[11px] text-slate-300 overflow-x-auto font-mono leading-relaxed">
{`${req.method} ${req.path}\n${JSON.stringify(req.body, null, 2)}`}
                </pre>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
