'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Gauge } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import FeatureEngineTabs from '@/components/feature-engine/FeatureEngineTabs';
import LimitTypeBadge from '@/components/feature-engine/LimitTypeBadge';
import { featureEngineApi, handleApiError } from '@/lib/api';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import type { ResourceCatalogItemDTO } from '@/types/featureEngine';

const inputClass =
  'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors';

function ResourceFormModal({ resource, onClose, onSaved }: { resource: ResourceCatalogItemDTO | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!resource;
  const [key, setKey] = useState(resource?.key || '');
  const [label, setLabel] = useState(resource?.label || '');
  const [unit, setUnit] = useState(resource?.unit || '');
  const [category, setCategory] = useState(resource?.category || 'General');
  const [description, setDescription] = useState(resource?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await featureEngineApi.updateResource(resource.key, { label, unit: unit || undefined, category, description: description || undefined });
      } else {
        await featureEngineApi.createResource({ key, label, unit: unit || undefined, category, description: description || undefined });
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
        <h3 className="text-base font-extrabold text-white mb-4">{isEdit ? `Edit "${resource.label}"` : 'Add Resource to Catalog'}</h3>
        <div className="space-y-3">
          {!isEdit && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Key</label>
              <input value={key} onChange={(e) => setKey(e.target.value.trim().toLowerCase().replace(/\s+/g, '_'))} placeholder="e.g. sms_credits" className={inputClass} />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Label</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. SMS Credits" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Unit</label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. GB, per month" className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Category</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Platform" className={inputClass} />
            </div>
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
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Resource'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FeatureEngineLimitsPage() {
  const { canWrite } = usePlatformRole();
  const [resources, setResources] = useState<ResourceCatalogItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [formTarget, setFormTarget] = useState<ResourceCatalogItemDTO | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<ResourceCatalogItemDTO | null>(null);

  const load = () => {
    setLoading(true);
    featureEngineApi
      .listResources()
      .then(setResources)
      .catch((err) => setErrorMsg(handleApiError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(
    () => resources.filter((r) => !search || r.label.toLowerCase().includes(search.toLowerCase()) || r.key.toLowerCase().includes(search.toLowerCase())),
    [resources, search],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ResourceCatalogItemDTO[]>();
    filtered.forEach((r) => {
      const list = map.get(r.category) || [];
      list.push(r);
      map.set(r.category, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await featureEngineApi.deleteResource(deleteTarget.key);
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
        title="Resource Limit Management"
        description="Every resource GymFlow can meter and cap. Add a resource once here, then set its value, unlimited or disabled state per plan."
        actions={
          canWrite && (
            <button
              onClick={() => setFormTarget(null)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors"
            >
              <Plus size={14} />
              Add Resource
            </button>
          )
        }
      />
      <FeatureEngineTabs />

      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search resources..." className={`${inputClass} pl-9`} />
      </div>

      {errorMsg && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{errorMsg}</div>}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <PlatformEmptyState icon={Gauge} title="No resources found" description={search ? 'Try a different search term.' : 'Add the first resource to the catalog.'} />
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, list]) => (
            <div key={category}>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2">{category}</h3>
              <div className="space-y-2">
                {list.map((resource) => (
                  <div key={resource.key} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-100">{resource.label}</span>
                          <span className="text-[10px] text-slate-600 font-mono">{resource.key}</span>
                          {resource.unit && <span className="text-[10px] text-slate-500">({resource.unit})</span>}
                        </div>
                        {resource.description && <p className="text-[11px] text-slate-500 mt-1 max-w-xl">{resource.description}</p>}
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {resource.limitSummary.limited > 0 && <LimitTypeBadge limitType="LIMITED" limitValue={undefined} />}
                          {resource.limitSummary.unlimited > 0 && <LimitTypeBadge limitType="UNLIMITED" />}
                          {resource.limitSummary.disabled > 0 && <LimitTypeBadge limitType="DISABLED" />}
                          {Object.values(resource.limitSummary).every((v) => v === 0) && <span className="text-[10px] text-slate-600 italic">Not assigned to any active plan</span>}
                        </div>
                      </div>
                      {canWrite && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => setFormTarget(resource)} title="Edit" className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeleteTarget(resource)} title="Delete" className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors">
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
        <ResourceFormModal resource={formTarget} onClose={() => setFormTarget(undefined)} onSaved={() => { setFormTarget(undefined); load(); }} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
          <div className="fixed inset-0" onClick={() => setDeleteTarget(null)} />
          <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
            <h3 className="text-base font-extrabold text-white mb-2">Remove Resource</h3>
            <p className="text-xs text-slate-400 mb-5">
              Remove <b className="text-slate-200">{deleteTarget.label}</b> from the catalog? This only works if no active plan currently limits it.
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
