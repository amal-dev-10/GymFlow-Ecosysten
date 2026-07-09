'use client';

import { useEffect, useMemo, useState } from 'react';
import { KeySquare, Plus, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { featureEngineApi, handleApiError } from '@/lib/api';
import type { OrganizationDetailDTO } from '@/types/featureEngine';
import { SectionCard, TabLoading, EmptyRow } from '../shared';
import FeatureStateBadge from '@/components/feature-engine/FeatureStateBadge';
import { OverrideTypeBadge } from '@/components/feature-engine/OverrideBadges';

export default function FeatureAccessTab({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<OrganizationDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    featureEngineApi.getOrganizationDetail(orgId).then(setDetail).catch(() => setDetail(null)).finally(() => setLoading(false));
  }, [orgId]);

  const grouped = useMemo(() => {
    if (!detail) return [];
    const map = new Map<string, typeof detail.featureAccess>();
    detail.featureAccess.forEach((f) => {
      const list = map.get(f.category) || [];
      list.push(f);
      map.set(f.category, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [detail]);

  if (loading) return <TabLoading />;
  if (!detail) return <SectionCard><EmptyRow text="No feature data available." /></SectionCard>;

  const enabled = detail.featureAccess.filter((f) => ['ENABLED', 'BETA', 'ENTERPRISE_ONLY'].includes(f.state)).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <SectionCard
          title={`Feature Access · ${enabled}/${detail.featureAccess.length} enabled`}
          action={
            <button onClick={() => router.push(`/commercial/feature-engine/organizations/${orgId}`)} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              Open in Engine <ExternalLink size={11} />
            </button>
          }
        >
          <div className="space-y-4">
            {grouped.map(([category, features]) => (
              <div key={category}>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">{category}</h4>
                <div className="space-y-1">
                  {features.map((f) => (
                    <div key={f.featureKey} className="flex items-center justify-between py-1.5">
                      <span className="text-xs font-semibold text-slate-300">
                        {f.label}
                        {f.overridden && <span className="text-[9px] text-indigo-400 ml-1.5">(override)</span>}
                      </span>
                      <FeatureStateBadge state={f.state} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="space-y-4">
        <SectionCard
          title="Overrides & Temporary Unlocks"
          action={
            <button onClick={() => router.push(`/commercial/feature-engine/overrides?organizationId=${orgId}`)} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              <Plus size={11} /> Add
            </button>
          }
        >
          {detail.overrides.length === 0 ? (
            <div className="text-center py-4">
              <KeySquare size={18} className="text-slate-700 mx-auto mb-2" />
              <p className="text-[11px] text-slate-500">No active overrides.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {detail.overrides.map((o) => (
                <div key={o.id} className="p-3 rounded-xl bg-slate-900/40 border border-slate-850">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <OverrideTypeBadge type={o.overrideType} />
                    <span className="text-xs font-bold text-slate-200">{o.feature?.label || o.resource?.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">{o.reason}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
