'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Save } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import FeatureEngineTabs from '@/components/feature-engine/FeatureEngineTabs';
import { featureEngineApi, handleApiError } from '@/lib/api';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import type { ResourceCatalogItemDTO, PlanResourceLimitRowDTO } from '@/types/featureEngine';

const selectClass =
  'bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none transition-colors cursor-pointer';
const inputClass =
  'w-24 bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none transition-colors';

interface RuleFormState {
  warningThresholdValue: string;
  graceDays: string;
  autoSuspendEnabled: boolean;
  autoUpgradeRecommend: boolean;
  displayUpgradeBanner: boolean;
}

function toFormState(row: PlanResourceLimitRowDTO): RuleFormState {
  return {
    warningThresholdValue: row.warningThresholdValue != null ? String(row.warningThresholdValue) : '',
    graceDays: String(row.graceDays),
    autoSuspendEnabled: row.autoSuspendEnabled,
    autoUpgradeRecommend: row.autoUpgradeRecommend,
    displayUpgradeBanner: row.displayUpgradeBanner,
  };
}

function RuleRow({ resource, row, onSaved }: { resource: ResourceCatalogItemDTO; row: PlanResourceLimitRowDTO; onSaved: () => void }) {
  const { canWrite } = usePlatformRole();
  const [form, setForm] = useState<RuleFormState>(toFormState(row));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (patch: Partial<RuleFormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await featureEngineApi.updateValidationRule(resource.key, row.planId, {
        warningThresholdValue: form.warningThresholdValue === '' ? null : Number(form.warningThresholdValue),
        graceDays: Number(form.graceDays) || 0,
        autoSuspendEnabled: form.autoSuspendEnabled,
        autoUpgradeRecommend: form.autoUpgradeRecommend,
        displayUpgradeBanner: form.displayUpgradeBanner,
      });
      setDirty(false);
      onSaved();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="border-b border-slate-900/60 last:border-0">
      <td className="px-4 py-3">
        <span className="text-xs font-bold text-slate-100">{resource.label}</span>
        <span className="block text-[10px] text-slate-600">{resource.unit || '—'}</span>
      </td>
      <td className="px-4 py-3 text-xs font-bold text-slate-200">{row.limitValue}</td>
      <td className="px-4 py-3">
        <input
          type="number"
          min={0}
          value={form.warningThresholdValue}
          onChange={(e) => update({ warningThresholdValue: e.target.value })}
          placeholder="—"
          disabled={!canWrite}
          className={inputClass}
        />
      </td>
      <td className="px-4 py-3">
        <input type="number" min={0} value={form.graceDays} onChange={(e) => update({ graceDays: e.target.value })} disabled={!canWrite} className={inputClass} />
      </td>
      <td className="px-4 py-3 text-center">
        <input type="checkbox" checked={form.displayUpgradeBanner} onChange={(e) => update({ displayUpgradeBanner: e.target.checked })} disabled={!canWrite} className="accent-indigo-500" />
      </td>
      <td className="px-4 py-3 text-center">
        <input type="checkbox" checked={form.autoUpgradeRecommend} onChange={(e) => update({ autoUpgradeRecommend: e.target.checked })} disabled={!canWrite} className="accent-indigo-500" />
      </td>
      <td className="px-4 py-3 text-center">
        <input type="checkbox" checked={form.autoSuspendEnabled} onChange={(e) => update({ autoSuspendEnabled: e.target.checked })} disabled={!canWrite} className="accent-rose-500" />
      </td>
      <td className="px-4 py-3 text-right">
        {canWrite && (
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-30"
          >
            <Save size={11} />
            {saving ? 'Saving' : 'Save'}
          </button>
        )}
        {error && <p className="text-[10px] text-rose-400 mt-1">{error}</p>}
      </td>
    </tr>
  );
}

export default function ValidationRulesPage() {
  const [resources, setResources] = useState<ResourceCatalogItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [planId, setPlanId] = useState('');

  const load = () => {
    setLoading(true);
    featureEngineApi
      .listResources()
      .then((data) => {
        setResources(data);
        if (!planId) {
          const firstPlan = data.flatMap((r) => r.planLimits).find((l) => l.limitType === 'LIMITED');
          if (firstPlan) setPlanId(firstPlan.planId);
        }
      })
      .catch((err) => setErrorMsg(handleApiError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const plans = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    resources.forEach((r) => r.planLimits.forEach((l) => map.set(l.planId, l.plan)));
    return Array.from(map.values());
  }, [resources]);

  const rowsForPlan = useMemo(() => {
    if (!planId) return [];
    return resources
      .map((resource) => ({ resource, row: resource.planLimits.find((l) => l.planId === planId && l.limitType === 'LIMITED') }))
      .filter((entry): entry is { resource: ResourceCatalogItemDTO; row: PlanResourceLimitRowDTO } => !!entry.row);
  }, [resources, planId]);

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Validation Rules"
        description='Grace periods, warning thresholds, hard stops and auto-suspend behavior for every metered resource. Example: Members limit 20, warning at 18, upgrade banner shown once a plan crosses the threshold.'
      />
      <FeatureEngineTabs />

      {errorMsg && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{errorMsg}</div>}

      {loading ? (
        <div className="h-64 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />
      ) : plans.length === 0 ? (
        <PlatformEmptyState icon={ShieldCheck} title="No limited resources configured yet" description="Set at least one resource to a numeric limit on a plan to configure its validation rule." />
      ) : (
        <>
          <select className={selectClass} value={planId} onChange={(e) => setPlanId(e.target.value)}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {rowsForPlan.length === 0 ? (
            <PlatformEmptyState icon={ShieldCheck} title="This plan has no numeric limits" description="Validation rules only apply to resources with a numeric limit (not Unlimited or Disabled)." />
          ) : (
            <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
              <table className="w-full text-left min-w-[820px]">
                <thead>
                  <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Resource</th>
                    <th className="px-4 py-3">Hard Limit</th>
                    <th className="px-4 py-3">Warning Threshold</th>
                    <th className="px-4 py-3">Grace Days</th>
                    <th className="px-4 py-3 text-center">Upgrade Banner</th>
                    <th className="px-4 py-3 text-center">Recommend Upgrade</th>
                    <th className="px-4 py-3 text-center">Auto-Suspend</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rowsForPlan.map(({ resource, row }) => (
                    <RuleRow key={row.id} resource={resource} row={row} onSaved={load} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
