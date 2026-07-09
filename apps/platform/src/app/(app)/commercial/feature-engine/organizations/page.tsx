'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building2, AlertTriangle, ChevronRight } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import FeatureEngineTabs from '@/components/feature-engine/FeatureEngineTabs';
import { featureEngineApi, handleApiError } from '@/lib/api';
import type { OrganizationUsageSummaryDTO } from '@/types/featureEngine';

const inputClass =
  'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors';

export default function FeatureEngineOrganizationsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<OrganizationUsageSummaryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    featureEngineApi
      .listOrganizationsUsage({ search: search || undefined })
      .then(setOrgs)
      .catch((err) => setErrorMsg(handleApiError(err)))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Organization Usage"
        description="Real-time plan, workspace experience and resource usage for every organization on GymFlow."
      />
      <FeatureEngineTabs />

      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search organizations..." className={inputClass} />
      </div>

      {errorMsg && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{errorMsg}</div>}

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : orgs.length === 0 ? (
        <PlatformEmptyState icon={Building2} title="No organizations with an active subscription" description={search ? 'Try a different search term.' : 'Organizations appear here once they have an active subscription.'} />
      ) : (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Subscription Status</th>
                <th className="px-4 py-3">Experience Override</th>
                <th className="px-4 py-3">Warnings</th>
                <th className="px-4 py-3">Violations</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr
                  key={org.subscriptionId}
                  onClick={() => router.push(`/commercial/feature-engine/organizations/${org.organization.id}`)}
                  className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold text-slate-100">{org.organization.name}</span>
                    <span className="block text-[10px] text-slate-600">{org.organization.slug}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-300">{org.plan.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{org.status}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{org.workspaceExperienceOverride || '—'}</td>
                  <td className="px-4 py-3">
                    {org.warningCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border text-amber-300 bg-amber-500/10 border-amber-500/20">
                        {org.warningCount}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {org.violationCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border text-rose-300 bg-rose-500/10 border-rose-500/20">
                        <AlertTriangle size={10} />
                        {org.violationCount}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight size={14} className="text-slate-700" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
