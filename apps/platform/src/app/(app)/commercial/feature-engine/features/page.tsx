'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Link2, X, ToggleLeft } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import FeatureEngineTabs from '@/components/feature-engine/FeatureEngineTabs';
import FeatureStateBadge from '@/components/feature-engine/FeatureStateBadge';
import { featureEngineApi, handleApiError } from '@/lib/api';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import type { FeatureCatalogItemDTO } from '@/types/featureEngine';

const inputClass =
  'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors';

function FeatureFormModal({
  feature,
  allFeatures,
  onClose,
  onSaved,
}: {
  feature: FeatureCatalogItemDTO | null;
  allFeatures: FeatureCatalogItemDTO[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!feature;
  const [key, setKey] = useState(feature?.key || '');
  const [label, setLabel] = useState(feature?.label || '');
  const [category, setCategory] = useState(feature?.category || 'General');
  const [description, setDescription] = useState(feature?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await featureEngineApi.updateFeature(feature.key, { label, category, description: description || undefined });
      } else {
        await featureEngineApi.createFeature({ key, label, category, description: description || undefined });
      }
      onSaved();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-md bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
        <h3 className="text-base font-extrabold text-white mb-4">{isEdit ? `Edit "${feature.label}"` : 'Add Feature to Catalog'}</h3>
        <div className="space-y-3">
          {!isEdit && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Key</label>
              <input value={key} onChange={(e) => setKey(e.target.value.trim().toLowerCase().replace(/\s+/g, '_'))} placeholder="e.g. loyalty_program" className={inputClass} />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Label</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Loyalty Program" className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Growth" className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
          </div>
          {error && <p className="text-[11px] font-semibold text-rose-400">{error}</p>}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !label || (!isEdit && !key)}
            className="flex-1 py-3 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Feature'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DependencyModal({ feature, allFeatures, onClose, onSaved }: { feature: FeatureCatalogItemDTO; allFeatures: FeatureCatalogItemDTO[]; onClose: () => void; onSaved: () => void }) {
  const [requiresKey, setRequiresKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const candidates = allFeatures.filter((f) => f.key !== feature.key && !feature.dependsOn.some((d) => d.requiresFeature?.key === f.key));

  const handleAdd = async () => {
    if (!requiresKey) return;
    setSaving(true);
    setError('');
    try {
      await featureEngineApi.addFeatureDependency({ featureKey: feature.key, requiresFeatureKey: requiresKey });
      setRequiresKey('');
      onSaved();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    await featureEngineApi.removeFeatureDependency(id).catch(() => undefined);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-md bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold text-white">Dependencies · {feature.label}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>

        <p className="text-[11px] text-slate-500 mb-3">"{feature.label}" requires these features to be available before it's shown as fully functional.</p>

        <div className="space-y-1.5 mb-4">
          {feature.dependsOn.length === 0 ? (
            <p className="text-[11px] text-slate-600 italic">No dependencies configured.</p>
          ) : (
            feature.dependsOn.map((dep) => (
              <div key={dep.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-850">
                <span className="text-xs font-semibold text-slate-200">{dep.requiresFeature?.label}</span>
                <button onClick={() => handleRemove(dep.id)} className="text-slate-500 hover:text-rose-400"><X size={13} /></button>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <select value={requiresKey} onChange={(e) => setRequiresKey(e.target.value)} className={inputClass}>
            <option value="">Select a required feature...</option>
            {candidates.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!requiresKey || saving}
            className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40 shrink-0"
          >
            Add
          </button>
        </div>
        {error && <p className="text-[11px] font-semibold text-rose-400 mt-2">{error}</p>}
      </div>
    </div>
  );
}

export default function FeatureEngineFeaturesPage() {
  const { canWrite } = usePlatformRole();
  const [features, setFeatures] = useState<FeatureCatalogItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [formTarget, setFormTarget] = useState<FeatureCatalogItemDTO | null | undefined>(undefined);
  const [depTarget, setDepTarget] = useState<FeatureCatalogItemDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeatureCatalogItemDTO | null>(null);

  const load = () => {
    setLoading(true);
    featureEngineApi
      .listFeatures()
      .then(setFeatures)
      .catch((err) => setErrorMsg(handleApiError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(
    () => features.filter((f) => !search || f.label.toLowerCase().includes(search.toLowerCase()) || f.key.toLowerCase().includes(search.toLowerCase())),
    [features, search],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, FeatureCatalogItemDTO[]>();
    filtered.forEach((f) => {
      const list = map.get(f.category) || [];
      list.push(f);
      map.set(f.category, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await featureEngineApi.deleteFeature(deleteTarget.key);
      load();
    } catch (err) {
      setErrorMsg(handleApiError(err));
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Feature Management"
        description="Every GymFlow feature that can be gated, along with its dependencies. Nothing here is hardcoded - add or retire a feature and every plan/organization view updates."
        actions={
          canWrite && (
            <button
              onClick={() => setFormTarget(null)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors"
            >
              <Plus size={14} />
              Add Feature
            </button>
          )
        }
      />
      <FeatureEngineTabs />

      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search features..." className={`${inputClass} pl-9`} />
      </div>

      {errorMsg && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{errorMsg}</div>}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <PlatformEmptyState icon={ToggleLeft} title="No features found" description={search ? 'Try a different search term.' : 'Add the first feature to the catalog.'} />
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, list]) => (
            <div key={category}>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2">{category}</h3>
              <div className="space-y-2">
                {list.map((feature) => (
                  <div key={feature.key} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-100">{feature.label}</span>
                          <span className="text-[10px] text-slate-600 font-mono">{feature.key}</span>
                        </div>
                        {feature.description && <p className="text-[11px] text-slate-500 mt-1 max-w-xl">{feature.description}</p>}
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {feature.stateSummary.enabled > 0 && <FeatureStateBadge state="ENABLED" />}
                          {feature.stateSummary.beta > 0 && <FeatureStateBadge state="BETA" />}
                          {feature.stateSummary.enterpriseOnly > 0 && <FeatureStateBadge state="ENTERPRISE_ONLY" />}
                          {feature.stateSummary.comingSoon > 0 && <FeatureStateBadge state="COMING_SOON" />}
                          {feature.stateSummary.hidden > 0 && <FeatureStateBadge state="HIDDEN" />}
                          {Object.values(feature.stateSummary).every((v) => v === 0) && <span className="text-[10px] text-slate-600 italic">Not assigned to any active plan</span>}
                        </div>
                        {(feature.dependsOn.length > 0 || feature.requiredFor.length > 0) && (
                          <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] text-slate-500">
                            {feature.dependsOn.length > 0 && (
                              <span className="inline-flex items-center gap-1 bg-slate-900/60 border border-slate-850 rounded-full px-2 py-0.5">
                                <Link2 size={10} /> Requires {feature.dependsOn.map((d) => d.requiresFeature?.label).join(', ')}
                              </span>
                            )}
                            {feature.requiredFor.length > 0 && (
                              <span className="inline-flex items-center gap-1 bg-slate-900/60 border border-slate-850 rounded-full px-2 py-0.5">
                                <Link2 size={10} /> Required by {feature.requiredFor.map((d) => d.feature?.label).join(', ')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {canWrite && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => setDepTarget(feature)} title="Dependencies" className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-colors">
                            <Link2 size={13} />
                          </button>
                          <button onClick={() => setFormTarget(feature)} title="Edit" className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeleteTarget(feature)} title="Delete" className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {formTarget !== undefined && (
        <FeatureFormModal feature={formTarget} allFeatures={features} onClose={() => setFormTarget(undefined)} onSaved={() => { setFormTarget(undefined); load(); }} />
      )}
      {depTarget && <DependencyModal feature={depTarget} allFeatures={features} onClose={() => setDepTarget(null)} onSaved={() => { load(); setDepTarget(null); }} />}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
          <div className="fixed inset-0" onClick={() => setDeleteTarget(null)} />
          <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
            <h3 className="text-base font-extrabold text-white mb-2">Remove Feature</h3>
            <p className="text-xs text-slate-400 mb-5">
              Remove <b className="text-slate-200">{deleteTarget.label}</b> from the catalog? This only works if no active plan currently grants it.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-xs font-bold rounded-xl transition-colors">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
