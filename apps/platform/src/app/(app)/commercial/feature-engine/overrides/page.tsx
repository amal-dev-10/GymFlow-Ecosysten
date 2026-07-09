'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, KeySquare, X } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import FeatureEngineTabs from '@/components/feature-engine/FeatureEngineTabs';
import { OverrideTypeBadge, OverrideStatusBadge } from '@/components/feature-engine/OverrideBadges';
import { featureEngineApi, handleApiError } from '@/lib/api';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import type { EngineOverrideDTO, OrganizationUsageSummaryDTO, FeatureCatalogItemDTO, ResourceCatalogItemDTO } from '@/types/featureEngine';

const inputClass =
  'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors';
const selectClass =
  'bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none transition-colors cursor-pointer';

function CreateOverrideModal({
  defaultOrganizationId,
  organizations,
  features,
  resources,
  onClose,
  onCreated,
}: {
  defaultOrganizationId?: string;
  organizations: OrganizationUsageSummaryDTO[];
  features: FeatureCatalogItemDTO[];
  resources: ResourceCatalogItemDTO[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [organizationId, setOrganizationId] = useState(defaultOrganizationId || '');
  const [scope, setScope] = useState<'FEATURE' | 'RESOURCE'>('FEATURE');
  const [featureKey, setFeatureKey] = useState('');
  const [featureState, setFeatureState] = useState('ENABLED');
  const [resourceKey, setResourceKey] = useState('');
  const [limitType, setLimitType] = useState('UNLIMITED');
  const [limitValue, setLimitValue] = useState('');
  const [overrideType, setOverrideType] = useState<'TEMPORARY' | 'PERMANENT' | 'EMERGENCY'>('TEMPORARY');
  const [reason, setReason] = useState('');
  const [approverName, setApproverName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      await featureEngineApi.createOverride({
        organizationId,
        scope,
        featureKey: scope === 'FEATURE' ? featureKey : undefined,
        featureState: scope === 'FEATURE' ? (featureState as any) : undefined,
        resourceKey: scope === 'RESOURCE' ? resourceKey : undefined,
        limitType: scope === 'RESOURCE' ? (limitType as any) : undefined,
        limitValue: scope === 'RESOURCE' && limitType === 'LIMITED' ? Number(limitValue) : undefined,
        overrideType,
        reason,
        approverName: approverName || undefined,
        expiresAt: overrideType === 'TEMPORARY' && expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      onCreated();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const canSubmit =
    organizationId &&
    reason &&
    (scope === 'FEATURE' ? !!featureKey : !!resourceKey && (limitType !== 'LIMITED' || limitValue !== '')) &&
    (overrideType !== 'TEMPORARY' || !!expiresAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md overflow-y-auto">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-lg bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10 my-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold text-white">Add Override</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Organization</label>
            <select className={`${selectClass} w-full`} value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
              <option value="">Select an organization...</option>
              {organizations.map((o) => (
                <option key={o.organization.id} value={o.organization.id}>{o.organization.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Scope</label>
            <div className="flex gap-2">
              {(['FEATURE', 'RESOURCE'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${scope === s ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-slate-900 border-slate-850 text-slate-400'}`}
                >
                  {s === 'FEATURE' ? 'Feature' : 'Resource'}
                </button>
              ))}
            </div>
          </div>

          {scope === 'FEATURE' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Feature</label>
                <select className={`${selectClass} w-full`} value={featureKey} onChange={(e) => setFeatureKey(e.target.value)}>
                  <option value="">Select...</option>
                  {features.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Grant State</label>
                <select className={`${selectClass} w-full`} value={featureState} onChange={(e) => setFeatureState(e.target.value)}>
                  <option value="ENABLED">Enabled</option>
                  <option value="DISABLED">Disabled</option>
                  <option value="BETA">Beta</option>
                  <option value="ENTERPRISE_ONLY">Enterprise Only</option>
                  <option value="HIDDEN">Hidden</option>
                  <option value="COMING_SOON">Coming Soon</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Resource</label>
                <select className={`${selectClass} w-full`} value={resourceKey} onChange={(e) => setResourceKey(e.target.value)}>
                  <option value="">Select...</option>
                  {resources.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Limit Type</label>
                <select className={`${selectClass} w-full`} value={limitType} onChange={(e) => setLimitType(e.target.value)}>
                  <option value="UNLIMITED">Unlimited</option>
                  <option value="LIMITED">Number</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </div>
              {limitType === 'LIMITED' && (
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Limit Value</label>
                  <input type="number" min={0} value={limitValue} onChange={(e) => setLimitValue(e.target.value)} className={inputClass} />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Override Type</label>
            <div className="flex gap-2">
              {(['TEMPORARY', 'PERMANENT', 'EMERGENCY'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setOverrideType(t)}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-colors ${overrideType === t ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-slate-900 border-slate-850 text-slate-400'}`}
                >
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {overrideType === 'TEMPORARY' && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Expiration Date</label>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={inputClass} />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Why is this override needed?" className={inputClass} />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Approver (optional)</label>
            <input value={approverName} onChange={(e) => setApproverName(e.target.value)} placeholder="Name of the person who approved this" className={inputClass} />
          </div>

          {error && <p className="text-[11px] font-semibold text-rose-400">{error}</p>}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="flex-1 py-3 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Create Override'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OverridesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canWrite } = usePlatformRole();
  const [overrides, setOverrides] = useState<EngineOverrideDTO[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationUsageSummaryDTO[]>([]);
  const [features, setFeatures] = useState<FeatureCatalogItemDTO[]>([]);
  const [resources, setResources] = useState<ResourceCatalogItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const orgIdParam = searchParams.get('organizationId') || undefined;

  const load = () => {
    setLoading(true);
    Promise.all([
      featureEngineApi.listOverrides({ status: statusFilter || undefined, organizationId: orgIdParam }),
      featureEngineApi.listOrganizationsUsage(),
      featureEngineApi.listFeatures(),
      featureEngineApi.listResources(),
    ])
      .then(([o, orgs, f, r]) => {
        setOverrides(o);
        setOrganizations(orgs);
        setFeatures(f);
        setResources(r);
      })
      .catch((err) => setErrorMsg(handleApiError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter, orgIdParam]);

  useEffect(() => {
    if (orgIdParam) setModalOpen(true);
  }, [orgIdParam]);

  const handleRevoke = async (id: string) => {
    try {
      await featureEngineApi.revokeOverride(id);
      load();
    } catch (err) {
      setErrorMsg(handleApiError(err));
    }
  };

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Override Center"
        description="Temporary, permanent or emergency exceptions to a feature or resource limit for a single organization. Every override requires a reason and is fully audited."
        actions={
          canWrite && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors"
            >
              <Plus size={14} />
              Add Override
            </button>
          )
        }
      />
      <FeatureEngineTabs />

      <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All Statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="EXPIRED">Expired</option>
        <option value="REVOKED">Revoked</option>
      </select>

      {errorMsg && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{errorMsg}</div>}

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : overrides.length === 0 ? (
        <PlatformEmptyState icon={KeySquare} title="No overrides yet" description="Overrides let Platform Admins make time-boxed exceptions to a plan's rules for a specific organization." />
      ) : (
        <div className="space-y-2">
          {overrides.map((o) => (
            <div key={o.id} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <button onClick={() => router.push(`/commercial/feature-engine/organizations/${o.organizationId}`)} className="text-xs font-bold text-slate-100 hover:text-indigo-300 transition-colors">
                    {o.organization.name}
                  </button>
                  <OverrideTypeBadge type={o.overrideType} />
                  <OverrideStatusBadge status={o.status} />
                </div>
                <span className="text-[11px] text-slate-400">{o.feature?.label || o.resource?.label}</span>
                <p className="text-[11px] text-slate-500 mt-1">{o.reason}</p>
                <p className="text-[10px] text-slate-600 mt-1">
                  By {o.createdByName} on {new Date(o.createdAt).toLocaleDateString()}
                  {o.expiresAt && ` · Expires ${new Date(o.expiresAt).toLocaleDateString()}`}
                  {o.approverName && ` · Approved by ${o.approverName}`}
                </p>
              </div>
              {canWrite && o.status === 'ACTIVE' && (
                <button onClick={() => handleRevoke(o.id)} className="shrink-0 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-[10px] font-bold rounded-lg transition-colors">
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <CreateOverrideModal
          defaultOrganizationId={orgIdParam}
          organizations={organizations}
          features={features}
          resources={resources}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}
