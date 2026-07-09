'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, X, Loader2, Search } from 'lucide-react';
import { platformRolesApi, platformPermissionsApi, platformRoleTemplatesApi, platformUsersApi, handleApiError } from '@/lib/api';
import type { RoleListItemDTO, RoleDetailDTO, PermissionTreeCategoryDTO, RoleTemplateDTO, PermissionGrantInput } from '@/types/roles';
import type { PlatformUserRowDTO } from '@/types/platformUsers';
import { SensitiveBadge } from './RoleBadges';

const STEPS = ['Basic Information', 'Permission Categories', 'Permission Matrix', 'Assign Users', 'Review'];
const COLOR_SWATCHES: Record<string, string> = {
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  amber: 'bg-amber-500',
  teal: 'bg-teal-500',
  cyan: 'bg-cyan-500',
  slate: 'bg-slate-500',
};
const COLOR_OPTIONS = Object.keys(COLOR_SWATCHES);

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';
const selectClass = inputClass + ' cursor-pointer';

interface Props {
  duplicateFrom?: RoleListItemDTO | null;
  onClose: () => void;
  onCreated: (role: RoleDetailDTO) => void;
}

export default function RoleCreationWizard({ duplicateFrom, onClose, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(duplicateFrom ? `${duplicateFrom.name} Copy` : '');
  const [description, setDescription] = useState(duplicateFrom?.description || '');
  const [colorTag, setColorTag] = useState('indigo');
  const [fromTemplateId, setFromTemplateId] = useState('');

  const [tree, setTree] = useState<PermissionTreeCategoryDTO[]>([]);
  const [templates, setTemplates] = useState<RoleTemplateDTO[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [grants, setGrants] = useState<Map<string, 'ALLOW' | 'DENY'>>(new Map());

  const [users, setUsers] = useState<PlatformUserRowDTO[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [assignUserIds, setAssignUserIds] = useState<Set<string>>(new Set());

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    platformPermissionsApi.tree().then((t) => {
      setTree(t);
      setSelectedCategories(new Set(t.map((c) => c.key)));
    });
    platformRoleTemplatesApi.list().then(setTemplates).catch(() => setTemplates([]));
    platformUsersApi.list({ limit: 100 }).then((res) => setUsers(res.data)).catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    if (!duplicateFrom) return;
    platformRolesApi.getDetails(duplicateFrom.id).then((detail) => {
      const map = new Map<string, 'ALLOW' | 'DENY'>();
      detail.permissions.forEach((p) => map.set(p.key, p.effect));
      setGrants(map);
    });
  }, [duplicateFrom]);

  const applyTemplate = (templateId: string) => {
    setFromTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setGrants((prev) => {
      const next = new Map(prev);
      template.permissionKeys.forEach((k) => next.set(k, 'ALLOW'));
      return next;
    });
    if (template.category) setDescription((d) => d || template.description || '');
  };

  const toggleCategory = (key: string) =>
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const cycleGrant = (key: string) =>
    setGrants((prev) => {
      const next = new Map(prev);
      const current = next.get(key);
      if (current === undefined) next.set(key, 'ALLOW');
      else if (current === 'ALLOW') next.set(key, 'DENY');
      else next.delete(key);
      return next;
    });

  const toggleUser = (id: string) =>
    setAssignUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const filteredUsers = useMemo(
    () => users.filter((u) => u.fullName.toLowerCase().includes(userSearch.toLowerCase()) || (u.email || '').toLowerCase().includes(userSearch.toLowerCase())),
    [users, userSearch],
  );

  const visibleTree = tree.filter((c) => selectedCategories.has(c.key));
  const grantCount = Array.from(grants.values()).filter((v) => v === 'ALLOW').length;
  const denyCount = Array.from(grants.values()).filter((v) => v === 'DENY').length;

  const canProceedStep0 = name.trim().length > 0;
  const canProceedStep1 = selectedCategories.size > 0;

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const permissions: PermissionGrantInput[] = Array.from(grants.entries()).map(([permissionKey, effect]) => ({ permissionKey, effect }));
      const role = await platformRolesApi.create({
        name,
        description: description || undefined,
        colorTag,
        categoryKeys: Array.from(selectedCategories),
        permissions,
        assignUserIds: Array.from(assignUserIds),
        fromTemplateId: fromTemplateId || undefined,
      });
      onCreated(role);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-2xl bg-[#0b101d] border border-slate-800/80 rounded-3xl shadow-2xl relative z-10 max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-850 shrink-0">
          <h3 className="text-base font-extrabold text-white">{duplicateFrom ? `Duplicate "${duplicateFrom.name}"` : 'Create Role'}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>

        <div className="flex items-center gap-1 px-5 py-3 border-b border-slate-900/60 shrink-0 overflow-x-auto scrollbar-hide">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold ${i === step ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : i < step ? 'text-emerald-400' : 'text-slate-600'}`}>
                {i < step ? <Check size={11} /> : <span className="w-3.5 text-center">{i + 1}</span>}
                {s}
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={12} className="text-slate-700" />}
            </div>
          ))}
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {step === 0 && (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Role Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Support Manager" className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What is this role for?" className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Color Tag</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColorTag(c)}
                      className={`w-7 h-7 rounded-lg border-2 transition-all ${COLOR_SWATCHES[c]} ${colorTag === c ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      title={c}
                    />
                  ))}
                </div>
              </div>
              {templates.length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Start From Template (optional)</label>
                  <select value={fromTemplateId} onChange={(e) => applyTemplate(e.target.value)} className={selectClass}>
                    <option value="">None - build from scratch</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-xs text-slate-400 mb-3">Choose which permission categories are relevant to this role. You&apos;ll set exact Allow/Deny permissions for these in the next step.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tree.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => toggleCategory(c.key)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${selectedCategories.has(c.key) ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-900/40 border-slate-850 hover:border-slate-700'}`}
                  >
                    <span className="text-xs font-semibold text-slate-200">{c.label}</span>
                    {selectedCategories.has(c.key) && <Check size={13} className="text-indigo-300 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">Click a permission to cycle through <b className="text-emerald-400">Allow</b> → <b className="text-rose-400">Deny</b> → unset.</p>
              {visibleTree.map((cat) => (
                <div key={cat.key}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{cat.label}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {cat.permissions.map((p) => {
                      const state = grants.get(p.key);
                      return (
                        <button
                          key={p.key}
                          onClick={() => cycleGrant(p.key)}
                          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left transition-colors ${
                            state === 'ALLOW' ? 'bg-emerald-500/10 border-emerald-500/30' : state === 'DENY' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-900/40 border-slate-850 hover:border-slate-700'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs text-slate-200 truncate">{p.label}</span>
                            {p.isSensitive && <SensitiveBadge />}
                          </span>
                          <span className={`text-[10px] font-bold shrink-0 ${state === 'ALLOW' ? 'text-emerald-400' : state === 'DENY' ? 'text-rose-400' : 'text-slate-600'}`}>
                            {state === 'ALLOW' ? 'Allow' : state === 'DENY' ? 'Deny' : 'Unset'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search platform users..." className={`${inputClass} pl-9`} />
              </div>
              <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => toggleUser(u.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${assignUserIds.has(u.id) ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-900/40 border-slate-850 hover:border-slate-700'}`}
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-200 block truncate">{u.fullName}</span>
                      <span className="text-[10px] text-slate-500 block truncate">{u.email || u.phone}</span>
                    </div>
                    {assignUserIds.has(u.id) && <Check size={14} className="text-indigo-300 shrink-0" />}
                  </button>
                ))}
                {filteredUsers.length === 0 && <p className="text-xs text-slate-500 text-center py-6">No matching users.</p>}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-2">
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-850 space-y-2">
                <div className="flex justify-between text-xs"><span className="text-slate-500">Name</span><span className="font-bold text-slate-200">{name}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">Description</span><span className="font-bold text-slate-200 text-right max-w-[60%]">{description || '—'}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">Categories</span><span className="font-bold text-slate-200">{selectedCategories.size}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">Permissions Allowed</span><span className="font-bold text-emerald-400">{grantCount}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">Permissions Denied</span><span className="font-bold text-rose-400">{denyCount}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">Users to Assign</span><span className="font-bold text-slate-200">{assignUserIds.size}</span></div>
              </div>
              <p className="text-[11px] text-slate-500">You can adjust permissions, groups and assignments later from this role&apos;s detail page.</p>
            </div>
          )}

          {error && <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{error}</div>}
        </div>

        <div className="flex items-center justify-between p-5 border-t border-slate-850 shrink-0">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors">
            <ChevronLeft size={13} /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              disabled={(step === 0 && !canProceedStep0) || (step === 1 && !canProceedStep1)}
              className="flex items-center gap-1 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
            >
              Next <ChevronRight size={13} />
            </button>
          ) : (
            <button onClick={submit} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {busy ? 'Creating...' : 'Create Role'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
