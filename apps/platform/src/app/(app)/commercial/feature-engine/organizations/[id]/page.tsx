'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, AlertTriangle, TrendingUp, KeySquare, Plus } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import UsageBar from '@/components/feature-engine/UsageBar';
import FeatureStateBadge from '@/components/feature-engine/FeatureStateBadge';
import { OverrideTypeBadge } from '@/components/feature-engine/OverrideBadges';
import { featureEngineApi, handleApiError } from '@/lib/api';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import type { OrganizationDetailDTO, WorkspaceExperience } from '@/types/featureEngine';

const selectClass =
  'bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none transition-colors cursor-pointer';

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canWrite } = usePlatformRole();
  const [detail, setDetail] = useState<OrganizationDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [savingExperience, setSavingExperience] = useState(false);

  const load = () => {
    setLoading(true);
    featureEngineApi
      .getOrganizationDetail(id)
      .then(setDetail)
      .catch((err) => setErrorMsg(handleApiError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleExperienceChange = async (value: string) => {
    setSavingExperience(true);
    try {
      await featureEngineApi.setOrganizationWorkspaceExperience(id, {
        workspaceExperienceOverride: (value || null) as WorkspaceExperience | null,
      });
      load();
    } catch (err) {
      setErrorMsg(handleApiError(err));
    } finally {
      setSavingExperience(false);
    }
  };

  const handleRevoke = async (overrideId: string) => {
    try {
      await featureEngineApi.revokeOverride(overrideId);
      load();
    } catch (err) {
      setErrorMsg(handleApiError(err));
    }
  };

  if (loading || !detail) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 bg-slate-900 rounded-lg animate-pulse" />
        <div className="h-64 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={() => router.push('/commercial/feature-engine/organizations')} className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors">
        <ChevronLeft size={13} />
        Back to Organizations
      </button>

      <PlatformPageHeader
        title={detail.organization.name}
        description={`Plan: ${detail.plan.name} · Subscription: ${detail.subscription.status}`}
        actions={
          <button
            onClick={() => router.push(`/commercial/feature-engine/overrides?organizationId=${id}`)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors"
          >
            <Plus size={14} />
            Add Override
          </button>
        }
      />

      {errorMsg && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{errorMsg}</div>}

      {detail.upgradeRecommendation && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
          <TrendingUp size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-bold text-amber-300">Upgrade Recommended: {detail.upgradeRecommendation.recommendedPlan.name}</span>
            <p className="text-[11px] text-slate-400 mt-1">{detail.upgradeRecommendation.reason}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Estimated cost: {detail.upgradeRecommendation.recommendedPlan.currency} {detail.upgradeRecommendation.estimatedCost}/{detail.upgradeRecommendation.recommendedPlan.billingCycle.toLowerCase()}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Resource Usage</h2>
          </div>
          <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 space-y-4">
            {detail.usage.map((u) => (
              <UsageBar
                key={u.resourceKey}
                label={u.label + (u.overridden ? ' (overridden)' : '')}
                used={u.used}
                limitValue={u.limitValue}
                unit={u.unit}
                unlimited={u.limitType === 'UNLIMITED'}
                disabled={u.limitType === 'DISABLED'}
                warning={u.warningThresholdValue != null && u.used >= u.warningThresholdValue}
              />
            ))}
          </div>

          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Workspace Experience</h2>
          <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-100">Effective: {detail.effectiveWorkspaceExperience}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Plan default: {detail.plan.workspaceExperienceDefault}</p>
            </div>
            {canWrite && (
              <select
                className={selectClass}
                value={detail.subscription.workspaceExperienceOverride || ''}
                disabled={savingExperience}
                onChange={(e) => handleExperienceChange(e.target.value)}
              >
                <option value="">Use plan default</option>
                <option value="ESSENTIAL">Essential</option>
                <option value="PROFESSIONAL">Professional</option>
                <option value="EXPERT">Expert</option>
              </select>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Feature Access</h2>
          <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 max-h-[340px] overflow-y-auto scrollbar-thin space-y-2">
            {detail.featureAccess.map((f) => (
              <div key={f.featureKey} className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">{f.label}{f.overridden && <span className="text-[10px] text-indigo-400 ml-1">(overridden)</span>}</span>
                <FeatureStateBadge state={f.state} />
              </div>
            ))}
          </div>

          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Overrides</h2>
          {detail.overrides.length === 0 ? (
            <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 text-center">
              <KeySquare size={18} className="text-slate-700 mx-auto mb-2" />
              <p className="text-[11px] text-slate-500">No active overrides for this organization.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {detail.overrides.map((o) => (
                <div key={o.id} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <OverrideTypeBadge type={o.overrideType} />
                      <span className="text-xs font-bold text-slate-200 truncate">{o.feature?.label || o.resource?.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 truncate">{o.reason}</p>
                  </div>
                  {canWrite && (
                    <button onClick={() => handleRevoke(o.id)} className="shrink-0 px-2.5 py-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-[10px] font-bold rounded-lg transition-colors">
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Violations</h2>
          {detail.violations.length === 0 ? (
            <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 text-center">
              <p className="text-[11px] text-slate-500">No active violations. All limits within bounds.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {detail.violations.map((v, i) => (
                <div key={i} className={`rounded-2xl p-3.5 border ${v.severity === 'exceeded' ? 'bg-rose-500/5 border-rose-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={13} className={v.severity === 'exceeded' ? 'text-rose-400' : 'text-amber-400'} />
                    <span className="text-xs font-bold text-slate-200">{v.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Using {v.used} / {v.limitValue} · {v.action}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
