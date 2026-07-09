'use client';

import { useEffect, useRef, useState } from 'react';
import { Users, Search, X } from 'lucide-react';
import { platformOrganizationsApi, platformNotificationsApi } from '@/lib/api';
import { AUDIENCE_TYPES } from '@/types/notifications';
import type { AudienceFilter } from '@/types/notifications';

const NEEDS_ORG_SCOPE = ['SELECTED_ORGANIZATIONS'];
const CAN_OPTIONALLY_SCOPE = ['OWNERS', 'EMPLOYEES', 'MEMBERS'];

export default function AudienceSelector({
  audienceType,
  audienceFilter,
  onChange,
}: {
  audienceType: string;
  audienceFilter: AudienceFilter;
  onChange: (audienceType: string, audienceFilter: AudienceFilter) => void;
}) {
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [orgQuery, setOrgQuery] = useState('');
  const [orgResults, setOrgResults] = useState<{ id: string; name: string }[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [resolving, setResolving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedIds = audienceFilter.organizationIds || [];
  const showOrgPicker = NEEDS_ORG_SCOPE.includes(audienceType) || CAN_OPTIONALLY_SCOPE.includes(audienceType);

  useEffect(() => {
    if (selectedIds.length === 0) { setOrgs([]); return; }
    platformOrganizationsApi
      .list({ limit: 100 })
      .then((res) => setOrgs(res.data.filter((o) => selectedIds.includes(o.id)).map((o) => ({ id: o.id, name: o.name }))))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchOrgs = (q: string) => {
    setOrgQuery(q);
    if (q.length < 2) { setOrgResults([]); return; }
    platformOrganizationsApi.list({ search: q, limit: 10 }).then((res) => setOrgResults(res.data.map((o) => ({ id: o.id, name: o.name })))).catch(() => setOrgResults([]));
  };

  const addOrg = (org: { id: string; name: string }) => {
    if (selectedIds.includes(org.id)) return;
    setOrgs((o) => [...o, org]);
    onChange(audienceType, { organizationIds: [...selectedIds, org.id] });
    setOrgQuery('');
    setOrgResults([]);
  };

  const removeOrg = (id: string) => {
    onChange(audienceType, { organizationIds: selectedIds.filter((i) => i !== id) });
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setResolving(true);
    debounceRef.current = setTimeout(() => {
      platformNotificationsApi
        .resolveAudience(audienceType, showOrgPicker ? { organizationIds: selectedIds } : undefined)
        .then((res) => setCount(res.count))
        .catch(() => setCount(null))
        .finally(() => setResolving(false));
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audienceType, JSON.stringify(selectedIds)]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Target Audience</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {AUDIENCE_TYPES.map((a) => (
            <button
              key={a.value}
              onClick={() => onChange(a.value, a.value === audienceType ? audienceFilter : {})}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold border text-left transition-colors ${
                audienceType === a.value ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-slate-900/40 border-slate-850 text-slate-400 hover:border-slate-700'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {showOrgPicker && (
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            {NEEDS_ORG_SCOPE.includes(audienceType) ? 'Select Organizations' : 'Optionally Scope to Organizations'}
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {orgs.filter((o) => selectedIds.includes(o.id)).map((o) => (
              <span key={o.id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300">
                {o.name}
                <button onClick={() => removeOrg(o.id)} className="text-slate-600 hover:text-rose-400"><X size={11} /></button>
              </span>
            ))}
            {selectedIds.length === 0 && <span className="text-[11px] text-slate-700">{NEEDS_ORG_SCOPE.includes(audienceType) ? 'No organizations selected.' : 'None selected - applies to all organizations.'}</span>}
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input value={orgQuery} onChange={(e) => searchOrgs(e.target.value)} placeholder="Search organizations..." className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none" />
            {orgResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 rounded-xl bg-[#0b101d] border border-slate-800 shadow-2xl z-30 max-h-48 overflow-y-auto scrollbar-thin">
                {orgResults.map((o) => (
                  <button key={o.id} onClick={() => addOrg(o)} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-900 transition-colors">{o.name}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/15">
        <Users size={14} className="text-indigo-400" />
        <span className="text-xs text-slate-300">
          {resolving ? 'Resolving audience...' : count !== null ? <><span className="font-bold text-indigo-300">{count.toLocaleString()}</span> recipient(s) match this audience.</> : 'Unable to resolve audience.'}
        </span>
      </div>
    </div>
  );
}
