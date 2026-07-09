'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import FeatureEngineTabs from '@/components/feature-engine/FeatureEngineTabs';
import { featureEngineApi, handleApiError } from '@/lib/api';
import type { ViolationDTO } from '@/types/featureEngine';

const selectClass =
  'bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none transition-colors cursor-pointer';

export default function ViolationsPage() {
  const router = useRouter();
  const [violations, setViolations] = useState<ViolationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [severity, setSeverity] = useState<'' | 'warning' | 'exceeded'>('exceeded');

  useEffect(() => {
    setLoading(true);
    featureEngineApi
      .listViolations({ severity: severity || undefined })
      .then(setViolations)
      .catch((err) => setErrorMsg(handleApiError(err)))
      .finally(() => setLoading(false));
  }, [severity]);

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Violation Center"
        description="Every organization currently over a resource's hard limit or approaching its warning threshold, computed live from real usage."
      />
      <FeatureEngineTabs />

      <select className={selectClass} value={severity} onChange={(e) => setSeverity(e.target.value as any)}>
        <option value="exceeded">Exceeded Only</option>
        <option value="warning">Warnings Only</option>
        <option value="">All</option>
      </select>

      {errorMsg && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{errorMsg}</div>}

      {loading ? (
        <div className="h-64 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />
      ) : violations.length === 0 ? (
        <PlatformEmptyState icon={ShieldAlert} title="No violations right now" description="Every organization is currently within its plan's resource limits." />
      ) : (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Rule</th>
                <th className="px-4 py-3">Current Usage</th>
                <th className="px-4 py-3">Exceeded By</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((v, i) => (
                <tr
                  key={i}
                  onClick={() => router.push(`/commercial/feature-engine/organizations/${v.organizationId}`)}
                  className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-xs font-bold text-slate-100">{v.organizationName}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle size={12} className={v.severity === 'exceeded' ? 'text-rose-400' : 'text-amber-400'} />
                      <span className="text-xs font-semibold text-slate-300">{v.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">{v.used} / {v.limitValue}</td>
                  <td className="px-4 py-3 text-xs font-bold">
                    {v.severity === 'exceeded' ? <span className="text-rose-400">+{v.exceededBy}</span> : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{v.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
